## 1. AWS 設定（手動，需 AWS Console）

- [x] 1.1 從 AWS Console 取得帳號的 MediaConvert endpoint URL（MediaConvert → Account → Endpoint），記下備用
- [x] 1.2 建立 IAM Role for MediaConvert：允許 S3 GetObject（input bucket）+ S3 PutObject（output bucket）
- [x] 1.3 建立 IAM Role for Lambda：允許 S3 GetObject/HeadObject + MediaConvert CreateJob + CloudWatch Logs
- [x] 1.4 設定 S3 Event Notification：prefix `books/`、suffix `video-raw.*`、事件類型 `PUT`，目標為 Lambda A（trigger）
- [x] 1.5 建立 EventBridge Rule：source `aws.mediaconvert`、detail-type `MediaConvert Job State Change`、status `COMPLETE`，目標為 Lambda B（callback）

## 2. Lambda A：修改 convert.mjs 為 mediaconvert-trigger

- [x] 2.1 將 `convert.mjs` 複製至 `infrastructure/lambda/mediaconvert-trigger/index.mjs`
- [x] 2.2 修改觸發方式：從 S3 event record 解析 bucket/key（`event.Records[0].s3`），移除原本的 `event.bucket/key` 參數
- [x] 2.3 修改 output path 計算邏輯：`key.replace(/\/video-raw\.[^.]+$/, '')` 取得 folder，輸出至 `{folder}/hls/`
- [x] 2.4 從 key 解析 bookId/pageId 並加入 `UserMetadata: { bookId, pageId }`
- [x] 2.5 加入重複觸發防護：建立 job 前先 HeadObject 確認 `{folder}/hls/index.m3u8` 是否存在
- [x] 2.6 將 `MEDIACONVERT_ENDPOINT`、`ROLE_ARN` 改為讀取 env var（`process.env.MEDIACONVERT_ENDPOINT`、`process.env.MEDIACONVERT_ROLE_ARN`）
- [x] 2.7 固定單一解析度 720p（移除 resolutions 參數），並確認 `ContainerSettings` 使用 M3U8
- [x] 2.8 部署至 AWS Lambda，設定 env vars：`MEDIACONVERT_ENDPOINT`、`MEDIACONVERT_ROLE_ARN`、`S3_BUCKET_NAME`、`AWS_REGION`

## 3. Lambda B：建立 mediaconvert-callback

- [x] 3.1 建立 `infrastructure/lambda/mediaconvert-callback/index.mjs`
- [x] 3.2 從 EventBridge event 讀取 `detail.userMetadata.bookId`、`detail.userMetadata.pageId`
- [x] 3.3 判斷 job 狀態：COMPLETE → `status: 'ready'`；ERROR → `status: 'error'`
- [x] 3.4 組出 HLS URL：`{CLOUDFRONT_URL}/books/{bookId}/pages/{pageId}/hls/index.m3u8`
- [x] 3.5 POST 到 `{NEXT_PUBLIC_APP_URL}/api/webhooks/mediaconvert`，帶 `Authorization: Bearer {MEDIACONVERT_WEBHOOK_SECRET}`
- [x] 3.6 部署至 AWS Lambda，設定 env vars：`CLOUDFRONT_URL`、`NEXT_PUBLIC_APP_URL`、`MEDIACONVERT_WEBHOOK_SECRET`

## 4. Next.js：Page Model 與 Webhook

- [x] 4.1 `lib/models/page.ts`：新增 `transcodingStatus: { type: String, enum: ['pending','processing','ready','error'], default: undefined }`
- [x] 4.2 建立 `app/api/webhooks/mediaconvert/route.ts`：驗證 Bearer token、更新 page.mediaUrls 與 transcodingStatus

## 5. Next.js：Presign API 調整

- [x] 5.1 `app/api/upload/presign/route.ts`：影片 S3 key 從 `video.{ext}` 改為 `video-raw.{ext}`
- [x] 5.2 同步新增支援的影片 MIME：`video/x-m4v`
- [x] 5.3 影片 presign 後，同步將 page.transcodingStatus 設為 `'pending'`（PATCH page 或直接 DB update）

## 6. Next.js：前端元件

- [x] 6.1 安裝 `hls.js`（`npm install hls.js`）
- [x] 6.2 `components/video-player.tsx`：加入 hls.js 播放邏輯（Hls.isSupported → hls.js；else → Safari 原生 src）
- [x] 6.3 `components/video-player.tsx`：加入 `transcodingStatus` prop，pending/processing 顯示 spinner，error 顯示錯誤訊息
- [x] 6.4 `components/media-uploader.tsx`：影片上傳成功後改為 PATCH page `{ transcodingStatus: 'pending' }`，啟動輪詢（每 3 秒 GET page，最多 10 分鐘）
- [x] 6.5 `components/media-uploader.tsx`：輪詢到 `transcodingStatus === 'ready'` 後停止輪詢，通知父元件更新 VideoPlayer

## 7. next/image 遷移

- [x] 7.1 `next.config.ts`：加入 `images.remotePatterns`，動態讀取 `CLOUDFRONT_URL`、`S3_BUCKET_NAME`、`AWS_REGION`
- [x] 7.2 `components/dashboard-books-client.tsx`：`<img>` → `<Image>`，設定適當 `sizes` 與 `width/height`
- [x] 7.3 `components/cover-image-button.tsx`：`<img>` → `<Image>`（兩處）
- [x] 7.4 `components/carousel.tsx`：`<img>` → `<Image>`，改用 `fill` 配合外層 relative container
- [x] 7.5 `components/media-uploader.tsx`：上傳預覽縮圖 `<img>` → `<Image>`
- [x] 7.6 移除各元件的 `// eslint-disable-next-line @next/next/no-img-element` 註解

## 8. 環境變數與驗證

- [x] 8.1 `.env.local.example` 新增：`MEDIACONVERT_WEBHOOK_SECRET`、`MEDIACONVERT_ENDPOINT`、`MEDIACONVERT_ROLE_ARN`、`NEXT_PUBLIC_APP_URL`
- [x] 8.2 本地 `.env.local` 填入實際值後，`npm run build` 確認無 TypeScript 錯誤與 no-img-element 警告
- [ ] 8.3 上傳 iPhone MOV 測試完整流程：S3 raw 出現 → Lambda log → MediaConvert job → HLS 出現 → webhook → 頁面播放
