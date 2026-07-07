# 設計規格 — 頁面日期（happenedAt）

> 狀態：已完成（2026-07-08 同步；本規格範圍為 Page.happenedAt 欄位、API 與編輯頁 UI，封面時間範圍仍屬後續演進）
> 日期：2026-07-03

---

## 背景與目標

`docs/backlog.md`「頁面日期 / 時間軸」項目：頁面目前沒有「這件事發生在什麼時候」的欄位，但記憶本的本質是時間性的。

backlog 原本的方向包含兩件事：(1) 每頁可選填 `happenedAt` 日期欄位、(2) 書封面顯示時間範圍（例如「2024年11月」）。這次只做第一件——欄位本身與編輯頁的輸入 UI。封面時間範圍需要額外的 aggregate query（仿照 `lib/queries/book-like-counts.ts` 的模式，改成按 bookId 算 `happenedAt` 的 min/max），留到下一輪，等欄位資料開始累積後再做，也才有東西可以顯示。

這也是為未來「N 年前的今天」功能打底層基礎——沒有這個欄位，那類功能無從做起。

**本次包含：**
- `Page.happenedAt`（optional `Date`）欄位
- `PATCH /api/books/[bookId]/pages/[pageId]` 支援讀寫 `happenedAt`
- 編輯頁頂部列（頁型徽章旁）新增日期輸入，未填顯示空白／填了顯示日期，可清除

**不包含：**
- Dashboard／`BookCard` 封面時間範圍顯示
- 「N 年前的今天」功能本身
- reader 端（`/read/[bookId]`）顯示日期
- 依日期排序或篩選頁面
- 批次幫既有頁面補歷史日期的工具

---

## 資料模型

`lib/models/page.ts` 新增欄位：

```ts
export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
  happenedAt?: Date
}
```

```ts
happenedAt: { type: Date },
```

不設 `required`，不設預設值——沿用 backlog 的「可選填」。既有 Page 文件不需要 migration，欄位不存在就是 `undefined`。

儲存精度為完整日期（`YYYY-MM-DD`），不含時間。理由：未來若要做「N 年前的今天」需要比對月/日，完整日期最靈活；只存年月的話之後還要重新補欄位。

---

## API 設計

`app/api/books/[bookId]/pages/[pageId]/route.ts` 的 `PatchPageBody` 新增：

```ts
const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  happenedAt: z.string().nullable().optional(),
})
```

- 傳入 `"2024-11-05"`（`<input type="date">` 原生格式）：`Object.assign(page, parsed.data)` 沿用既有寫法，Mongoose 對 Date 型別欄位的字串賦值會自動轉型，不需要手動 parse。
- 傳入 `null`：清除日期（`page.happenedAt = null`）。
- 不傳這個欄位：維持原值不動（沿用現有 partial update 行為）。

`GET /api/books/[bookId]/pages/[pageId]`（目前只回 `_id`、`transcodingStatus`、`mediaUrls`，供 media-uploader 轉檔輪詢用）不需要跟著回傳 `happenedAt`——編輯頁的日期資料走的是頁面初次載入時的 server-side query，不是這支輪詢用的 API。

`app/books/[bookId]/edit/page.tsx` 組 `PageData[]` 時新增：

```ts
happenedAt: p.happenedAt ? p.happenedAt.toISOString().slice(0, 10) : null,
```

---

## 前端

### `PageData` 型別（`components/book-editor-client.tsx`）

```ts
export type PageData = {
  _id: string
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  happenedAt?: string | null
}
```

### 儲存行為

`happenedAt` 用原生 `<input type="date">`，使用者互動是「選一個值」而不是逐字輸入，不需要像 `content` 那樣 800ms debounce。做法比照 `MediaUploader` 對 `mediaUrls` 的處理——選了就立即 PATCH，不經過現有 `saveTimerRef`／`saveState`（「已儲存／未儲存」）那條給 `content` 用的流程，也不特別處理失敗重試，維持與 media 儲存一致的「fire-and-forget」行為：

```ts
function handleHappenedAtChange(value: string) {
  const currentId = selectedId
  if (!currentId) return
  const happenedAt = value || null
  setPages((prev) => prev.map((p) => (p._id === currentId ? { ...p, happenedAt } : p)))
  fetch(`/api/books/${bookId}/pages/${currentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ happenedAt }),
  })
}
```

### UI 位置

放在頁面頂部列（`selectedPage.type === 'carousel' ? '輪播頁' : '影片頁'` 徽章旁），與右側儲存狀態同一列：

```tsx
<div className="flex-none border-b border-foreground/10 px-6 py-3 flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span className="rounded bg-foreground/8 px-2 py-0.5 text-xs text-foreground/60">
      {selectedPage.type === 'carousel' ? '輪播頁' : '影片頁'}
    </span>
    <input
      type="date"
      value={selectedPage.happenedAt ?? ''}
      onChange={(e) => handleHappenedAtChange(e.target.value)}
      className="rounded border border-foreground/15 bg-transparent px-1.5 py-0.5 text-xs text-foreground/60"
    />
    {selectedPage.happenedAt && (
      <button
        onClick={() => handleHappenedAtChange('')}
        className="text-xs text-foreground/30 hover:text-foreground/60"
        title="清除日期"
      >
        ✕
      </button>
    )}
  </div>
  <span className="text-xs text-foreground/35">
    {saveState === 'saving' ? '儲存中…' : saveState === 'unsaved' ? '未儲存' : '已儲存'}
  </span>
</div>
```

原生 date input 未填時的顯示（placeholder 樣式、格式）交給瀏覽器預設行為，不額外做自訂 placeholder 文字或改造成假按鈕——每個瀏覽器的空狀態呈現本來就不同，硬要統一屬於這次範圍外的打磨。

### 頁面清單（`SortablePageItem`）

不變。頁面清單目前只顯示型別徽章 + 內容摘要，這次不加日期，避免每列變擁擠；等封面時間範圍那輪再一併檢視要不要在清單也露出日期。

---

## 測試計畫

專案沒有自動化測試框架，驗證方式為手動：

- 選一頁，設定日期，重新整理編輯頁，日期仍在（確認有寫入 DB 並在初次載入時正確帶出）
- 清除日期後重新整理，欄位回到空白
- 切換頁面時日期欄位正確反映該頁的值（不會沿用前一頁殘留的值）
- 影片頁與輪播頁都能設定/清除日期
- 未設定過日期的既有頁面（欄位不存在）顯示為空白，不報錯

---

## File Map

- `lib/models/page.ts`：新增 `happenedAt?: Date`
- `app/api/books/[bookId]/pages/[pageId]/route.ts`：`PatchPageBody` 新增 `happenedAt`
- `app/books/[bookId]/edit/page.tsx`：`PageData[]` 組資料時新增 `happenedAt`
- `components/book-editor-client.tsx`：`PageData` 型別、頂部列日期輸入、`handleHappenedAtChange`

---

## 後續演進

若欄位資料開始累積，可再考慮：

- Dashboard `BookCard` 顯示時間範圍（新增 `lib/queries/book-date-range.ts`，仿 `book-like-counts.ts` 的 aggregate 模式，取每本書 `happenedAt` 的 min/max）
- 「N 年前的今天」功能：以 `happenedAt` 的月/日比對今天
- 依 `happenedAt` 排序頁面或整本書的頁面清單
- reader 端在頁面上顯示日期文字
