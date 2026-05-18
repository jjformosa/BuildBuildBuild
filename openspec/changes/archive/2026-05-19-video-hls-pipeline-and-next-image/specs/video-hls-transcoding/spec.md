## ADDED Requirements

### Requirement: 影片上傳觸發 HLS 轉檔

系統 SHALL 在影片上傳至 S3 後，自動觸發 AWS MediaConvert 將原始影片轉為 HLS 格式（H.264 + AAC, 720p）。

#### Scenario: 影片上傳成功觸發轉檔

- **WHEN** 使用者上傳影片成功，原始檔存入 `books/{bookId}/pages/{pageId}/video-raw.{ext}`
- **THEN** S3 Event Notification 觸發 Lambda trigger，建立 MediaConvert job，HLS 輸出至 `books/{bookId}/pages/{pageId}/hls/`

#### Scenario: Apple HEVC（iPhone MOV）可正常轉檔

- **WHEN** 使用者上傳 iPhone 拍攝的 HEVC .mov 檔
- **THEN** MediaConvert 自動偵測 HEVC 輸入並轉為 H.264 + HLS，輸出結果可在 Chrome/Firefox/Safari 播放

#### Scenario: 已有 HLS 輸出時不重複建立 job

- **WHEN** S3 Event Notification 重複觸發（at-least-once delivery）
- **THEN** Lambda trigger 先確認 `hls/index.m3u8` 是否已存在，若存在則跳過建立 MediaConvert job

### Requirement: 轉檔狀態追蹤

系統 SHALL 在 Page model 追蹤影片轉檔狀態，前端可輪詢取得最新狀態。

#### Scenario: 上傳後狀態設為 pending

- **WHEN** 使用者呼叫 `/api/upload/presign` 取得影片 presigned URL
- **THEN** Server 將該 page 的 `transcodingStatus` 設為 `'pending'`

#### Scenario: 轉檔完成後狀態更新

- **WHEN** MediaConvert job 完成，Lambda callback POST 到 `/api/webhooks/mediaconvert`
- **THEN** Server 驗證 secret，更新 `page.mediaUrls = [hlsUrl]`、`page.transcodingStatus = 'ready'`

#### Scenario: 轉檔失敗狀態記錄

- **WHEN** MediaConvert job 失敗，Lambda callback 帶 `status: 'error'` 呼叫 webhook
- **THEN** Server 更新 `page.transcodingStatus = 'error'`，前端顯示錯誤訊息

### Requirement: MediaConvert Webhook 驗證

系統 SHALL 驗證來自 Lambda callback 的 webhook 請求，拒絕未授權呼叫。

#### Scenario: 合法 webhook 請求被接受

- **WHEN** Lambda callback POST `/api/webhooks/mediaconvert` 帶 `Authorization: Bearer {MEDIACONVERT_WEBHOOK_SECRET}`
- **THEN** Server 接受請求並更新 page 狀態

#### Scenario: 未授權 webhook 請求被拒絕

- **WHEN** 請求缺少或帶錯誤 secret
- **THEN** Server 回傳 401，不更新任何資料
