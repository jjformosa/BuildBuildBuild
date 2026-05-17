## 1. API — 新增 q 參數

- [x] 1.1 在 `app/api/books/route.ts` 讀取 `searchParams.get('q')`，trim 後若非空字串則加入 `query.title = { $regex: q, $options: 'i' }`
- [x] 1.2 確認空字串 q 不影響查詢（忽略不加條件）
- [x] 1.3 執行 `npx tsc --noEmit` 確認無型別錯誤

## 2. 前端 — 搜尋輸入框與模式切換

- [x] 2.1 在 `DashboardBooksClient` 新增 `query` state（`string`，初始值 `''`）與 debounced value（300ms）
- [x] 2.2 新增搜尋輸入框 UI，放在 sort/status 控制列同一行（左側或上方）；有 query 時顯示清除按鈕（×）
- [x] 2.3 `query` 非空時隱藏 sort/status 控制列，`BookListView` 換成 `SearchResultsView`
- [x] 2.4 清空 query 時恢復 sort/status 控制列與原 `BookListView`

## 3. 前端 — SearchResultsView 元件

- [x] 3.1 新增 `SearchResultsView` 元件（接受 `query: string` prop），使用 `useInfiniteScroll` 對 `/api/books?q=<query>&limit=10` 做 cursor 分頁
- [x] 3.2 `query` 改變時元件 remount（透過 `key={query}`）以重置捲動狀態
- [x] 3.3 無結果時顯示「找不到符合「{query}」的記憶書。」
- [x] 3.4 載入中顯示「載入中…」

## 4. 驗證

- [x] 4.1 輸入關鍵字 → 確認 API 被呼叫、結果正確顯示
- [x] 4.2 捲動到底部 → 確認 cursor 分頁正常載入下一頁
- [x] 4.3 清空搜尋 → 確認回到原列表（sort/status 狀態保留）
- [x] 4.4 輸入無結果的關鍵字 → 確認空白狀態文字正確
- [x] 4.5 執行 `npx tsc --noEmit` 無錯誤
