# 設計規格 — 閱讀結束體驗：Reader 私訊

> 狀態：規劃完成，待討論確認
> 日期：2026-07-07

---

## 背景與目標

`docs/backlog.md`「閱讀結束體驗（最後一頁設計）」項目的三個互斥選項中，選定 **Reader 私訊**：讀完可留一句話給 creator（不公開，creator 在 dashboard 看到）。打破 Like 的匿名性，換來真實的情感回應。

閱讀結束的那一刻目前只有 Like 和 HandoverLetter，設計最薄，但情感上最重要。Like 說「我讀了、我喜歡」，私訊說「我讀了，而且我想讓你知道我的感受」。

**設計紅線**（對齊 product-brief「明確不做的事」）：
- 不是留言板——訊息永遠不公開，其他 reader 看不到彼此的訊息
- 不是聊天——creator 不能回覆，沒有 thread
- 沒有推播通知——creator 是在下次打開 dashboard 時自然看到

**本次包含：**
- `BookMessage` model（一人一書一句話，可改可刪）
- 閱讀頁書末的留言輸入區（Like 之後）
- Creator dashboard 的訊息數徽章（`✉ N`）、未讀提示與訊息閱覽 modal

**不包含：**
- Creator 回覆功能（紅線）
- Email / 推播通知（紅線）
- Editor 留言給 creator（editor 已有交接信這條情感通道，且雙方本就能直接對話；見「未決事項」）
- 訊息的富文本／貼圖／照片（純文字一句話）

---

## 使用者故事

- 作為 reader，我讀完朋友為我（或為我們共同的朋友）寫的書，想留一句話讓作者知道我的感受，但不想公開給其他讀者看
- 作為 reader，我送出後想再修改措辭（或整句收回），因為這種話值得斟酌
- 作為 reader，我希望我的話只有作者看得到——這是我跟她之間的事
- 作為 creator，我想在 dashboard 看到哪本書收到了誰的一句話，作為寫下去的動力
- 作為 creator，我想分辨哪些訊息是新來的（上次看過之後才出現的）
- 作為 creator，我想刪除某則訊息（極端情況下的自我保護，例如連結被轉傳給不該看的人）

## 操作流程（use case）

### UC-1：Reader 留言
1. Reader 捲到書末，在 Like 按鈕之後看到一行輕的引導：「讀完了，想對 {creatorName} 說一句話嗎？（只有她看得到）」
2. 點擊展開 textarea（上限 500 字）＋「送出」
3. 送出後原地顯示自己的話（italic 引號格式，與 HandoverLetter 呼應）＋「修改」「收回」兩個小動作
4. 「修改」回到 textarea 帶原文；「收回」需確認後刪除，回到步驟 1 的引導行
5. 再次進入閱讀頁時，若已留過言，直接顯示步驟 3 的狀態

### UC-2：Creator 查看
1. Dashboard 書卡在 `♡ N` 旁顯示 `✉ N`（N=0 不顯示，與 like 慣例一致）；有未讀時 ✉ 帶一個小圓點
2. 點 `✉ N` 開啟 `BookMessagesModal`：依時間新→舊列出「顯示名稱 ＋ 日期 ＋ 那句話」，未讀項目有標示
3. Modal 開啟即標記全部已讀（下次不再顯示圓點）
4. 每則訊息有「刪除」動作（需確認）；刪除後 reader 端回到未留言狀態，且不另行通知 reader

### UC-3：權限邊界
- Reader 被移除閱讀權後，其訊息保留（creator 已收到的心意不追溯撤銷），但該 reader 無法再修改或收回
- 書轉為 `private` 後同上：訊息保留，creator 仍可在 dashboard 查看

---

## 方案取捨

| 方案 | 說明 | 取捨 |
|------|------|------|
| **A — 一人一書一句話，upsert（推薦）** | unique index `(bookId, fromUserId)`，再次送出即覆蓋 | 結構上就不可能長成留言板／聊天室，紅線由 schema 保證；「一句話」的稀缺性讓它更接近明信片而非評論區 |
| B — append-only 多則訊息 | 同一 reader 可留多則 | 更接近留言板，違反產品紅線；且「第 N 則」會稀釋每句話的重量 |
| C — 匿名一句話 | 不記名，只有內容 | 保護 reader，但 creator 的分享對象本就是三五個知道這段故事的人，匿名反而製造猜疑；且 backlog 明言這功能的價值正是「打破 Like 匿名性」 |

**採 A**。

## 資料模型

`lib/models/book-message.ts`（新檔）：

```ts
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookMessage extends Document {
  bookId: Types.ObjectId
  fromUserId: Types.ObjectId
  body: string                       // 1–500 字
  readByCreatorAt?: Date | null      // null = creator 尚未看過（未讀圓點依據）
  createdAt: Date                    // timestamps
  updatedAt: Date                    // 修改過的訊息顯示以 updatedAt 為準
}

const BookMessageSchema = new Schema<IBookMessage>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    readByCreatorAt: { type: Date, default: null },
  },
  { timestamps: true }
)

BookMessageSchema.index({ bookId: 1, fromUserId: 1 }, { unique: true })  // 一人一書一句話
BookMessageSchema.index({ bookId: 1 })

const BookMessage: Model<IBookMessage> =
  mongoose.models.BookMessage ?? mongoose.model<IBookMessage>('BookMessage', BookMessageSchema)

export default BookMessage
```

- 修改訊息時重置 `readByCreatorAt = null`（改過的話對 creator 而言是新話）
- 不在 `Book` 上冗餘計數欄位；dashboard 徽章走 aggregate（仿 `lib/queries/book-like-counts.ts`）

## API 設計

### `PUT /api/books/[bookId]/message`（reader 建立/修改自己的訊息）
- Body：`{ body: string }`（zod：trim 後 1–500 字）
- 權限：與 Like API 相同的閱讀權判斷（`canEditBook` 之外的 shared/public 存取），**且 `userId !== book.createdBy`**（creator 不留言給自己；editor 是否可留見「未決事項」，MVP 也排除：`!canEditBook`）
- 行為：`findOneAndUpdate` upsert；更新時重置 `readByCreatorAt`
- 回傳：`{ body, updatedAt }`

### `DELETE /api/books/[bookId]/message`（reader 收回自己的訊息）
- 刪除 `(bookId, session.user.id)` 那筆；無則 404

### `GET /api/books/[bookId]/messages`（creator 專用清單）
- 權限：`book.createdBy === userId`（**不含 editor**）
- 回傳：`[{ _id, fromName, body, updatedAt, unread }]`（`fromName` 取 `User.nickname ?? name`，同 `ReaderList` 的顯示邏輯）

### `PATCH /api/books/[bookId]/messages/read`（creator 標記全部已讀）
- `updateMany({ bookId, readByCreatorAt: null }, { readByCreatorAt: now })`
- `BookMessagesModal` 開啟時呼叫

### `DELETE /api/books/[bookId]/messages/[messageId]`（creator 刪除單則）
- 權限：creator only

### 閱讀頁初始狀態
`/read/[bookId]` 的 server 端組資料時一併查出 viewer 自己的訊息（仿 `hasLiked` 的載入方式），傳入 `read-page-client` 作為初始 props，不多打一支 API。

---

## 前端

### `MessageComposer`（新元件 `components/message-composer.tsx`）
- 位置：`read-page-client.tsx` 書末區，`LikeButton` 之後、`HandoverLetter` 之前
- 三態：`未留言（引導行）→ 編輯中（textarea + 字數 + 送出）→ 已留言（引號展示 + 修改/收回）`
- 只在 viewer 具留言資格時渲染（非 creator、非 editor、有閱讀權）
- 樂觀更新比照 `LikeButton`：送出立即進入已留言態，失敗回滾並提示

### `BookMessagesModal`（新元件 `components/book-messages-modal.tsx`）
- 從 dashboard 書卡 `✉ N` 開啟；載入 `GET messages`，開啟即 `PATCH read`
- 每則：名稱、日期（`updatedAt`）、內文（italic 引號）、刪除鈕
- 互動骨架比照 `TagManagerModal`（modal 開闔、等待中狀態）

### Dashboard 接線
- `lib/queries/book-message-counts.ts`（新）：一次 aggregate 回 `{ bookId: { total, unread } }`，與 like counts 同批帶給 `BookCard`
- `BookCard`（owner 卡）：`♡ N` 旁顯示 `✉ N`＋未讀圓點；點擊開 modal（阻止卡片本身的連結導航，同 tag 入口的既有處理）

## 權限

| 動作 | Creator | Editor | Reader（有閱讀權） | 已被移除的 Reader |
|------|---------|--------|-------------------|------------------|
| 留言/修改/收回自己的訊息 | ✗（自己的書） | ✗（MVP，見未決） | ✓ | ✗ |
| 查看全部訊息 | ✓ | ✗ | ✗（只看得到自己的） | ✗ |
| 刪除他人訊息 | ✓ | ✗ | ✗ | — |

---

## 測試計畫

手動驗證：

- Reader 讀完留言 → creator dashboard 出現 `✉ 1` ＋未讀圓點；開 modal 後圓點消失
- Reader 修改訊息 → creator 端未讀圓點重新出現，內容與日期更新
- Reader 收回 → creator 端 `✉` 徽章消失（N=0 不顯示）
- 同一 reader 重複送出只有一筆（upsert，不長成串）
- Creator 開自己的書的閱讀頁 → 看不到留言輸入區；editor 亦然
- Creator 刪除某則 → 該 reader 的閱讀頁回到未留言狀態，可重新留言
- 被移除的 reader 直接打 PUT API → 403
- 501 字送出 → 400；純空白 → 400

---

## File Map

- `lib/models/book-message.ts`（新）
- `app/api/books/[bookId]/message/route.ts`（新：PUT / DELETE，reader 自己的）
- `app/api/books/[bookId]/messages/route.ts`（新：GET，creator）
- `app/api/books/[bookId]/messages/read/route.ts`（新：PATCH）
- `app/api/books/[bookId]/messages/[messageId]/route.ts`（新：DELETE，creator）
- `components/message-composer.tsx`（新）
- `components/book-messages-modal.tsx`（新）
- `components/read-page-client.tsx`：書末區插入 `MessageComposer`，server props 加 viewer 訊息初始值
- `app/read/[bookId]/page.tsx`：server 端查 viewer 自己的訊息
- `lib/queries/book-message-counts.ts`（新）
- `components/dashboard-books-client.tsx`：`BookCard` 徽章與 modal 接線
- `app/dashboard/page.tsx`：帶 message counts

---

## 未決事項（實作前需拍板）

1. **Editor 是否可留言？** 本規格 MVP 排除（editor 已有交接信通道，且與 creator 本就熟識），但若「editor 寫完想留一句話回應交接信」是真實場景，開放成本極低（拿掉 `!canEditBook` 條件即可）。
2. **Editor 是否可讀訊息？** 本規格定為 creator only——reader 留言時的心理預設是「說給作者聽」。若日後 editor 反映想看，需在留言輸入區明示「creator 與 editor 都看得到」再開放，不能默默擴大受眾。

## 後續演進

- **書末動線整合**：Like、私訊、HandoverLetter 三者在書末的視覺節奏可以在「閱讀頁換頁動畫」（backlog 既有項目）那輪一併重排
- **「N 年前的今天」通知面**：若未來做回顧功能，收過的訊息是最有情感密度的素材
