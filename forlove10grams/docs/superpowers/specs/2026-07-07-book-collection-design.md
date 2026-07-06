# 設計規格 — 書本系列 / 收藏夾（Collection）

> 狀態：規劃完成，待討論確認
> 日期：2026-07-07

---

## 背景與目標

`docs/backlog.md`「書本系列 / 收藏夾」項目：和同一個朋友有十次潛水經歷，Dashboard 就有十本散落的書，難以整理。

新增 `Collection`（收藏夾）概念：**純個人整理工具**，多對多關聯 Collection ↔ Book，完全不影響分享機制與書本權限。例如「和 Yuki 的潛水」收藏夾包含歷年的書。

**本次包含：**
- `Collection` model（每人自己的收藏夾，含排序後的書單）
- 收藏夾 CRUD API
- Dashboard 收藏夾列（chips）＋ 點選後顯示該收藏夾的書
- 從 `BookCard` 將書加入/移出收藏夾（modal，仿 `TagManagerModal` 的互動模式）

**不包含：**
- 收藏夾的分享（收藏夾永遠是私人的，不產生連結）
- 巢狀收藏夾（夾中夾）
- 收藏夾自訂封面（先用夾內第一本書的封面）
- 自動歸類（依標籤自動生成收藏夾）

### 與標籤（Tag）的差異——為什麼不是用 tag 就好

| | Tag | Collection |
|---|-----|-----------|
| 歸屬 | 書本層級，creator 和 editor 共享共管 | 使用者層級，只有自己看得到 |
| 用途 | 描述書「是什麼」（潛水、料理），供搜尋 | 組織「我怎麼收」（和 Yuki 的系列），供瀏覽 |
| 排序 | 無 | 夾內書單有序（可講「第一集到第十集」） |
| 跨角色 | 只涵蓋自己是 owner/editor 的書 | 可收任何出現在自己 dashboard 的書（含 reader 身份讀過的） |

一個 reader 想把朋友分享給她的三本書收成一夾，tag 做不到（她無權編輯書）；一位 creator 不想讓 editor 看到「準備給她的驚喜企劃」這種整理名稱，tag 也做不到。

---

## 使用者故事

- 作為 creator，我想建立「和 Yuki 的潛水」收藏夾，把散落在 dashboard 的十本書收進去，讓系列有個家
- 作為 creator，我想調整收藏夾內書的順序，讓系列照時間（或我想要的敘事）排列
- 作為 creator，我想把一本書同時放進「潛水」和「和 Yuki」兩個收藏夾，不用二選一
- 作為 editor/reader，我也想整理「別人邀我寫的」「朋友分享給我的」書，收藏夾不限於自己創作的書
- 作為 creator，我刪除收藏夾時，裡面的書完好無損——收藏夾只是資料夾，不是書的容器
- 作為 creator，我想確定收藏夾是我私人的整理方式，editor 和 reader 看不到我怎麼命名、怎麼分類

## 操作流程（use case）

### UC-1：建立收藏夾並收書
1. Dashboard 頂部（搜尋列下方）顯示「收藏夾」列：既有收藏夾 chips + 「+ 新增」
2. 點「+ 新增」→ inline 輸入名稱 → 建立（同名擋下並提示）
3. 在任一 `BookCard` 開啟「收藏夾」入口（與既有標籤入口並列）→ `CollectionPickerModal` 列出我的所有收藏夾（checkbox）→ 勾選即加入、取消勾選即移出，等待 API 期間顯示「儲存中…」（同 `TagManagerModal` 模式）
4. Modal 內也可直接「+ 新收藏夾」一步完成建夾＋收書

### UC-2：瀏覽收藏夾
1. 點某個收藏夾 chip → 書單區切換為該夾的書（依夾內順序），chip 高亮
2. 收藏夾檢視是獨立模式：進入時清空搜尋字串，離開（點「全部」或再點同一 chip）回到原本的 owner/editor/reader 分區列表——與既有「搜尋模式與排序篩選互斥」的慣例一致
3. 夾內若有我已喪失存取權的書（reader 被移除、連結撤銷），該書不顯示（render 時做存取過濾），夾內紀錄保留——若日後恢復存取自然重新出現

### UC-3：管理收藏夾
1. 收藏夾檢視內提供「重新命名」「刪除收藏夾」入口；刪除需確認，只刪夾不刪書
2. 收藏夾檢視內書卡可拖曳排序（比照編輯頁 `SortablePageItem` 的拖曳模式）；MVP 若拖曳成本高，先用「上移/下移」按鈕替代亦可接受

---

## 方案取捨

| 方案 | 說明 | 取捨 |
|------|------|------|
| **A — Collection 文件內嵌 `bookIds` 陣列（推薦）** | 一個收藏夾一份文件，`bookIds: ObjectId[]` 有序陣列 | 順序天然免費（陣列序即顯示序）；個人工具規模（一夾數十本）下無陣列膨脹疑慮；multikey index 支援「這本書在哪些夾」反查 |
| B — 獨立 join collection（`CollectionBook`） | 每筆 membership 一份文件，帶 `sortIndex` | 通用但殺雞用牛刀：排序要維護 sortIndex、查一個夾要多一次 query，對本產品規模無收益 |
| C — 收藏夾做成特殊前綴 tag | 如 `collection:和Yuki` | 復用既有 tag 機制最省工，但 tag 是書本層級共享資料，會把私人整理暴露給 editor，且無排序——與需求本質衝突 |

**採 A**。

## 資料模型

`lib/models/collection.ts`（新檔）：

```ts
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface ICollection extends Document {
  name: string
  ownerId: Types.ObjectId
  bookIds: Types.ObjectId[]   // 有序：陣列順序即顯示順序
}

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookIds: [{ type: Schema.Types.ObjectId, ref: 'Book' }],
  },
  { timestamps: true }
)

CollectionSchema.index({ ownerId: 1, name: 1 }, { unique: true })  // 同人不同名
CollectionSchema.index({ bookIds: 1 })                             // 反查：這本書在哪些夾

const Collection: Model<ICollection> =
  mongoose.models.Collection ?? mongoose.model<ICollection>('Collection', CollectionSchema)

export default Collection
```

- 不動 `Book` model——書完全不知道自己被收進了誰的夾，權限與分享零耦合
- 書被刪除時夾內留下 dangling id：render 時 populate 不到就跳過即可，不做 cascade 清理（個人規模下無害；若在意可在 book DELETE handler 加一行 `$pull`，列為實作時的順手項）

## API 設計

全部路由皆需登入，且只操作 `ownerId === session.user.id` 的收藏夾。

### `GET /api/collections`
回傳自己的收藏夾清單：`[{ _id, name, bookCount, coverImage }]`（coverImage 取夾內第一本可存取書的封面）。Dashboard 收藏夾列使用。

### `POST /api/collections`
Body `{ name }`（zod：1–60 字）。重名回 409。回傳新收藏夾。

### `GET /api/collections/[collectionId]`
回傳夾內書單（依 `bookIds` 順序 populate，並以與 dashboard 相同的存取規則過濾掉已無權限的書）：`[{ _id, title, coverImage, shareStatus, role }]`。

### `PATCH /api/collections/[collectionId]`
Body（zod，至少一項）：

```ts
{
  name?: string          // 重新命名
  addBookId?: string     // 加一本（$addToSet 語意，append 到尾端）
  removeBookId?: string  // 移一本（$pull）
  bookIds?: string[]     // 整批重排（必須是現有集合的 permutation，否則 400）
}
```

`addBookId` 需驗證：書存在，且我對它有 dashboard 等級的關聯（creator／editor／`BookReader` 記錄之一），否則 403——防止把任意 bookId 收進夾裡探測資料。

### `DELETE /api/collections/[collectionId]`
刪除收藏夾本身，不動任何書。

### 反查（供 `CollectionPickerModal`）
`GET /api/collections?bookId=xxx` → 在清單回應中附 `containsBook: boolean`，讓 modal 一次拿到「我的所有夾＋這本書勾選狀態」，不用逐夾查詢。

---

## 前端

- `components/collection-bar.tsx`（新）：dashboard 搜尋列下方的收藏夾 chips 列（「全部」＋各夾＋「+ 新增」）；選中狀態由 `DashboardShell` 管理（與搜尋 state 同層，互斥切換）
- `components/collection-picker-modal.tsx`（新）：從 `BookCard` 開啟，checkbox 勾選加入/移出，內含快速建夾；互動與樂觀更新模式比照 `TagManagerModal`
- `components/dashboard-books-client.tsx`：`DashboardShell` 新增 `activeCollectionId` state；有值時渲染收藏夾檢視（夾名標題、重新命名/刪除入口、依序書卡、排序控制），無值時維持現有三區列表；`BookCard` 新增「收藏夾」入口按鈕（owner/editor/reader 卡皆有）
- 收藏夾檢視的書卡沿用 `BookCard`，`role` 依我與該書的實際關係渲染（owner 卡可點進編輯、editor 卡雙按鈕、reader 卡進閱讀）

## 權限

| 動作 | 本人 | 其他任何人 |
|------|------|-----------|
| 建立/命名/排序/刪除自己的收藏夾 | ✓ | ✗（他人不可見） |
| 收藏任何自己 dashboard 上的書 | ✓ | — |

收藏夾不改變任何書的可讀性：夾裡的書仍受各自的 shareStatus / BookReader 規則管轄。

---

## 測試計畫

手動驗證：

- 建夾、重名建夾（409 提示）、改名、刪夾（書仍在 dashboard）
- 同一本書加入兩個夾、從其中一夾移除，另一夾不受影響
- 以 reader 身份把「分享給我的書」收進夾；被 creator 移除讀者身份後，夾內該書消失但夾仍在
- 重排夾內順序，重新整理後順序保留
- 傳入非自己 dashboard 的 bookId → 403；操作他人的 collectionId → 403/404
- 收藏夾檢視與搜尋互斥：進夾清搜尋、搜尋離夾

---

## File Map

- `lib/models/collection.ts`（新）
- `app/api/collections/route.ts`（新：GET list / POST）
- `app/api/collections/[collectionId]/route.ts`（新：GET / PATCH / DELETE）
- `components/collection-bar.tsx`（新）
- `components/collection-picker-modal.tsx`（新）
- `components/dashboard-books-client.tsx`：`DashboardShell` state、收藏夾檢視、`BookCard` 入口
- `app/dashboard/page.tsx`：server 端預載收藏夾清單（若 dashboard 目前為 SSR 組裝）

---

## 後續演進

- **收藏夾封面與描述**：自訂封面圖、一句話描述，讓「系列」更有書架感
- **時間軸整合**：夾內書依 `happenedAt` 範圍自動排序的選項（欄位資料累積後）
- **書內互連**：閱讀頁末尾顯示「同系列的下一本」（僅對讀者已有存取權的書），讓系列在閱讀動線上成立——這一步會觸及分享語意，需另開規格討論
