# 設計規格 — 閱讀結束體驗：Reader 私訊

> 狀態：已確認（2026-07-07 討論定案：可見性採「誰分享的，誰能看到」），待實作
> 日期：2026-07-07

---

## 背景與目標

`docs/backlog.md`「閱讀結束體驗（最後一頁設計）」項目的三個互斥選項中，選定 **Reader 私訊**：讀完可留一句話給 creator（不公開，creator 在 dashboard 看到）。打破 Like 的匿名性，換來真實的情感回應。

閱讀結束的那一刻目前只有 Like 和 HandoverLetter，設計最薄，但情感上最重要。Like 說「我讀了、我喜歡」，私訊說「我讀了，而且我想讓你知道我的感受」。

**設計紅線**（對齊 product-brief「明確不做的事」）：
- 不是留言板——訊息永遠不公開，其他 reader 看不到彼此的訊息
- 不是聊天——creator 不能回覆，沒有 thread
- 沒有推播通知——creator 是在下次打開 dashboard 時自然看到

**可見性原則（2026-07-07 討論定案）**：**誰分享的，誰能看到**。Reader 留言時的心理預設是「說給把書遞給我的人聽」。Creator 永遠看得到全部（書是她的）；editor 只看得到「自己分享連結帶進來的 reader」的留言。實作上只需在 `BookReader` 加一個 `sharedBy` 欄位（首次進入時從 `Share.createdBy` 抄過來），沒有新 collection。

**本次包含：**
- `BookMessage` model（一人一書一句話，可改可刪）
- `BookReader.sharedBy` 欄位（留言可見性的歸屬依據）
- 閱讀頁書末的留言輸入區（Like 之後），提示文字依分享者動態揭露受眾
- Creator / editor dashboard 的訊息數徽章（`✉ N`）、未讀提示與訊息閱覽 modal（editor 只見自己帶進來的）

**不包含：**
- Creator 回覆功能（紅線）
- Email / 推播通知（紅線）
- Editor 留言給 creator（2026-07-07 定案不做：editor 已有交接信這條情感通道，且雙方本就能直接對話）
- 訊息的富文本／貼圖／照片（純文字一句話）

---

## 使用者故事

- 作為 reader，我讀完朋友為我（或為我們共同的朋友）寫的書，想留一句話讓作者知道我的感受，但不想公開給其他讀者看
- 作為 reader，我送出後想再修改措辭（或整句收回），因為這種話值得斟酌
- 作為 reader，我希望我的話只有「把書遞給我的人」看得到，而且輸入時就清楚知道受眾是誰——這是我們之間的事
- 作為 creator，我想在 dashboard 看到哪本書收到了誰的一句話，作為寫下去的動力
- 作為 editor，我把連結分享給朋友之後，想看到她讀完留下的那句話——她是我帶進來的，那句話也是說給我聽的
- 作為 creator，我想分辨哪些訊息是新來的（上次看過之後才出現的）
- 作為 creator，我想刪除某則訊息（極端情況下的自我保護，例如連結被轉傳給不該看的人）

## 操作流程（use case）

### UC-1：Reader 留言
1. Reader 捲到書末，在 Like 按鈕之後看到一行輕的引導。提示文字依「誰帶我進來的」動態揭露受眾：creator 分享進來 →「讀完了，想對 {creatorName} 說一句話嗎？（只有她看得到）」；editor 分享進來 →「…（只有 {creatorName} 和 {editorName} 看得到）」——受眾永遠明示，不默默擴大
2. 點擊展開 textarea（上限 500 字）＋「送出」
3. 送出後原地顯示自己的話（italic 引號格式，與 HandoverLetter 呼應）＋「修改」「收回」兩個小動作
4. 「修改」回到 textarea 帶原文；「收回」需確認後刪除，回到步驟 1 的引導行
5. 再次進入閱讀頁時，若已留過言，直接顯示步驟 3 的狀態

### UC-2：Creator / Editor 查看
1. Dashboard 書卡在 `♡ N` 旁顯示 `✉ N`（N=0 不顯示，與 like 慣例一致）；有未讀時 ✉ 帶一個小圓點。Creator 的 N 計全部訊息；editor 書卡（「謝謝你，與我回憶」區）的 N 只計自己帶進來的 reader 的訊息
2. 點 `✉ N` 開啟 `BookMessagesModal`：依時間新→舊列出「顯示名稱 ＋ 日期 ＋ 那句話」，未讀項目有標示；editor 看到的清單即其可見子集
3. Modal 開啟即標記已讀（creator 與 editor 各自獨立的已讀狀態，互不影響）
4. 每則訊息有「刪除」動作（需確認，creator 專屬；editor 不可刪）；刪除後 reader 端回到未留言狀態，且不另行通知 reader

### UC-3：權限邊界與歸屬規則
- **歸屬時點**：「誰分享的」= reader **首次進入時**該有效連結的 `Share.createdBy`，寫入 `BookReader.sharedBy` 後永久不變。之後連結被撤銷、由另一人重建，已進來的 reader 歸屬不動——歸屬跟著「把書遞給她的那個人」，不被之後的連結操作改寫
- **延長不轉移**：editor 對 creator 建立的連結按「延長七天」只更新 `expiresAt`，`createdBy` 不動；之後進來的 reader 仍歸 creator。延長是維護動作，不是分享動作
- **缺值 fallback**：`sharedBy` 不存在的 `BookReader`（理論上不會發生——服務尚未上線、欄位與功能同批上；防禦性規則）視為 creator 分享，其留言僅 creator 可見
- Reader 被移除閱讀權後，其訊息保留（已收到的心意不追溯撤銷），但該 reader 無法再修改或收回
- 書轉為 `private` 後同上：訊息保留，creator / editor 仍可在 dashboard 查看

---

## 方案取捨

| 方案 | 說明 | 取捨 |
|------|------|------|
| **A — 一人一書一句話，upsert（推薦）** | unique index `(bookId, fromUserId)`，再次送出即覆蓋 | 結構上就不可能長成留言板／聊天室，紅線由 schema 保證；「一句話」的稀缺性讓它更接近明信片而非評論區 |
| B — append-only 多則訊息 | 同一 reader 可留多則 | 更接近留言板，違反產品紅線；且「第 N 則」會稀釋每句話的重量 |
| C — 匿名一句話 | 不記名，只有內容 | 保護 reader，但 creator 的分享對象本就是三五個知道這段故事的人，匿名反而製造猜疑；且 backlog 明言這功能的價值正是「打破 Like 匿名性」 |

**採 A**。

### 可見性（2026-07-07 定案）

| 方案 | 說明 | 取捨 |
|------|------|------|
| creator only | 只有 creator 看得到 | 最簡單，但 editor 分享給朋友後收不到朋友的回應——「把書遞出去的人」被排除在回應之外 |
| managers 全看 | creator ＋ editor 都看全部 | 規則好懂、零欄位，但違反「說給遞書給我的人聽」的心理預設：creator 分享的 reader 沒打算讓 editor 看 |
| **誰分享的誰能看（採用）** | creator 全看；editor 只看自己帶進來的 reader 的留言 | 精準對應留言的情感指向；成本僅 `BookReader.sharedBy` 一個欄位；受眾在輸入時明示 |

## 資料模型

### `BookReader.sharedBy`（改既有 `lib/models/book-reader.ts`）

```ts
sharedBy: { type: Schema.Types.ObjectId, ref: 'User' },  // 首次進入時該連結的 Share.createdBy
```

`app/share/[token]/page.tsx` 的 `BookReader.findOneAndUpdate` upsert 時，在 `$setOnInsert` 帶入 `sharedBy: share.createdBy`——只在首次建立時寫入，之後同一 reader 再走任何連結進來都不改寫（歸屬時點規則）。

### `BookMessage`（新檔 `lib/models/book-message.ts`）：

```ts
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookMessage extends Document {
  bookId: Types.ObjectId
  fromUserId: Types.ObjectId
  body: string                       // 1–500 字
  readByCreatorAt?: Date | null      // null = creator 尚未看過（未讀圓點依據）
  readByEditorAt?: Date | null       // null = editor 尚未看過（僅對 editor 可見的訊息有意義）
  createdAt: Date                    // timestamps
  updatedAt: Date                    // 修改過的訊息顯示以 updatedAt 為準
}

const BookMessageSchema = new Schema<IBookMessage>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    readByCreatorAt: { type: Date, default: null },
    readByEditorAt: { type: Date, default: null },
  },
  { timestamps: true }
)

BookMessageSchema.index({ bookId: 1, fromUserId: 1 }, { unique: true })  // 一人一書一句話
BookMessageSchema.index({ bookId: 1 })

const BookMessage: Model<IBookMessage> =
  mongoose.models.BookMessage ?? mongoose.model<IBookMessage>('BookMessage', BookMessageSchema)

export default BookMessage
```

- 修改訊息時重置 `readByCreatorAt = null` 與 `readByEditorAt = null`（改過的話對兩者都是新話）
- 訊息**不冗餘存** `sharedBy`：可見性在查詢時以 `fromUserId` join `BookReader.sharedBy` 判斷（規模小，application 端過濾即可）。好處是規則只有一份事實來源；若未來 reader 歸屬規則改了，訊息可見性自動跟上
- 不在 `Book` 上冗餘計數欄位；dashboard 徽章走 aggregate（仿 `lib/queries/book-like-counts.ts`）

## API 設計

### `PUT /api/books/[bookId]/message`（reader 建立/修改自己的訊息）
- Body：`{ body: string }`（zod：trim 後 1–500 字）
- 權限：與 Like API 相同的閱讀權判斷（`canEditBook` 之外的 shared/public 存取），且 `!canEditBook`（creator 不留言給自己、editor 不可留言——見「已決事項」）
- 行為：`findOneAndUpdate` upsert；更新時重置 `readByCreatorAt`
- 回傳：`{ body, updatedAt }`

### `DELETE /api/books/[bookId]/message`（reader 收回自己的訊息）
- 刪除 `(bookId, session.user.id)` 那筆；無則 404

### `GET /api/books/[bookId]/messages`（creator / editor 清單）
- 權限：creator 或該書 editor
- 範圍：creator 回全部；editor 只回「`fromUserId` 對應的 `BookReader.sharedBy === editorId`」的訊息
- 回傳：`[{ _id, fromName, body, updatedAt, unread }]`（`fromName` 取 `User.nickname ?? name`，同 `ReaderList` 的顯示邏輯；`unread` 依請求者身份取對應的 readBy 欄位）

### `PATCH /api/books/[bookId]/messages/read`（標記已讀）
- creator：`updateMany({ bookId, readByCreatorAt: null }, { readByCreatorAt: now })`
- editor：同語意，但範圍限自己可見的訊息、寫 `readByEditorAt`
- `BookMessagesModal` 開啟時呼叫；兩者的已讀狀態各自獨立

### `DELETE /api/books/[bookId]/messages/[messageId]`（creator 刪除單則）
- 權限：creator only（editor 不可刪——訊息的最終處分權跟著書的所有權）

### 閱讀頁初始狀態
`/read/[bookId]` 的 server 端組資料時一併查出 viewer 自己的訊息與其 `BookReader.sharedBy` 對應的分享者名稱（供動態受眾提示文字），仿 `hasLiked` 的載入方式傳入 `read-page-client` 作為初始 props，不多打一支 API。

---

## 前端

### `MessageComposer`（新元件 `components/message-composer.tsx`）
- 位置：`read-page-client.tsx` 書末區，`LikeButton` 之後、`HandoverLetter` 之前
- 三態：`未留言（引導行）→ 編輯中（textarea + 字數 + 送出）→ 已留言（引號展示 + 修改/收回）`
- 引導行與編輯中的受眾提示依 server 帶下來的分享者資訊動態組字（見 UC-1）
- 只在 viewer 具留言資格時渲染（非 creator、非 editor、有閱讀權）
- 樂觀更新比照 `LikeButton`：送出立即進入已留言態，失敗回滾並提示

### `BookMessagesModal`（新元件 `components/book-messages-modal.tsx`）
- 從 dashboard 書卡 `✉ N` 開啟；載入 `GET messages`，開啟即 `PATCH read`
- 每則：名稱、日期（`updatedAt`）、內文（italic 引號）、刪除鈕（僅 creator 渲染）
- 互動骨架比照 `TagManagerModal`（modal 開闔、等待中狀態）；owner 卡與 editor 卡共用同一元件，以 role prop 區分

### Dashboard 接線
- `lib/queries/book-message-counts.ts`（新）：一次 aggregate 回 `{ bookId: { total, unread } }`，與 like counts 同批帶給 `BookCard`；owner 書單計全部，editor 書單只計 `sharedBy === editorId` 的訊息（join `BookReader`）
- `BookCard`（owner 卡與 editor 卡）：`♡ N` 旁顯示 `✉ N`＋未讀圓點；點擊開 modal（阻止卡片本身的連結導航，同 tag 入口的既有處理）

## 權限

| 動作 | Creator | Editor | Reader（有閱讀權） | 已被移除的 Reader |
|------|---------|--------|-------------------|------------------|
| 留言/修改/收回自己的訊息 | ✗（自己的書） | ✗（定案不做） | ✓ | ✗ |
| 查看訊息 | ✓（全部） | ✓（僅自己帶進來的 reader） | ✗（只看得到自己的） | ✗ |
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
- **可見性**：creator 分享進來的 reader A 留言、editor 分享進來的 reader B 留言 → creator modal 見 A+B；editor modal 只見 B；A 的閱讀頁提示「只有 {creator} 看得到」、B 的提示含兩人名字
- Editor 開 modal 標已讀 → creator 的未讀圓點不受影響（反之亦然）
- Editor 延長 creator 建立的連結後，新 reader 進入 → 其留言 editor 看不到（歸屬仍是 creator）
- 連結由 editor 撤銷重建後，新 reader 進入 → 其留言 editor 看得到；先前經 creator 連結進來的 reader 歸屬不變

---

## File Map

- `lib/models/book-message.ts`（新）
- `lib/models/book-reader.ts`：新增 `sharedBy`
- `app/share/[token]/page.tsx`：upsert 時 `$setOnInsert` 帶入 `sharedBy`
- `app/api/books/[bookId]/message/route.ts`（新：PUT / DELETE，reader 自己的）
- `app/api/books/[bookId]/messages/route.ts`（新：GET，creator / editor）
- `app/api/books/[bookId]/messages/read/route.ts`（新：PATCH，依身份寫對應 readBy 欄位）
- `app/api/books/[bookId]/messages/[messageId]/route.ts`（新：DELETE，creator）
- `components/message-composer.tsx`（新）
- `components/book-messages-modal.tsx`（新）
- `components/read-page-client.tsx`：書末區插入 `MessageComposer`，server props 加 viewer 訊息初始值
- `app/read/[bookId]/page.tsx`：server 端查 viewer 自己的訊息
- `lib/queries/book-message-counts.ts`（新）
- `components/dashboard-books-client.tsx`：`BookCard` 徽章與 modal 接線
- `app/dashboard/page.tsx`：帶 message counts

---

## 已決事項（2026-07-07 討論定案）

1. **Editor 不可留言**——editor 已有交接信這條情感通道，且與 creator 本就能直接對話。若日後「editor 想回應交接信」成為真實場景，開放成本極低（拿掉 `!canEditBook` 條件即可）。
2. **可見性採「誰分享的，誰能看到」**——creator 全看，editor 只看自己帶進來的 reader 的留言；受眾在留言輸入時明示，不默默擴大。歸屬規則（首次進入定終身、延長不轉移、缺值歸 creator）見 UC-3。

## 後續演進

- **書末動線整合**：Like、私訊、HandoverLetter 三者在書末的視覺節奏可以在「閱讀頁換頁動畫」（backlog 既有項目）那輪一併重排
- **「N 年前的今天」通知面**：若未來做回顧功能，收過的訊息是最有情感密度的素材
