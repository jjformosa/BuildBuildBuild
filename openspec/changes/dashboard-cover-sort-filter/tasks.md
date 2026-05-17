## 1. API — 擴充 GET /api/books 回傳欄位與篩選

- [x] 1.1 在 `app/api/books/route.ts` 的 `GET` handler 加入 `.select('_id title description coverImage published')` 並將 max limit 從 50 改為 200（`pageOrder` 不含，不顯示頁數）
- [x] 1.2 在 mapping 中加入 `coverImage`、`published`（移除 `pageCount`）
- [x] 1.3 加入 `status` query 參數支援：`published` → `{ published: true }`，`unpublished` → `{ published: { $ne: true } }`
- [x] 1.4 執行 `npx tsc --noEmit` 確認無型別錯誤

## 2. Server Component — 更新 toBook() 與 Server 端查詢

- [x] 2.1 在 `app/dashboard/page.tsx` 更新 `toBook()` 的參數型別與回傳值，加入 `coverImage`、`published`、`pageCount`
- [x] 2.2 更新 `DashboardBook` import（型別會在下一步更新）
- [x] 2.3 執行 `npx tsc --noEmit` 確認無型別錯誤

## 3. Client Component — 更新型別與書本卡片 UI

- [x] 3.1 在 `components/dashboard-books-client.tsx` 更新 `DashboardBook` type，加入 `coverImage: string | null`、`published: boolean`（移除 `pageCount`）
- [x] 3.2 新增內部 `BookCard` 元件，包含：封面縮圖（`<img>`）或首字佔位區塊、書名、描述、發布狀態標籤（已分享 / 草稿）
- [x] 3.3 執行 `npx tsc --noEmit` 確認無型別錯誤

## 4. Client Component — 排序與篩選控制

- [x] 4.1 將捲動列表提取為內部元件 `BookListView`，接受 `sort`、`status`、`initialBooks`、`initialHasMore` props
- [x] 4.2 在 `BookListView` 的 `useEffect`（empty deps）實作：若非 `newest` sort，fetch limit=200 並 client-side 排序（`oldest` 用 `.reverse()`，`title` 用 `localeCompare`）
- [x] 4.3 在 `BookListView` 的 `fetchMore` callback 加入 `status` 參數，使 `newest` 模式的 infinite scroll 也能套用篩選
- [x] 4.4 在 `DashboardBooksClient` 加入 `sort` 與 `status` state，渲染排序按鈕（新→舊 / 舊→新 / A→Z）與篩選按鈕（全部 / 已分享 / 草稿）
- [x] 4.5 以 `key={sort+'-'+status}` 傳給 `BookListView`，確保切換時 `useInfiniteScroll` 正確 remount
- [x] 4.6 執行 `npx tsc --noEmit` 確認無型別錯誤

## 5. 手動驗證

- [ ] 5.1 有封面圖的書 → dashboard 顯示縮圖；無封面圖 → 顯示首字佔位區塊（不顯示頁數）
- [ ] 5.2 切換「已發布」篩選 → 只顯示已發布的書；切換「草稿」→ 只顯示未發布的書
- [ ] 5.3 切換「舊→新」排序 → 書本順序反轉；切換「A→Z」→ 按標題字典序排列
- [ ] 5.4 在「新→舊 + 全部」預設模式下捲動到底部 → infinite scroll 正確載入下一批
- [ ] 5.5 切換篩選後再切回預設 → infinite scroll 正常重置並從第一頁開始
