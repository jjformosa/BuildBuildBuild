## Why

目前 `IUser.role` 只有 `admin | reader`，無法表達「受邀可編輯特定 book 的使用者」這個角色。現有設計把「能不能讀」當成全域屬性，但實際上一個 customer 可能是某本 book 的編輯者，也可能是另一本的讀者，權限是 per-book 的。

## What Changes

- **`IUser.role`**：`'admin' | 'reader'` → `'admin' | 'customer'`（reader 改名為 customer，語意更清晰）
- **Book 層級存取模型**：新增 `editorId`（單一 customer）到 Book schema，取代全域 reader role 判斷存取
- **Share token 發行者**：share link 由 book 的 editor 產生（不限於 admin），讓收到連結的 customer 以唯讀身份瀏覽
- **Middleware 存取規則**：從「全域 role 判斷」改為「全域 role + 書籍成員查詢」

## Capabilities

### Modified Capabilities

- `auth`：session 注入 `customer` role 取代 `reader`；middleware 需查 Book.editorId 判斷編輯權限
- `book-management`：Book schema 新增 `editorId`；`POST /api/books/[bookId]/invite` 讓 admin 邀請 customer 為 editor
- `page-editor`：編輯頁面的存取驗證從 admin-only 改為「admin or book editor」
- `media-upload`：presign endpoint 的擁有者驗證改為「admin or book editor」

### Access Control Matrix

| 操作 | admin | book editor (customer) | reader (customer + share token) | 未登入 |
|---|---|---|---|---|
| 建立 book | ✓ | ✗ | ✗ | ✗ |
| 編輯 book / 新增 page | ✓ | ✓（限自己的 book）| ✗ | ✗ |
| 邀請 editor | ✓ | ✗ | ✗ | ✗ |
| 產生 share link | ✓ | ✓（限自己的 book）| ✗ | ✗ |
| 瀏覽 book | ✓ | ✓ | ✓（有效 token）| ✗ |

## Impact

- **Breaking change**：`IUser.role` enum 從 `reader` 改為 `customer`，需同步更新所有參照
- **影響任務**：`forlove10grams-rewrite` 的 task 1.5（已完成，需補修）、1.8、1.10、2.1、2.3、2.4、2.6、2.10、2.12
- **Book schema 新增欄位**：`editorId?: Types.ObjectId`（ref: User）
- **Share 機制調整**：`createdBy` 可為 admin 或 editor（不再只有 admin）
