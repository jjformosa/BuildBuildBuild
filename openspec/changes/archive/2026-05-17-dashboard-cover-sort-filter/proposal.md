## Why

Dashboard 的書本列表只顯示標題與描述，隱藏了 `Book.coverImage` 欄位（API、型別、UI 三層均未傳遞），也沒有排序或篩選控制，書數量增加後難以快速定位目標書。

## What Changes

- **傳遞封面圖**：API、`toBook()`、`DashboardBook` type 一併加入 `coverImage`、`published`、`pageCount` 欄位
- **書本卡片升級**：Dashboard 書本列表從純文字列表升級為帶封面縮圖、頁數、發布狀態標籤的卡片
- **排序控制**：新增「新→舊 / 舊→新 / 標題 A→Z」排序按鈕
- **篩選控制**：新增「全部 / 已發布 / 草稿」狀態篩選按鈕
- **API 擴充**：`GET /api/books` 加入 `status` filter 參數，max limit 從 50 提升至 200

## Capabilities

### New Capabilities

- `dashboard-book-list`: Dashboard 的書本列表 UI，包含封面縮圖卡片、排序控制、篩選控制、頁數與發布狀態顯示

### Modified Capabilities

- `book-management`: `GET /api/books` 回傳欄位新增 `coverImage`、`published`、`pageCount`；加入 `status` query 參數；max limit 從 50 提升至 200

## Impact

- **修改檔案**：`app/api/books/route.ts`、`app/dashboard/page.tsx`、`components/dashboard-books-client.tsx`
- **無 breaking change**：新增欄位，API 現有消費者（`dashboard-books-client.tsx`）向後相容
- **無資料 migration**：`coverImage`、`published` 欄位已存在於 MongoDB schema
