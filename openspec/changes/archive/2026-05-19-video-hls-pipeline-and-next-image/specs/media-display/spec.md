## MODIFIED Requirements

### Requirement: 影片播放元件

系統 SHALL 提供影片播放元件，以 16:9 固定比例容器顯示單部影片，支援 HLS 串流格式。

#### Scenario: HLS 影片在 Chrome/Firefox 播放

- **WHEN** 頁面的 `mediaBlock.type === 'video'` 且 `mediaUrls[0]` 為 `.m3u8` URL，瀏覽器為 Chrome 或 Firefox
- **THEN** 元件使用 hls.js 將 HLS stream 注入 `<video>` 標籤，提供播放/暫停、進度條、音量控制

#### Scenario: HLS 影片在 Safari 原生播放

- **WHEN** 頁面的 `mediaBlock.type === 'video'` 且 `mediaUrls[0]` 為 `.m3u8` URL，瀏覽器為 Safari
- **THEN** 元件直接設 `<video src=".m3u8">`，利用 Safari 原生 HLS 支援播放

#### Scenario: 16:9 容器固定比例

- **WHEN** 影片播放元件渲染
- **THEN** 容器維持 16:9 寬高比，影片使用 `object-fit: contain`

#### Scenario: 影片自動暫停（非視野中）

- **WHEN** 讀者捲動使影片離開視野
- **THEN** 影片自動暫停，進入視野時不自動播放（由用戶控制）

#### Scenario: 轉檔中顯示等待 UI

- **WHEN** `page.transcodingStatus === 'pending'` 或 `'processing'`
- **THEN** 顯示「轉檔中…」spinner 取代影片播放器，前端每 3 秒輪詢 page 狀態

#### Scenario: 轉檔完成後自動切換播放器

- **WHEN** 輪詢發現 `page.transcodingStatus === 'ready'` 且 `mediaUrls[0]` 有效
- **THEN** spinner 消失，HLS 播放器出現並可播放

#### Scenario: 轉檔失敗顯示錯誤訊息

- **WHEN** `page.transcodingStatus === 'error'`
- **THEN** 顯示「影片轉檔失敗，請重新上傳」訊息
