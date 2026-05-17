## Context

目前影片以原始格式（MP4/MOV）直接存 S3，前端用原生 `<video>` 播放。iPhone 拍攝的 HEVC (.mov) 在 Chrome/Firefox 無法播放。圖片以 `<img>` 標籤直接讀 S3/CloudFront URL，未享有 Next.js 圖片最佳化（WebP 轉換、lazy loading、blur placeholder）。

已有的基礎設施：S3 bucket、CloudFront CDN（`d13l76pf5x0jgb.cloudfront.net`）、AWS SDK v3。現有 `convert.mjs` 為 Lambda handler 雛形，可改造直接使用。

## Goals / Non-Goals

**Goals:**
- iPhone HEVC 影片跨瀏覽器可播放（Chrome、Firefox、Safari）
- 影片轉 HLS 串流，支援進度條與分段載入
- 全站圖片改用 `next/image`，自動 WebP 轉換與尺寸最佳化
- 上傳後顯示轉檔狀態，轉檔完成後自動更新播放器

**Non-Goals:**
- Adaptive bitrate（多解析度 HLS）— 個人記憶書不需要
- 即時進度推播（WebSocket/SSE）— 輪詢即可
- 影片壓縮品質控制 UI — 固定 720p QVBR

## Decisions

### D1：Lambda trigger 方式 — S3 Event Notification（非 EventBridge）

影片上傳到 S3 後，用 S3 Event Notification 直接 trigger Lambda A（trigger function），而不是先過 EventBridge。原因：S3 → Lambda 是最直接的路徑，延遲最低。MediaConvert 完成事件則用 EventBridge（MediaConvert 只輸出到 EventBridge，無其他選項）。

### D2：Lambda callback 機制 — HTTPS webhook 到 Next.js API

Lambda B（callback）完成後 POST 到 `NEXT_PUBLIC_APP_URL/api/webhooks/mediaconvert`，用 `MEDIACONVERT_WEBHOOK_SECRET` 做 bearer token 驗證。不讓 Lambda 直接連 MongoDB，保持 DB 存取只在 Next.js 層。

### D3：轉檔狀態追蹤 — Page model 加 `transcodingStatus` 欄位

在 Page mongoose model 加 `transcodingStatus: 'pending' | 'processing' | 'ready' | 'error'`。前端輪詢 GET page 每 3 秒一次，最多 10 分鐘。不用 `processing` vs `pending` 分開兩種 Lambda 狀態，簡化前端邏輯。

替代方案考慮：獨立 MediaJob collection → 複雜度高，目前規模不需要。

### D4：HLS 輸出路徑規則

```
raw input:  books/{bookId}/pages/{pageId}/video-raw.{ext}
HLS output: books/{bookId}/pages/{pageId}/hls/index.m3u8
            books/{bookId}/pages/{pageId}/hls/-720p.m3u8
            books/{bookId}/pages/{pageId}/hls/-720p*.ts
```

Lambda A 從 S3 key 解析 folder，輸出 Destination = `s3://{bucket}/books/{bookId}/pages/{pageId}/hls/`。

### D5：前端 HLS 播放 — hls.js + Safari 原生 fallback

```ts
if (Hls.isSupported())         → hls.js 注入 <video>
else canPlayType('application/vnd.apple.mpegurl') → native src
else                           → 顯示「瀏覽器不支援」
```

### D6：next/image remotePatterns — build-time env var 讀取

`next.config.ts` 在 build time 讀 `CLOUDFRONT_URL` 和 `S3_BUCKET_NAME`/`AWS_REGION` 來動態組 remotePatterns。兩個 pattern 都加，讓 CloudFront 和 direct S3 URL 都能通過 next/image。

## Risks / Trade-offs

- **Lambda 冷啟動延遲** → 短片（30 秒以內）MediaConvert 約 1-2 分鐘完成，冷啟動影響可忽略
- **Webhook 打不到 Next.js** → Vercel URL 在 env var 裡，若 preview deployment URL 變動需手動更新 Lambda env；建議用 production URL
- **S3 Event Notification 重複觸發** → S3 保證 at-least-once，MediaConvert 會建立多個 job；Lambda A 應在建立 job 前先檢查是否已有 `hls/index.m3u8`
- **原始 `video-raw` 檔案存放成本** → 可事後加 S3 Lifecycle Rule 刪除，不在本次範圍

## Migration Plan

1. 先部署 Next.js 端（webhook endpoint、page model、presign key 改名）
2. 設定 AWS：MediaConvert queue、IAM roles、S3 Event Notification、EventBridge rule
3. 部署 Lambda A（trigger）+ Lambda B（callback），填入 env vars
4. 測試 iPhone MOV 上傳完整流程
5. next/image 遷移可獨立於 HLS pipeline 先行合併

Rollback：lambda function 停用 → 影片不轉檔，前端顯示「轉檔中」（但不會 ready），不影響已上傳的舊影片（raw file 仍在 S3）

## Open Questions

- MediaConvert endpoint URL 需從 AWS Console 取得後填入 env
- IAM Role ARN 需在 AWS 建立後填入
- 是否要在上傳時同時保留舊的 `video.{ext}` key 相容性？（建議不要，新 key 較清楚）
