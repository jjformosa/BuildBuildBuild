## MODIFIED Requirements

### Requirement: Admin Dashboard 列出 Books

系統 SHALL 在 dashboard 顯示當前 admin 建立的所有 books，支援排序與狀態篩選。

#### Scenario: 顯示 Book 列表

- **WHEN** Admin 進入 `/dashboard`
- **THEN** 系統顯示該 admin 所有 books，包含標題、封面縮圖、發布狀態、頁數

#### Scenario: 無 Book 時的空白狀態

- **WHEN** Admin 尚未建立任何 book
- **THEN** 頁面顯示空白狀態提示與「建立第一本記憶書」按鈕

#### Scenario: API 回傳封面與狀態欄位

- **WHEN** Client 呼叫 `GET /api/books`
- **THEN** 每筆記錄 SHALL 包含 `coverImage`（string | null）、`published`（boolean）

#### Scenario: API 依狀態篩選

- **WHEN** Client 呼叫 `GET /api/books?status=published`
- **THEN** 系統只回傳 `published: true` 的書本

#### Scenario: API 依狀態篩選草稿

- **WHEN** Client 呼叫 `GET /api/books?status=unpublished`
- **THEN** 系統只回傳 `published` 非 `true` 的書本

#### Scenario: API max limit 提升

- **WHEN** Client 呼叫 `GET /api/books?limit=200`
- **THEN** 系統最多回傳 200 筆（原上限為 50）
