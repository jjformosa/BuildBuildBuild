## ADDED Requirements

### Requirement: Admin 建立 Book

系統 SHALL 允許 admin 建立新的記憶書，包含標題、描述與封面圖。

#### Scenario: 建立新 Book 成功

- **WHEN** Admin 填寫標題（必填）並提交建立表單
- **THEN** 系統在 MongoDB `books` collection 建立文件，`createdBy` 設為當前 admin `userId`，`isPublished: false`，redirect 至 `/books/[bookId]/edit`

#### Scenario: 標題為空時建立失敗

- **WHEN** Admin 提交空白標題
- **THEN** 系統回傳驗證錯誤，不建立文件

#### Scenario: 上傳封面圖

- **WHEN** Admin 選擇封面圖並儲存
- **THEN** 系統透過 S3 Presigned URL 流程上傳圖片，`coverImageUrl` 儲存至 MongoDB

### Requirement: Admin 編輯 Book

系統 SHALL 允許 admin 更新現有 book 的標題、描述與封面圖。

#### Scenario: 更新 Book 基本資訊

- **WHEN** Admin 修改標題/描述後儲存
- **THEN** MongoDB `books` 文件更新，頁面顯示最新資料

#### Scenario: 非擁有者嘗試編輯

- **WHEN** Admin A 嘗試編輯 Admin B 建立的 book（`createdBy !== currentUserId`）
- **THEN** 系統回傳 403

### Requirement: Admin 刪除 Book

系統 SHALL 允許 admin 刪除自己建立的 book，連同所有 pages 和 readProgress。

#### Scenario: 刪除 Book

- **WHEN** Admin 確認刪除操作
- **THEN** 系統刪除 `books`、相關 `pages`、相關 `readProgress`、相關 `shares` 文件，redirect 至 `/dashboard`

### Requirement: Admin Dashboard 列出 Books

系統 SHALL 在 dashboard 顯示當前 admin 建立的所有 books。

#### Scenario: 顯示 Book 列表

- **WHEN** Admin 進入 `/dashboard`
- **THEN** 系統顯示該 admin 所有 books，包含標題、封面縮圖、發布狀態、頁數

#### Scenario: 無 Book 時的空白狀態

- **WHEN** Admin 尚未建立任何 book
- **THEN** 頁面顯示空白狀態提示與「建立第一本記憶書」按鈕

### Requirement: 發布 Book 與 Share Token

系統 SHALL 允許 admin 發布 book 並產生可分享的 share token。

#### Scenario: 發布 Book

- **WHEN** Admin 點擊「發布」
- **THEN** `books.isPublished` 設為 `true`，系統在 `shares` collection 建立新文件，包含 URL-safe 隨機 token

#### Scenario: 複製分享連結

- **WHEN** Book 已發布，admin 點擊「複製連結」
- **THEN** 系統複製 `https://{domain}/share/{token}` 至剪貼板，顯示成功提示

#### Scenario: 重新產生 Share Token

- **WHEN** Admin 點擊「重新產生連結」
- **THEN** 系統在 `shares` collection 建立新 token，舊 token 失效（不刪除，僅標記），返回新 URL
