## MODIFIED Requirements

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
- **THEN** HLS manifest 儲存至 `books/{bookId}/pages/{pageId}/hls/index.m3u8`，segments 存於同目錄

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
