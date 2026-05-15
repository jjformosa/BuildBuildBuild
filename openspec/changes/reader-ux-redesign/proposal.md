## Why

The read page renders all pages as a continuous scrolling list with minimal visual separation, making it hard for readers to feel the rhythm of turning pages. Short pages don't trigger scroll, TOC highlighting is absent, and there's no "there's more below" affordance. The current experience reads more like a long article than a curated photo book.

## What Changes

- **Lazy loading**: Pages are loaded incrementally as the reader scrolls, not all at once on SSR. First batch is server-rendered; subsequent batches are fetched client-side via a new paginated API.
- **Increased page spacing**: Each page article gets a larger `min-height` (≥75vh) and more vertical padding, creating a clear visual cadence between pages.
- **Decorative page separator**: A `· · ·` element is inserted between each pair of pages — no page numbers, minimal styling, consistent with the warm Film Diary aesthetic.
- **TOC active-page highlight**: The TOC item for the page currently occupying the most viewport space is highlighted with a distinct indicator (►), giving desktop readers a real-time reading position.
- **Reusable infinite scroll**: The scroll-to-load mechanism is extracted as a generic `useInfiniteScroll` hook, usable by other pages (dashboard book list, editor page list, etc.).

## Capabilities

### New Capabilities

- `infinite-scroll`: Generic `useInfiniteScroll` hook + optional sentinel component for scroll-triggered data fetching. Reusable across the app.
- `page-separator`: Decorative `· · ·` separator rendered between page articles on the read page.
- `toc-active-page`: IntersectionObserver-based tracking of the currently visible page, surfaced as a highlight in the desktop TOC.

### Modified Capabilities

<!-- No existing spec-level requirements are changing -->

## Impact

- **New API**: `GET /api/books/[bookId]/pages` — paginated read endpoint (cursor-based, `?after=<pageId>&limit=5`).
- **Modified files**: `read-page-client.tsx`, `toc.tsx`, `hooks/use-read-progress.ts` (or new `hooks/use-active-page.ts`).
- **New files**: `hooks/use-infinite-scroll.ts`.
- **SSR change**: `app/read/[bookId]/page.tsx` switches from loading all pages to loading first batch only.
- **No breaking changes** to existing data models or APIs.
