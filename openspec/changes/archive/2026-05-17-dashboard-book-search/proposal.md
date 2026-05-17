## Why

Dashboard 書本列表是平鋪式無限捲動，書多了之後使用者只能靠滾動找書，沒有辦法依標題快速定位。搜尋是書多後最直接的解法。

## What Changes

- `/api/books` GET 新增 `q` 查詢參數，對 `title` 做 case-insensitive regex 搜尋（MongoDB `$regex`）
- Dashboard 搜尋狀態下每次最多回傳 10 筆，並支援 cursor 分頁（與現有 `after` 機制相同）
- `DashboardBooksClient` 新增搜尋輸入框；有搜尋關鍵字時切換成搜尋模式，無關鍵字時回到原本的排序 / 篩選模式
- 搜尋結果不支援 sort/status filter（搜尋模式與排序篩選模式互斥）
- 搜尋僅作用於使用者自己建立的書（`createdBy = userId`），editor/reader 書不在範圍內

## Capabilities

### New Capabilities

- `book-search`: 在 dashboard 依標題關鍵字搜尋使用者自己建立的書，結果以 cursor 分頁（limit 10）顯示

### Modified Capabilities

- `book-management`: API GET `/api/books` 新增 `q` 參數（server-side regex 搜尋）

## Impact

- `forlove10grams/app/api/books/route.ts` — 新增 `q` 參數處理
- `forlove10grams/components/dashboard-books-client.tsx` — 新增搜尋輸入框與搜尋模式邏輯
- 無新 dependency、無 breaking change
