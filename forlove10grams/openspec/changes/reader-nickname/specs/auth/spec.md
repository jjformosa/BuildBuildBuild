## MODIFIED Requirements

### Requirement: Google OAuth 登入

系統 SHALL 允許使用者透過 Google 帳號登入，使用 NextAuth.js v5 Google Provider。

#### Scenario: 使用者點擊 Google 登入（已設過暱稱）

- **WHEN** `nickname` 不為 `null` 的使用者在 `/login` 點擊「以 Google 登入」
- **THEN** 系統跳轉至 Google OAuth 授權頁，授權完成後 redirect 回 `/dashboard`（admin）或 share link 目標頁（reader）

#### Scenario: 使用者點擊 Google 登入（從未設過暱稱）

- **WHEN** `nickname === null` 的使用者完成 Google OAuth 授權
- **THEN** middleware 攔截，redirect 到 `/hajimede?callbackUrl=<原始目標>`

#### Scenario: 新使用者首次登入

- **WHEN** Google 帳號從未在系統登入過
- **THEN** 系統在 MongoDB `users` collection 建立新 User 文件，`role` 預設為 `reader`，`nickname` 預設為 `null`

#### Scenario: 返回使用者再次登入

- **WHEN** 已存在的 User 透過 Google 登入
- **THEN** 系統使用現有 User 文件，不重複建立，session 正確載入 `role` 與 `nicknameIsSet`

### Requirement: LINE Login

系統 SHALL 允許使用者透過 LINE 帳號登入，使用 NextAuth.js v5 自訂 LINE Provider。

#### Scenario: LINE 登入成功（已設過暱稱）

- **WHEN** `nickname` 不為 `null` 的使用者完成 LINE 授權
- **THEN** 系統使用 LINE 帳號的 email 建立/匹配 User，redirect 至原始目標頁

#### Scenario: LINE 登入成功（從未設過暱稱）

- **WHEN** `nickname === null` 的使用者完成 LINE 授權
- **THEN** middleware 攔截，redirect 到 `/hajimede?callbackUrl=<原始目標>`

#### Scenario: 同一 email 跨 provider 登入

- **WHEN** 使用者用相同 email 的 Google 和 LINE 帳號分別登入
- **THEN** 系統透過 NextAuth MongoDB Adapter 的 `accounts` collection 分別記錄，User 以 email 為主要 key 匹配（此為 MVP 行為，完整帳號合併 UI 待後續版本）

### Requirement: 角色授權（Admin vs Reader）

系統 SHALL 依照 User 的 `role` 欄位限制功能存取。

#### Scenario: Admin 存取管理頁面

- **WHEN** `role: 'admin'` 的使用者存取 `/dashboard` 或 `/books/[bookId]/edit`
- **THEN** 頁面正常顯示

#### Scenario: Reader 嘗試存取 Admin 頁面

- **WHEN** `role: 'reader'` 的使用者存取 `/dashboard`
- **THEN** 系統回傳 403 或 redirect 至 `/`

#### Scenario: 未登入存取受保護頁面

- **WHEN** 未登入使用者存取任何需要認證的頁面
- **THEN** 系統 redirect 至 `/login`

### Requirement: Session 持久化

系統 SHALL 使用 MongoDB Adapter 將 session 持久化至資料庫，跨裝置有效。

#### Scenario: Session 跨裝置有效

- **WHEN** 使用者在裝置 A 登入後，在裝置 B 開啟相同帳號
- **THEN** 兩個裝置均顯示已登入狀態，session 資料一致

#### Scenario: Session 含自訂欄位

- **WHEN** 使用者登入後，系統建立 session
- **THEN** `session.user.role` 正確反映 MongoDB `users.role` 欄位值，`session.user.nicknameIsSet` 正確反映 `users.nickname !== null`
