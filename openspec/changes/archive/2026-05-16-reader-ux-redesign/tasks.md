## 1. Paginated API endpoint

- [x] 1.1 Add `GET /api/books/[bookId]/pages` handler that accepts `?after=<pageId>&limit=<n>` and returns the next batch of pages in `pageOrder` order
- [x] 1.2 Enforce authentication and read-access check (same as existing POST handler)
- [x] 1.3 Return empty array when `after` is the last page ID

## 2. Infinite scroll hook

- [x] 2.1 Create `hooks/use-infinite-scroll.ts` with signature `useInfiniteScroll<T>({ initialItems, fetchMore, hasMore })` returning `{ items, sentinelRef, isLoading }`
- [x] 2.2 Attach an IntersectionObserver to `sentinelRef`; call `fetchMore` when sentinel enters viewport and no fetch is in progress
- [x] 2.3 Set `hasMore = false` when `fetchMore` resolves with an empty array

## 3. Page layout: min-height + spacing

- [x] 3.1 Replace `space-y-20` wrapper with a list where each page is wrapped individually (needed to insert separator between items)
- [x] 3.2 Add `min-h-[65vh] sm:min-h-[75vh]` and `py-12 sm:py-16` to each `motion.article`

## 4. Page separator

- [x] 4.1 Add a `<div>` between each pair of page articles rendering `· · ·` centered, `#2C1810` at 30% opacity, small letter-spacing
- [x] 4.2 Ensure no separator appears after the last page

## 5. Active page hook

- [x] 5.1 Create `hooks/use-active-page.ts` accepting `scrollContainerRef` and `pageIds[]`, returning `activePageId: string | null`
- [x] 5.2 Use IntersectionObserver with `root: scrollContainerRef.current` and `rootMargin: "-35% 0px -35% 0px"` to detect the centred page
- [x] 5.3 When multiple pages intersect, return the ID with the highest `intersectionRatio`

## 6. TOC active-page highlight

- [x] 6.1 Add `activePageId?: string` prop to `Toc` component
- [x] 6.2 Render ► indicator on the active TOC item; apply stronger text color (distinct from read ● state)
- [x] 6.3 Ensure active highlight only appears in the desktop sidebar (not the mobile bottom sheet)

## 7. Wire up in ReadPageClient

- [x] 7.1 Update `app/read/[bookId]/page.tsx` to pass only the first 5 pages as `initialPages` and `totalCount` as a separate prop
- [x] 7.2 In `ReadPageClient`, replace the static `pages` prop usage with `useInfiniteScroll` (initial = first 5, fetch = GET endpoint)
- [x] 7.3 Pass `scrollContainerRef` and current `items` IDs to `useActivePage`; pass `activePageId` to `<Toc>`
- [x] 7.4 Render sentinel `<div ref={sentinelRef}>` after the last page article; hide it when `!hasMore`

## 8. Editor limits

- [x] 8.1 In `BookEditorClient`, block `handleAddPage` when `pages.length >= 30`; show inline alert "已達頁數上限（30 頁）" near the add-page buttons
- [x] 8.2 In `MediaUploader`, block upload when `mediaUrls.length >= 15` (carousel only); show inline alert "已達圖片上限（15 張）" near the upload button
