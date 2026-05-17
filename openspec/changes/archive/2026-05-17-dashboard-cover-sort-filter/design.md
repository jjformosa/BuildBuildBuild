## Context

Dashboard 的書本列表現在只傳遞 `_id`、`title`、`description` 三個欄位，造成：
1. `Book.coverImage` 欄位雖存在於 schema 和 MongoDB，但 API、`toBook()`、`DashboardBook` type 三層均未傳遞，封面圖完全無法顯示
2. 沒有排序或篩選的 UI 和後端支援

現有架構：
- Server component `app/dashboard/page.tsx`：SSR 取前 10 本書，交給 `DashboardBooksClient`
- Client component `components/dashboard-books-client.tsx`：使用 `useInfiniteScroll` hook 捲動載入更多
- API `GET /api/books`：cursor-based pagination，以 `_id` 降冪排序

## Goals / Non-Goals

**Goals:**
- 封面圖、頁數、發布狀態完整傳遞至前端並顯示
- 提供排序（新→舊、舊→新、標題 A→Z）和篩選（全部、已發布、草稿）
- 排序與篩選切換後列表正確重置

**Non-Goals:**
- 儲存排序/篩選狀態至 URL 或 localStorage（個人工具，不需分享篩選狀態）
- 支援多欄位複合排序
- 為 editor / reader 的 SharedBookList 加入排序篩選

## Decisions

### D1：非預設排序的資料策略

**決定**：`newest`（預設）使用現有 cursor-based infinite scroll；`oldest` 和 `title` 一次性 fetch 所有書本（limit=200），client-side 排序。

**理由**：
- `oldest` 若改用 cursor-based pagination，需將 cursor 條件從 `_id < after` 改為 `_id > after`，涉及 API 修改且前端邏輯分歧
- `title` 的 cursor 需要複合索引 `(title, _id)`，複雜度高
- Admin 的書本數量通常 <50，一次性 fetch 200 筆完全可接受
- **捨棄方案**：為所有排序實作 server-side sort + 相應 cursor，工程量大、價值低

### D2：元件結構（key remount 策略）

**決定**：將捲動列表提取為內部元件 `BookListView`，在 `DashboardBooksClient` 以 `key={sort+status}` 強制 remount，使 `useInfiniteScroll` 重置狀態。

**理由**：
- 避免在 `useInfiniteScroll` hook 裡加入 reset API（hook 維持單一職責）
- remount 時 hook 從 `initialItems=[]` 開始，乾淨重置
- **捨棄方案**：在 hook 加入 `reset()` 方法，需修改共用 hook，影響所有使用者

### D3：封面圖使用 `<img>` 而非 `next/image`

**決定**：dashboard 卡片的封面縮圖使用原生 `<img>` 標籤。

**理由**：
- `next/image` 需要在 `next.config.ts` 設定 `remotePatterns`，需知道 S3 bucket hostname（env var 非公開）
- 56×56px 縮圖不需要 Next.js 圖片最佳化（WebP 轉換、自動 resize）
- **捨棄方案**：設定 `remotePatterns`，但需要引入 S3 域名設定，超出本次變更範疇

## Risks / Trade-offs

- **非預設排序的完整性**：`oldest` 和 `title` 最多顯示 200 本，超過 200 本時結果不完整。風險極低（個人工具），若有需求再實作完整 server-side sort。
- **remount 的 UX 代價**：切換排序後再切回 `newest`，infinite scroll 從頭開始，使用者已捲動的位置不保留。可接受，排序/篩選的目的是尋找特定書，不是繼續閱讀。
- **`<img>` 無最佳化**：縮圖直接從 S3 載入原始尺寸。若書本封面圖很大，會有浪費頻寬。後續可設定 `remotePatterns` 改善。

## Open Questions

- S3 bucket hostname 是否可以寫入 `next.config.ts` 的 `remotePatterns`？（後續再處理，不阻塞本次）
