# 設計規格 — 讀者管理（基於 Share Link）

> 狀態：已完成（2026-07-08 同步）
> 日期：2026-05-24

---

## 背景與範圍

原 BookReader / invite 系統已廢除（commit `9b45342`）。讀者存取曾純粹由 `shareStatus` 決定（任何登入者皆可讀）。本次設計重新引入 `BookReader` 模型，以 share link 作為唯一入口，實現逐人讀者記錄與管理。

**本次包含：**
- `BookReader` 模型
- Share link 進入時自動建立讀者記錄
- 讀者列表 API 與 UI
- 移除讀者 API
- Read page 存取控制調整
- 廢除舊 editor invite route

**不包含：**
- Email 通知
- 黑名單機制
- Reader Dashboard（讀過的書本列表）

---

## 角色定義

與 `role_permission.md` 一致：

| 角色 | 定義 |
|------|------|
| **Admin** | `book.createdBy === userId` |
| **Editor** | `book.editorId === userId` |
| **Reader** | `BookReader` 記錄存在（`bookId + userId`） |

**Manager** = Admin 或 Editor（可管理分享連結與讀者名單）。

---

## 資料模型

### BookReader（新增）

```typescript
// lib/models/book-reader.ts
{
  bookId:   ObjectId   // ref: Book
  userId:   ObjectId   // ref: User
  joinedAt: Date       // default: now
}
// unique compound index: { bookId: 1, userId: 1 }
// index: { bookId: 1 }
// timestamps: false
```

移除讀者 = 刪除記錄。無黑名單，被移除者可透過 share link 重新加入。

---

## 存取控制

### `/read/[bookId]`

```typescript
const isAdmin  = book.createdBy.toString() === userId
const isEditor = book.editorId?.toString() === userId
const isReader = await BookReader.exists({ bookId: book._id, userId })

const canAccess =
  isAdmin ||
  isEditor ||
  (book.shareStatus === 'shared' && !!isReader) ||
  book.shareStatus === 'public'
```

- `shared` 書本：需有 BookReader 記錄才可讀（不再是任何登入者皆可）
- `public` 書本：任何已登入者可讀，不需 BookReader
- 撤銷連結（shareStatus → private）後，所有讀者（含已有記錄者）立即失去存取

---

## BookReader 寫入時機

在 `/app/share/[token]/page.tsx` Server Component 中，token 驗證通過、確認 `book.shareStatus === 'shared'` 後、redirect 前執行 upsert：

```typescript
await BookReader.findOneAndUpdate(
  { bookId: book._id, userId: session.user.id },
  { $setOnInsert: { joinedAt: new Date() } },
  { upsert: true }
)
redirect(`/read/${share.bookId.toString()}`)
```

Manager 點 share link 也會執行此 upsert（不影響正確性，`canAccess` 條件先命中 isAdmin/isEditor）。

---

## API 路由

### 讀者管理（需 Manager 身份）

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/books/[bookId]/readers` | 列出讀者（userId、displayName、joinedAt） |
| `DELETE` | `/api/books/[bookId]/readers/[userId]` | 移除讀者 |

### GET `/api/books/[bookId]/readers`

Response：
```json
[
  { "userId": "...", "displayName": "...", "joinedAt": "2026-05-24T..." }
]
```

- `displayName` 優先取 `user.nickname`，fallback 為 `user.name`
- 依 `joinedAt` 降序排列

### DELETE `/api/books/[bookId]/readers/[userId]`

- 讀者不存在：404 `Reader not found`
- 成功：204

### 錯誤處理

| 情境 | HTTP | 訊息 |
|------|------|------|
| 未登入 | 401 | `Unauthorized` |
| 非 Manager | 403 | `Forbidden` |
| 讀者不存在（DELETE） | 404 | `Reader not found` |

---

## 前端

### ReaderList component

位置：編輯頁底部 section，緊接 `ShareLinkManager` 下方。

顯示：名稱、加入時間（相對時間或日期）、移除按鈕。  
空狀態：「還沒有讀者」。  
只要 `book.shareStatus === 'shared'` 就顯示（即使 link 已到期，現有讀者仍有存取權，名單仍有意義）。shareStatus 為 `private` 時隱藏。

---

## 廢除項目

- 刪除 `/app/api/books/[bookId]/invite/route.ts`（舊 editor invite，發 email 邀請 editor，與讀者功能無關）
