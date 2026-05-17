# Books Tags 系統設計

**日期：** 2026-05-17  
**狀態：** 已核准

## 背景

Books 目前只能透過標題搜尋。本次新增標籤（tags）系統，讓 admin 和 editor 可以為書籍加上分類標籤，並透過搜尋找到相關書籍。搜尋 UI 的調整留待後續另行設計，本次只實作後端搜尋邏輯與標籤編輯功能。

---

## 資料模型

### 新增 Tag Collection

`forlove10grams/lib/models/tag.ts`

```typescript
interface ITag extends Document {
  name: string       // 正規化儲存（trim），建立唯一索引
  authorId: Types.ObjectId  // 第一次建立此 tag 的使用者
  createdAt: Date
}
```

索引：`name`（unique）

### Book Model 新增欄位

`forlove10grams/lib/models/book.ts`

```typescript
tags: string[]   // 純文字陣列，預設 []
```

Book 上的 tag 以原始文字儲存，不存 Tag ID（denormalized）。

---

## API 設計

### `GET /api/tags?q=keyword`（新增）

- 搜尋標籤庫中符合關鍵字的 tag（regex, case-insensitive）
- 回傳最多 10 筆 tag 名稱
- 任何已登入用戶可呼叫，供前端 AutoComplete 使用

### `POST /api/books/[bookId]/tags`（新增）

```typescript
body: { name: string }
```

- 驗證呼叫者有編輯權限（owner 或 editor）
- 將 tag 加入 Book 的 `tags[]`（已存在則忽略）
- 若標籤庫中無此 tag，建立新記錄並記錄 `authorId`

### `PATCH /api/books/[bookId]`（擴充）

- 既有 endpoint，接受 `tags: string[]` 欄位
- 編輯頁刪除 tag 時，前端 filter 後送出完整陣列

### `GET /api/books?q=keyword`（修改）

原本只比對 `title`，改為：

```typescript
const regex = { $regex: escaped, $options: 'i' }
query.$or = [{ title: regex }, { tags: regex }]
```

---

## UI 元件

### `TagInput`（新共用元件）

`forlove10grams/components/tag-input.tsx`

```typescript
interface TagInputProps {
  tags: string[]
  onAdd: (tag: string) => Promise<void>
  onRemove?: (tag: string) => Promise<void>  // 未傳入時不顯示刪除按鈕
}
```

行為：
- 輸入框 debounce 300ms 後呼叫 `GET /api/tags?q=...`
- 顯示 AutoComplete 下拉選單（最多 10 筆）
- 按 Enter 或點選 → 觸發 `onAdd`
- `onRemove` 存在時，每個 tag 旁顯示 ✕ 按鈕

### Dashboard BookCard（擴充）

`forlove10grams/components/dashboard-books-client.tsx`

- 每張 BookCard 加「＋ 標籤」按鈕
- 點擊後展開 `TagInput`（不傳 `onRemove`，Dashboard 只能新增）
- 新增後呼叫 `POST /api/books/[bookId]/tags`，局部更新 UI

### 書籍編輯頁（擴充）

`forlove10grams/components/book-editor-client.tsx`

- 在書籍設定區塊（標題/描述旁）加入 Tags 區域
- 使用 `TagInput`（傳入 `onRemove`）
- 刪除後在前端 filter，呼叫 `PATCH /api/books/[bookId]` 送出完整 `tags` 陣列

---

## 範圍外（本次不實作）

- 搜尋 UI 變更（下拉 tag 篩選、標籤雲等）留待後續設計
- Book Card 上顯示 tags
- Tags 管理後台（批次刪除、重新命名等）

---

## 驗證方式

1. 建立書籍後，在編輯頁新增 tag → 確認 Book 的 `tags[]` 更新
2. 確認新 tag 寫入標籤庫，`authorId` 正確
3. 在 Dashboard 書卡快速新增 tag → 確認可新增、不可刪除
4. 搜尋 tag 文字 → 確認對應書籍出現在結果中
5. 搜尋 title 文字 → 確認原有行為未受影響
6. 輸入已存在的 tag → AutoComplete 顯示候選項目
