## 1. 建立 TagManagerModal 元件

- [x] 1.1 新增 `forlove10grams/components/tag-manager-modal.tsx`，接受 props：`bookId`, `tags`, `onAdd`, `onRemove`, `onClose`
- [x] 1.2 Modal 以固定遮罩（backdrop）置中顯示，點擊背景關閉
- [x] 1.3 監聽 Escape 鍵，按下時呼叫 `onClose`
- [x] 1.4 Modal 內顯示現有標籤為可刪除 chip（✕ 按鈕呼叫 `onRemove`）
- [x] 1.5 Modal 內嵌入現有 `TagInput` 元件（傳入 `onAdd`、`safeTags`、`onRemove`；TagInput 負責顯示 chips + 輸入框）

## 2. 修改 Dashboard BookCard

- [x] 2.1 移除 `dashboard-books-client.tsx` 內 BookCard 的 `showTagInput` 狀態與內嵌 `TagInput`
- [x] 2.2 新增 `showTagModal` 狀態，`＋標籤` 按鈕改為開啟 `TagManagerModal`
- [x] 2.3 `TagManagerModal` 的 `onAdd` 呼叫 `POST /api/books/[bookId]/tags` 並以回傳 `tags` 更新 `tagOverrides`
- [x] 2.4 `TagManagerModal` 的 `onRemove` 呼叫 `DELETE /api/books/[bookId]/tags/[tagName]` 並更新 `tagOverrides`
- [x] 2.5 確認卡片本體（書名、描述、狀態）不顯示 tag chips

## 3. 修改 Book Editor 側欄

- [x] 3.1 移除 `book-editor-client.tsx` 側欄底部的 `TagInput` 區塊
- [x] 3.2 新增 `showTagModal` 狀態，側欄底部改為單一 `[標籤]` 按鈕
- [x] 3.3 按鈕開啟 `TagManagerModal`，`onAdd`/`onRemove` 直接呼叫已有的 `handleAddTag`/`handleRemoveTag`
- [x] 3.4 `TagManagerModal` 關閉後本地 `tags` 狀態已透過 `handleAddTag`/`handleRemoveTag` 更新，無需額外同步

## 4. 驗證

- [x] 4.1 Dashboard：點擊 `＋標籤` → Modal 開啟 → 新增標籤 → 關閉 → 卡片標籤資料已更新（本地）
- [x] 4.2 Dashboard：Modal 內可刪除標籤（先前不支援）
- [x] 4.3 Editor：點擊 `[標籤]` → Modal 開啟 → autocomplete 下拉完整顯示（不被裁切）
- [x] 4.4 Editor：Modal 內可新增與刪除標籤
- [x] 4.5 Escape 鍵與點擊背景均可關閉 Modal
- [x] 4.6 編輯者身份（非擁有者）可在兩個入口管理標籤
