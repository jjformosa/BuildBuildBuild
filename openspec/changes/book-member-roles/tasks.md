## 1. Schema 更新

- [x] 1.1 `lib/models/user.ts`：將 `role` enum 從 `'admin' | 'reader'` 改為 `'admin' | 'customer'`
- [x] 1.2 `forlove10grams-rewrite` tasks.md 的 1.5 備註同步更新（role: admin | customer）

## 2. Book Schema 設計調整（影響 forlove10grams-rewrite task 2.1）

- [x] 2.1 `lib/models/book.ts`：新增 `editorId?: Types.ObjectId`（ref: 'User'）欄位
- [x] 2.2 `lib/models/share.ts`：`createdBy` 改為 `Types.ObjectId`（ref: 'User'，允許 admin 或 editor）

## 3. 存取驗證 Helper

- [x] 3.1 建立 `lib/access.ts`：實作 `canEditBook(userId, book)` 與 `canReadBook(userId, book, token?)` helper 函式

## 4. Auth 整合更新（已整合進 forlove10grams-rewrite 1.8、1.10）

- [x] 4.1 `auth.ts` session callback：注入 `customer` role（→ 實作時見 forlove10grams-rewrite task 1.8）
- [x] 4.2 Middleware：`/dashboard`、`/books/*/edit` 驗 `admin`；`/read/[bookId]` 由 route 層驗（→ 實作時見 forlove10grams-rewrite task 1.10）

## 5. 邀請 Editor API（已整合進 forlove10grams-rewrite 1.11、1.12）

- [ ] 5.1 實作 `POST /api/books/[bookId]/invite`（→ 實作時見 forlove10grams-rewrite task 1.11）
- [ ] 5.2 新增「邀請編輯者」UI 入口（→ 實作時見 forlove10grams-rewrite task 1.12）
