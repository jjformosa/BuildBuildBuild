# 設計文件：書本 Like 功能

**日期：** 2026-05-21  
**狀態：** 待實作  
**對應 backlog：** 輕量版已讀回執（重新定義為 Like 功能）

---

## 背景與目標

Creator 希望知道朋友有沒有喜歡自己分享的書，但「已讀/未讀」的追蹤資料容易造成焦慮（開始讀卻沒讀完）且有被監控的感覺。

改以「讀者主動 Like」取代被動追蹤：

- Creator 只看到 like 數量，不看個別讀者行為
- 讀者主動表態，透明且自願
- 資料庫去特徵化：`BookLike.userId` 僅用於防重複，對 creator 端 API 完全隱藏

---

## 範疇（Scope）

| 角色 | 功能 |
|------|------|
| 讀者 | 在書末看到 Like 按鈕，可 toggle（喜歡 / 取消喜歡） |
| Creator | 在 dashboard 書本卡片看到 `♡ N`（N=0 時不顯示） |

**不在範疇內：**
- 顯示是誰 like 了（永遠只顯示數字）
- 通知推播
- 書本內 per-page like

---

## 資料模型

### 新增：`lib/models/book-like.ts`

```ts
interface IBookLike extends Document {
  bookId: Types.ObjectId  // ref: 'Book'
  userId: Types.ObjectId  // ref: 'User'，僅用於去重複
  likedAt: Date
}
```

**Index：** `{ bookId: 1, userId: 1 }`，`unique: true`

**去特徵化政策：** `userId` 不出現在任何 creator 端的 API 回傳值中。

---

## API 設計

### `POST /api/books/[bookId]/like`

Toggle like 狀態。

**Auth：** 登入 + 有書的讀取權限（`canEditBook(userId, book) || book.published || isBookReader(userId, bookId)`）

**邏輯：**
1. 若 `BookLike` 已有 `{ bookId, userId }` → deleteOne（取消 like）
2. 否則 → create（like）
3. 回傳 `{ liked: boolean }`

**不回傳 likeCount**（由各頁面自行維護，避免額外查詢）

### 擴充：`GET /api/books`（僅 admin 身份）

在書單回傳物件加入 `likeCount: number`。

**查詢方式：** 取得書單後，用一次 aggregation 批次取得所有書的 like 數：

```ts
BookLike.aggregate([
  { $match: { bookId: { $in: bookObjectIds } } },
  { $group: { _id: '$bookId', count: { $sum: 1 } } }
])
```

結果以 `Map<string, number>` 形式合併回書單。

---

## 前端設計

### 共用 helper：`lib/queries/book-like-counts.ts`

```ts
getLikeCountsByBook(bookIds: ObjectId[]): Promise<Map<string, number>>
```

SSR（dashboard）和 API（`/api/books`）共用此函式，避免重複邏輯。

### 閱讀頁：`ReadPageClient`

**SSR 查詢（`app/read/[bookId]/page.tsx`）：**
```ts
const hasLiked = !!(await BookLike.exists({ bookId, userId: session.user.id }))
```
將 `hasLiked: boolean` 傳入 `ReadPageClient`。

**Like 按鈕位置：** 書本末尾，當 `!hasMore && pages.length > 0` 時渲染：

```
[書末]
· · ·

❤  謝謝你讀完了
```

心型圖示：空心（未 like）↔ 填滿（已 like）。Toggle 支援取消。

**狀態管理：**
- `useState<boolean>(initialHasLiked)` + optimistic update
- 若 API 呼叫失敗 → rollback

**新增 Props：**
```ts
type Props = {
  // ... 現有 props
  hasLiked: boolean
}
```

### Dashboard：`BookCard`

**`DashboardBook` 型別新增：**
```ts
likeCount: number
```

**顯示邏輯：** `likeCount > 0` 時，在卡片右側（草稿/已分享 badge 旁）顯示：
```
♡ 2
```

樣式：`text-xs text-[#2C1810]/40`，不搶眼。`likeCount === 0` 時什麼都不顯示。

---

## 觸及檔案清單

| 檔案 | 變更類型 |
|------|---------|
| `lib/models/book-like.ts` | 新增 |
| `lib/queries/book-like-counts.ts` | 新增 |
| `app/api/books/[bookId]/like/route.ts` | 新增 |
| `app/api/books/route.ts` | 擴充（加 likeCount） |
| `app/read/[bookId]/page.tsx` | 擴充（查詢 hasLiked） |
| `components/read-page-client.tsx` | 擴充（like 按鈕） |
| `components/dashboard-books-client.tsx` | 擴充（顯示 likeCount） |
| `app/dashboard/page.tsx` | 擴充（SSR likeCount） |

---

## 邊界條件

| 情境 | 處理方式 |
|------|---------|
| 書本沒有頁面（pageOrder = []） | Like 按鈕不出現（`pages.length === 0`） |
| Creator 讀自己的書並按 like | 允許，計入 likeCount（小圈子中無特別排除必要） |
| 同一讀者重複 POST | unique index 防重複；toggle 邏輯不受影響 |
| API 失敗 | Client optimistic rollback |
