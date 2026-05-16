## ADDED Requirements

### Requirement: User nickname 欄位

系統 SHALL 在 `users` collection 新增 `nickname: string | null`（預設 `null`）與 `myNickname: string | null`（預設 `null`）欄位。

`null` 表示從未設定（觸發 hajimede redirect）；空字串 `""` 表示曾訪問 hajimede 並選擇跳過；非空字串為已設定的暱稱。

#### Scenario: 新使用者首次建立

- **WHEN** 新 User 由 NextAuth adapter 建立
- **THEN** `nickname` 與 `myNickname` 均為 `null`

#### Scenario: 使用者送出 hajimede 表單（有填暱稱）

- **WHEN** 使用者在 `/hajimede` 輸入非空暱稱並提交
- **THEN** `User.nickname` 更新為該字串，`PATCH /api/user/nickname` 回傳 200

#### Scenario: 使用者送出 hajimede 表單（空白跳過）

- **WHEN** 使用者在 `/hajimede` 不填任何內容直接提交
- **THEN** `User.nickname` 更新為空字串 `""`，`PATCH /api/user/nickname` 回傳 200

### Requirement: Hajimede 初次設定頁

系統 SHALL 提供 `/hajimede` 頁面，讓使用者填入希望被稱呼的名字。

#### Scenario: 有第三方登入名稱時的 placeholder

- **WHEN** 使用者的 OAuth 帳號帶有 `name` 欄位
- **THEN** 輸入框以該 `name` 作為 placeholder，輸入框預設為空（不預填）

#### Scenario: 無第三方名稱時的 placeholder

- **WHEN** 使用者的 OAuth 帳號 `name` 為空
- **THEN** 輸入框 placeholder 為空白，使用者可自行填寫

#### Scenario: 送出後 redirect

- **WHEN** 使用者在 `/hajimede?callbackUrl=<url>` 提交表單
- **THEN** 系統儲存 nickname，並 redirect 到 `callbackUrl`（若不存在則 `/dashboard`）

### Requirement: Page content slot 替換

讀取頁面時，系統 SHALL 將 `Page.content` 中的 slot 語法替換為當前讀者的稱呼，再交給 Markdown 渲染。

替換規則：
- `${MyNickname}` → `viewer.myNickname ?? viewer.nickname ?? '你'`
- `${Nickname}` → `viewer.nickname ?? '你'`

#### Scenario: viewer 有 myNickname

- **WHEN** viewer 的 `User.myNickname` 為 `"阿花"`，content 含 `${MyNickname}`
- **THEN** 渲染結果中 `${MyNickname}` 被替換為 `阿花`

#### Scenario: viewer 只有 nickname

- **WHEN** viewer 的 `User.myNickname` 為 `null`，`User.nickname` 為 `"小花"`，content 含 `${MyNickname}`
- **THEN** 渲染結果中 `${MyNickname}` 被替換為 `小花`

#### Scenario: viewer 無任何暱稱設定

- **WHEN** viewer 的 `myNickname` 與 `nickname` 均為 `null` 或 `""`，content 含 `${Nickname}`
- **THEN** 渲染結果中 `${Nickname}` 被替換為 `你`

#### Scenario: content 無 slot

- **WHEN** `Page.content` 不含任何 `${...}` slot
- **THEN** content 原樣渲染，無任何變動
