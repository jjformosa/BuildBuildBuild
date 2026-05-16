## ADDED Requirements

### Requirement: 自動標記頁面已讀

系統 SHALL 使用 Intersection Observer 自動偵測讀者閱讀進度，進入視野即標記已讀。

#### Scenario: 頁面進入視野觸發已讀

- **WHEN** 頁面元素至少 50%（threshold: 0.5）進入讀者視野
- **THEN** Client 觸發一次 `POST /api/progress`，傳送 `{ bookId, pageId }`；每頁只觸發一次

#### Scenario: 重複進入視野不重複標記

- **WHEN** 讀者捲動回已讀頁面，頁面再次進入視野
- **THEN** Client 偵測本地 cache 已記錄，不重複呼叫 API

### Requirement: Server 端已讀儲存

系統 SHALL 將已讀進度持久化至 MongoDB，支援跨裝置同步。

#### Scenario: 已讀記錄儲存成功

- **WHEN** `POST /api/progress` 收到有效的 `{ bookId, pageId }`
- **THEN** 系統在 `readProgress` collection 以 `upsert` 寫入 `{ userId, bookId, pageId, readAt }`，compound unique index 保證冪等

#### Scenario: 未授權用戶無法記錄進度

- **WHEN** 未登入請求 `POST /api/progress`
- **THEN** Server 回傳 401，不寫入資料庫

#### Scenario: 無 book 存取權時無法記錄

- **WHEN** 讀者未透過有效 share token 存取 book，卻嘗試呼叫 progress API
- **THEN** Server 驗證讀者對 bookId 的存取權後回傳 403

### Requirement: 已讀進度查詢

系統 SHALL 提供 API 供前端查詢某 book 的已讀頁面清單。

#### Scenario: 查詢已讀清單

- **WHEN** 讀者進入 `/read/[bookId]`，Client 呼叫 `GET /api/progress?bookId={id}`
- **THEN** Server 回傳該 user 在此 book 的所有已讀 pageId 陣列

#### Scenario: 無已讀記錄時回傳空陣列

- **WHEN** 讀者第一次開啟 book
- **THEN** API 回傳 `{ readPageIds: [] }`

### Requirement: 樂觀更新與本地快取

系統 SHALL 在 API 呼叫完成前即時更新 TOC 的已讀狀態，避免 UI 延遲。

#### Scenario: 樂觀更新 TOC

- **WHEN** Client 觸發頁面已讀（Intersection Observer）
- **THEN** TOC 立即顯示對應頁面的已讀標記，不等待 API 回應

#### Scenario: API 失敗時回滾

- **WHEN** `POST /api/progress` 失敗（網路錯誤等）
- **THEN** 樂觀更新回滾，TOC 恢復未讀狀態，下次進入視野將重試
