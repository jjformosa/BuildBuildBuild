## Context

Dashboard 已有 cursor-based 無限捲動（新→舊）、sort（新→舊 / 舊→新 / A→Z）、status filter（全部 / 已分享 / 草稿）。書多了之後這些控制不足以快速定位特定書，需要關鍵字搜尋。

搜尋範圍僅限 creator 自己建立的書（`createdBy = userId`），editor/reader 書走獨立 `SharedBookList`，不在此範圍。

## Goals / Non-Goals

**Goals:**
- `/api/books` GET 支援 `q` 參數，server-side regex 搜尋 `title`
- Dashboard 新增搜尋輸入框；有關鍵字時切搜尋模式，清空後回原始列表
- 搜尋結果保持 cursor 分頁，limit 10

**Non-Goals:**
- MongoDB text index / CJK 分詞（目前書量不需要）
- 搜尋 + sort/filter 同時生效（互斥設計）
- 搜尋 editor/reader 書

## Decisions

### 1. 搜尋策略：`$regex` 而非 text index

MongoDB `$regex` + `$options: 'i'`（case-insensitive），直接加在現有 `createdBy` query 上。

**Why over text index**: 不需建 index migration，無 CJK tokenizer 設定，對 <1000 本書效能足夠。若未來需要全文搜尋再遷移。

### 2. UI：搜尋模式與排序篩選模式互斥

有搜尋關鍵字時，sort/status 控制列隱藏，`BookListView` 換成 `SearchResultsView`；清空搜尋後恢復原 sort/status 狀態。

**Why**: 「搜尋 + 再篩選」的組合需要額外的 UX 決策（是否累加？順序為何？），且目前使用情境不需要。互斥設計更簡潔，實作更清楚。

### 3. Pagination：延用 cursor（`_id` 降冪），limit 10

搜尋模式下同樣使用 `after` cursor。`$regex` 搭配 `_id < after` 仍可正確篩選。

**Why**: 與現有 API 合約一致，前端 `useInfiniteScroll` 可直接複用。

### 4. Debounce 300ms

輸入框 onChange → 300ms 後才觸發 API。

**Why**: 避免每個按鍵都發 request，對使用者無感知延遲。

## Risks / Trade-offs

- `$regex` 無 index 支援 → full collection scan for `createdBy` partition。書量小（單一 admin）可接受，若未來 admin 多則需 index。
- 搜尋期間切換 sort 不生效（互斥）→ 使用者清空搜尋才能再排序，需要 UX 引導清楚。
