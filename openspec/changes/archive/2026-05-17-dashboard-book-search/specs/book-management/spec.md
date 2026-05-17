## ADDED Requirements

### Requirement: Books API 支援關鍵字搜尋

系統 SHALL 在 `GET /api/books` 新增 `q` 查詢參數，對 `title` 欄位做 case-insensitive regex 搜尋，僅搜尋當前使用者建立的書（`createdBy = userId`）。

#### Scenario: 有 q 參數時回傳符合書名的書

- **WHEN** 呼叫 `GET /api/books?q=潛水`
- **THEN** 系統回傳 `title` 包含「潛水」（不分大小寫）的書，依 `_id` 降冪排列，最多 `limit` 筆

#### Scenario: q 參數與 after cursor 併用

- **WHEN** 呼叫 `GET /api/books?q=潛水&after=<cursor>`
- **THEN** 系統回傳 `title` 包含「潛水」且 `_id < cursor` 的書，實現 cursor 分頁

#### Scenario: q 為空字串時等同未傳入

- **WHEN** 呼叫 `GET /api/books?q=`（空字串）
- **THEN** 系統忽略 q 參數，行為與不傳 q 相同（回傳全部書）
