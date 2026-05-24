# Editor Management + 把書交給她 — Design Spec

**Date:** 2026-05-23
**Branch:** refactor-2026-with-claude

---

## Goals

1. **編輯者管理**：Creator 可在 dashboard 看到目前的 editor 是誰，並移除編輯權限。
2. **把書交給她**：邀請 editor 時必須寫一封交接信；editor 在 read 頁末尾隨時可以看到這封信，並從那裡進入編輯頁。
3. **Edit 頁快速預覽**：Edit 頁 header 加「查看書本」連結，方便 owner/editor 跳到 read 頁。

---

## Data Model

`BookSchema` 新增欄位：

```typescript
editorLetter: { type: String }  // optional — 邀請時寫入，移除 editor 時清除
```

`editorId` 不變。兩個欄位一起進退：移除 editor 時同時清除 `editorId` 和 `editorLetter`。

---

## API

### `POST /api/books/[bookId]/invite` — 修改

Request body 加入必填欄位 `letter`：

```typescript
const InviteBody = z.object({
  email: z.email(),
  letter: z.string().min(1),
})
```

Handler 將 `letter` 存入 `book.editorLetter`：

```typescript
book.editorId = invitee._id
book.editorLetter = letter
await book.save()
```

Response 不變：`{ ok: true, editorId }`

---

### `DELETE /api/books/[bookId]/editor` — 新增

Auth：`session.user.role === 'admin'`（目前系統的 creator 角色） + `book.createdBy === userId`

Action：清除兩個欄位並儲存：

```typescript
book.editorId = undefined
book.editorLetter = undefined
await book.save()
```

Response：`204 No Content`

---

### `GET /api/books` — 修改

查詢時 populate `editorId`，回傳 `editorName: string | null`：

```typescript
const books = await Book.find(query)
  .populate<{ editorId: { name: string } | null }>('editorId', 'name')
  // ... existing select/lean
```

回傳的 book 物件加入：

```typescript
editorName: b.editorId ? (b.editorId as { name: string }).name : null,
```

---

## Dashboard

### `DashboardBook` 型別

加入：

```typescript
editorName: string | null
```

### 書本卡片（`dashboard-books-client.tsx`）

有無 editor 決定是否顯示底部列（Option C）：

- **無 editor（`editorName === null`）**：卡片不顯示任何 editor 相關資訊
- **有 editor**：卡片底部出現一條分隔列，內容：

```
✎ {editorName}（編輯中）          [移除]
```

`移除` 按鈕行為：
- 呼叫 `DELETE /api/books/[bookId]/editor`
- 成功後 client 端立即將該書的 `editorName` 設為 `null`，列消失
- 失敗顯示簡短錯誤文字

Editor 列的樣式與目前的分享連結列（`share-link-manager.tsx`）一致：`border-t border-[#2C1810]/08`，文字 `text-xs text-[#2C1810]/55`，移除按鈕 `text-red-600 border-red-300`。

---

## 邀請 Modal（`InviteEditorButton`）

在 email 欄位之後加一個必填 textarea：

```
Customer 帳號 Email
[_______________]

交接信（必填）
[                    ]
[                    ]
[                    ]
placeholder：「你想對 ta 說的話…」
```

- textarea `required`，zod 後端也驗證 `min(1)`
- 成功後文案：「邀請成功！對方現在可以編輯此記憶書。」（不變）

---

## Read 頁：`HandoverLetter` Component

新的 client component，放在 read 頁最後一個 page 內容之後。

**顯示條件（由 Server Component 傳入 props）：**
- `isEditor === true`（`book.editorId.toString() === userId`）
- `editorLetter` 存在（非空字串）

> **安全性說明**：`isEditor` 雖是 client prop，可被 dev tools 操作，但只影響 UI 可見性。真正的存取控制在 server 端（edit 頁 Server Component 和所有 API 端點），無法被 client 繞過。

**UI：**

```
────────────────────────────────
{creatorName} 想對你說

「{editorLetter 內容}」

                     [進入編輯 →]
────────────────────────────────
```

- `creatorName`：read 頁 Server Component 在 `Book.findById(bookId)` 之後，額外執行 `User.findById(book.createdBy, 'name').lean()` 取得名字，作為 prop 傳入
- `進入編輯 →`：`<Link href={`/books/${bookId}/edit`}>`
- 永遠可見（不追蹤「已讀」狀態）；信留在那裡，editor 隨時回來看

---

## Edit 頁 Header

在 `app/books/[bookId]/edit/page.tsx` 的 header actions 區加一個 `<Link>`，owner 和 editor 都顯示：

```tsx
<Link
  href={`/read/${bookId}`}
  className="rounded-md border border-[#2C1810]/20 px-3 py-1.5 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
>
  查看書本
</Link>
```

位置：現有 `CoverImageButton` 左側（actions 最左邊）。

---

## File Map

**Create:**
- `components/handover-letter.tsx` — read 頁末尾的交接信 component

**Modify:**
- `lib/models/book.ts` — 加 `editorLetter: String`
- `app/api/books/[bookId]/invite/route.ts` — body 加 `letter`，存入 model
- `app/api/books/route.ts` — populate editor name，回傳 `editorName`
- `app/api/books/[bookId]/editor/route.ts`（新檔） — `DELETE` 端點
- `components/invite-editor-button.tsx` — 加 `letter` textarea
- `components/dashboard-books-client.tsx` — `DashboardBook` 型別 + editor 列 UI
- `app/dashboard/page.tsx` — `toBook` 函式加 `editorName`
- `app/read/[bookId]/page.tsx` — 傳 `isEditor` + `editorLetter` + `creatorName` 給 `HandoverLetter`
- `app/books/[bookId]/edit/page.tsx` — 加「查看書本」link

---

## Out of Scope

- Dashboard 編輯者導向調整（editor 點書導向 read 頁）→ 已記錄於 backlog
- Editor 通知機制（邀請後自動通知）
- 多位 editor 支援（`editorId` 仍為單一欄位）
