## Context

forlove10grams 是私人圖文記憶書平台。存取模型需要支援：admin 建立 book 並邀請單一 customer 為 editor，editor 可編輯內容並分享 read-only link 給其他 customer。

## Goals / Non-Goals

**Goals:**
- `IUser.role` 改為 `admin | customer`，語意正確
- Book 層級的 editor 邀請機制（admin → 單一 customer）
- Editor 可產生 share link，收到連結的 customer 成為該 book 的 reader
- 所有 API route 和 middleware 的存取驗證改為 per-book 判斷

**Non-Goals:**
- 多 editor 支援（MVP 每本 book 只有一位 editor）
- Editor 邀請 UI 介面（Phase 2 處理）
- 精細的 page 層級存取控制

## Decisions

### 1. 全域 role 只有 admin | customer

**決策**：`editor` 和 `reader` 不是全域 role，而是 per-book 的身份。

**理由**：一個 customer 可能同時是 book-A 的 editor 和 book-B 的 reader；把 editor/reader 放在 User document 會造成語意衝突。全域 role 只需要區分「能不能建立 book」（admin）和「一般使用者」（customer）。

### 2. Book.editorId 使用單一 ObjectId（非陣列）

**決策**：`editorId?: Types.ObjectId`，每本 book 最多一位 editor。

**理由**：MVP 場景是 admin 寫給特定人看，一本 book 通常只有一個主要編輯者。陣列設計增加存取驗證複雜度，日後有需求再擴充。

### 3. 存取驗證函式

建立 helper：`canEditBook(userId, book)` 和 `canReadBook(userId, bookId, token?)`

```
canEditBook(userId, book):
  → userId === book.createdBy (admin 身份)
  → userId === book.editorId

canReadBook(userId, bookId, token?):
  → canEditBook(userId, book)
  → ShareToken.exists({ bookId, token, active: true })
```

### 4. Share token 發行者擴充

**決策**：`Share.createdBy` 改為 `Types.ObjectId`（ref: User），可以是 admin 或 editor。

**原本設計**：只有 admin 可以產生 share link。
**新設計**：editor 也可以產生，但驗證時需確認 `createdBy` 是 admin 或該 book 的 editor。

### 5. Middleware 策略

```
/dashboard, /books/*/edit  → 需要 admin role
/read/[bookId]             → 需要登入 + canReadBook
/share/[token]             → 公開（驗證後 redirect）
/api/books                 → 各 route handler 自行驗證
```

Middleware 不做 DB 查詢，只驗 session role；per-book 細粒度驗證由各 route handler 處理。

## Risks / Trade-offs

- **breaking change on role**：`reader` → `customer`，需要同步修改所有相關程式碼
- **單一 editor 限制**：日後若需多 editor 需 migration（但 MVP 範圍內可接受）
- **Reader 身份無 DB 記錄**：reader 只在持有 share token 時才有存取權，server 端需每次驗 token（不快取 session）
