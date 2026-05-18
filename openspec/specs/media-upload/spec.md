## ADDED Requirements

### Requirement: S3 Presigned URL 簽發

系統 SHALL 透過 Server 端 API 簽發 S3 Presigned PUT URL，AWS 憑證 MUST NOT 出現在 client bundle。

#### Scenario: Admin 請求 Presigned URL

- **WHEN** Admin（已驗證身份）向 `POST /api/upload/presign` 提交 `{ bookId, pageId, fileType, contentType }`
- **THEN** Server 驗證 admin 身份與 bookId 擁有權後，回傳 `{ presignedUrl, s3Key }`，URL 有效期 15 分鐘

#### Scenario: 未授權請求被拒絕

- **WHEN** 未登入或 `role: 'reader'` 的使用者呼叫 `/api/upload/presign`
- **THEN** Server 回傳 401/403，不簽發 URL

#### Scenario: 非擁有者請求被拒絕

- **WHEN** Admin A 請求 Admin B 的 bookId presign URL
- **THEN** Server 驗證 `book.createdBy !== currentUserId`，回傳 403

### Requirement: Client 直接上傳至 S3

系統 SHALL 讓 client 使用 Presigned URL 直接 PUT 到 S3，不佔用 Server 頻寬。

#### Scenario: 圖片上傳成功

- **WHEN** Client 使用 Presigned URL 進行 HTTP PUT（Content-Type: image/*）
- **THEN** S3 回傳 200，Client 通知 Server 儲存 S3 URL

#### Scenario: 影片上傳成功

- **WHEN** Client 使用 Presigned URL 進行 HTTP PUT（Content-Type: video/mp4）
- **THEN** S3 回傳 200，Client 通知 Server 儲存 S3 URL

#### Scenario: Presigned URL 過期後上傳失敗

- **WHEN** Client 在 URL 過期（15 分鐘）後嘗試上傳
- **THEN** S3 回傳 403，Client 顯示錯誤訊息「上傳連結已過期，請重試」

### Requirement: S3 路徑結構

系統 SHALL 依照規定的路徑結構存放所有媒體檔案。

#### Scenario: 封面圖路徑

- **WHEN** Admin 上傳 book 封面圖
- **THEN** 檔案儲存至 `books/{bookId}/cover.{ext}`

#### Scenario: Carousel 圖片路徑

- **WHEN** Admin 上傳 carousel 圖片
- **THEN** 檔案儲存至 `books/{bookId}/pages/{pageId}/carousel/image-{n}.{ext}`，`n` 為序號

#### Scenario: 影片原始檔路徑

- **WHEN** Admin 上傳頁面影片（任何格式，包含 iPhone MOV/HEVC）
- **THEN** 原始檔儲存至 `books/{bookId}/pages/{pageId}/video-raw.{ext}`（非 `video.{ext}`）

#### Scenario: HLS 輸出路徑

- **WHEN** MediaConvert 完成轉檔
- **THEN** HLS manifest 儲存至 `books/{bookId}/pages/{pageId}/hls/video-raw.m3u8`，segments 存於同目錄

### Requirement: 上傳完成後儲存 URL

系統 SHALL 在 S3 上傳完成後，正確更新 page 狀態。

#### Scenario: 圖片上傳完成儲存 URL

- **WHEN** Client Carousel/封面圖 S3 PUT 成功，呼叫 API 更新 page
- **THEN** MongoDB `pages.mediaUrls` 加入新 S3 URL，或 `books.coverImage` 更新

#### Scenario: 影片上傳完成設定 pending 狀態

- **WHEN** Client 影片 S3 PUT 成功
- **THEN** Server 將 `page.transcodingStatus` 設為 `'pending'`；`page.mediaUrls` 暫不更新，等待 MediaConvert 完成

#### Scenario: 上傳失敗不更新資料庫

- **WHEN** S3 PUT 失敗（網路錯誤、403 等）
- **THEN** Client 不呼叫 Server 更新，顯示錯誤提示，S3 key 不寫入資料庫

### Requirement: 上傳進度顯示

系統 SHALL 在上傳期間顯示進度，提供良好使用體驗。

#### Scenario: 顯示上傳進度條

- **WHEN** Client 開始 S3 PUT 請求
- **THEN** UI 顯示進度條（使用 XMLHttpRequest progress event）

#### Scenario: 上傳完成後更新 UI

- **WHEN** 上傳成功且 URL 儲存完成
- **THEN** 進度條消失，媒體預覽立即顯示上傳的圖片/影片
