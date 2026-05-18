## Why

影片直接存原始檔（MP4/MOV）上 S3，iPhone 拍攝的 HEVC 在非 Safari 瀏覽器無法播放，且大檔案無法串流分段。圖片則因未使用 `next/image` 而缺少自動 WebP 轉換與尺寸最佳化。

## What Changes

- 影片上傳改存 `video-raw.{ext}`，S3 事件觸發 Lambda → AWS MediaConvert 轉為 HLS（H.264 + AAC, .m3u8）
- Apple HEVC（iPhone MOV）透過 MediaConvert 自動轉為 H.264，跨瀏覽器相容
- 前端 VideoPlayer 改用 hls.js，Safari 維持原生 HLS
- 上傳後顯示「轉檔中」狀態，輪詢直到轉檔完成（transcodingStatus）
- MediaConvert 完成後透過 EventBridge → Lambda callback → Next.js webhook 寫回 HLS URL
- 全站 `<img>` 替換為 `<Image>`（next/image），加入 S3/CloudFront remotePatterns

## Capabilities

### New Capabilities
- `video-hls-transcoding`: 影片上傳後非同步轉為 HLS 串流，包含轉檔狀態追蹤（pending/processing/ready/error）與 webhook callback
- `next-image-optimization`: 使用 next/image 取代 img 標籤，設定 remotePatterns 支援 S3 與 CloudFront

### Modified Capabilities
- `media-upload`: 影片上傳 key 結構從 `video.{ext}` 改為 `video-raw.{ext}`；上傳成功後不再直接存 mediaUrls，改設 transcodingStatus = pending
- `media-display`: VideoPlayer 支援 .m3u8 HLS 播放；轉檔期間顯示等待 UI

## Impact

- `lib/models/page.ts`：新增 `transcodingStatus` 欄位
- `app/api/upload/presign/route.ts`：key 改名、新增 pending 狀態寫入
- `app/api/webhooks/mediaconvert/route.ts`：新建 webhook endpoint
- `components/video-player.tsx`：整合 hls.js
- `components/media-uploader.tsx`：上傳後改為輪詢模式
- `next.config.ts`：加入 images.remotePatterns
- `components/dashboard-books-client.tsx`, `cover-image-button.tsx`, `carousel.tsx`：img → Image
- **外部 AWS**：Lambda A（trigger）、Lambda B（callback）、MediaConvert Job、EventBridge Rule、S3 Event Notification
- **新依賴**：`hls.js`
- **新 env vars**：`MEDIACONVERT_WEBHOOK_SECRET`, `MEDIACONVERT_ENDPOINT`, `MEDIACONVERT_ROLE_ARN`, `NEXT_PUBLIC_APP_URL`
