# 設計規格 — 讀者邀請機制（Reader Invite）

> 狀態：已確認，待實作
> 日期：2026-05-20
> 相關文件：`2026-05-19-reader-invite-user-stories.md`

---

## 範圍與邊界

**本次設計包含：**
- 邀請連結的生命週期（產生、延長、撤銷）
- 讀者授權的管理（加入、移除）
- 閱讀頁存取控制

**不包含（獨立處理）：**
- 現有 `/share/[token]` 公開分享機制（保留不動）
- Reader Dashboard（受邀書本列表）
- Email 通知
- 輕量版已讀回執

---

## 角色

| 角色 | 定義 |
|------|------|
| **Manager** | `book.createdBy === userId` 或 `book.editorId === userId` |
| **Reader** | BookReader 記錄存在（`bookId + userId`） |
| **Visitor** | 未登入，或已登入但不是 Manager 也不是 Reader |

`canRead(userId, book)` = `isManager` 或 `isReader`

---

## 資料模型

### BookInvite

```typescript
{
  bookId:    ObjectId   // ref: Book, index
  token:     string     // nanoid(12), unique index
  createdBy: ObjectId   // ref: User
  expiresAt: Date       // createdAt + 7 天
  revokedAt?: Date      // null = 未撤銷
}
// timestamps: true
```

**有效邀請條件**：`revokedAt == null && expiresAt > now`

一本書只有一條 BookInvite 記錄。延長 = upsert（清 `revokedAt`、新 `token`、`expiresAt = now+7d`）。

### BookReader

```typescript
{
  bookId:   ObjectId   // ref: Book
  userId:   ObjectId   // ref: User
  joinedAt: Date       // default: now
}
// unique compound index: { bookId: 1, userId: 1 }
```

移除讀者 = 刪除記錄。無黑名單機制，被移除者可透過新邀請重新加入。

---

## API 路由

### 邀請連結管理（需 Manager 身份）

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/books/[bookId]/invite-link` | 取得目前邀請連結狀態 |
| `POST` | `/api/books/[bookId]/invite-link` | 產生或延長邀請連結（upsert） |
| `DELETE` | `/api/books/[bookId]/invite-link` | 撤銷（寫入 `revokedAt = now`） |

### 接受邀請（需登入）

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/invite/[token]` | 驗證 token，回傳書本基本資訊（不需登入） |
| `POST` | `/api/invite/[token]/accept` | 接受邀請，寫入 BookReader |

### 讀者管理（需 Manager 身份）

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/books/[bookId]/readers` | 列出讀者（userId、displayName、joinedAt） |
| `DELETE` | `/api/books/[bookId]/readers/[userId]` | 移除讀者 |

---

## 頁面流程

### `/invite/[token]` — Landing Page

```
開啟連結
│
├─ token 無效（不存在、已撤銷、已到期）
│   └─ 顯示「連結無效或書本已停止分享」
│
├─ 未登入
│   └─ 導向 /login?callbackUrl=/invite/[token]
│
├─ 已登入，已是讀者（或 Manager）
│   └─ 直接導向 /books/[bookId]/read
│
└─ 已登入，尚未是讀者
    └─ 顯示書本封面 + 標題 + 「開始閱讀」按鈕
        POST /api/invite/[token]/accept → 導向 /books/[bookId]/read
```

### `/books/[bookId]/read` — 閱讀頁

每次進入做 server-side 存取檢查：`canRead` 為 false → 403 → 前端顯示「你沒有這本書的閱讀權限」。

### 書本編輯頁（新增區塊）

在現有編輯頁新增「讀者與分享」區塊：
1. 邀請連結狀態（URL、到期時間）+ 產生/延長 + 撤銷按鈕
2. 讀者列表（名稱、加入時間、移除按鈕）

---

## 錯誤處理

| 情境 | HTTP | 訊息 |
|------|------|------|
| 未登入 | 401 | `Unauthorized` |
| 非 Manager 呼叫管理 API | 403 | `Forbidden` |
| token 不存在 | 404 | `Invite not found` |
| token 已撤銷或已到期 | 410 | `Invite expired or revoked` |
| 無讀者授權嘗試閱讀 | 403 | `No read access` |
| 移除不存在的讀者 | 404 | `Reader not found` |
| 已是讀者再次 accept | 200 | `{ alreadyReader: true }` |

Landing Page 對使用者統一顯示「連結無效或書本已停止分享」，不區分撤銷或到期。

---

## 邊界條件

- **Manager 點邀請連結**：跳過 accept，直接導向閱讀頁
- **accept 瞬間 token 到期**：accept 時再次驗證，過期回傳 410
- **撤銷後重新產生**：upsert 同一條 BookInvite，token 重新產生，到期時間重設
- **Editor 身份被移除後**：若其同時也是 BookReader，讀者身份不受影響（兩者獨立）
