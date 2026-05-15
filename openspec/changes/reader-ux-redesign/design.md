## Context

The read page (`/read/[bookId]`) currently fetches all pages in a single SSR call via `Page.find({ bookId })` and passes them as props to `ReadPageClient`. Pages render as `motion.article` elements separated by `space-y-20`. There is no visual page break, no active-page tracking, and no incremental loading.

Three independent improvements are bundled because they share a motivation (pagination feel) and a common data source (the page list), and implementing them together avoids re-visiting the same files separately.

## Goals / Non-Goals

**Goals:**
- Pages load incrementally (first batch SSR, rest on scroll) to reduce initial payload
- Each page occupies at least 75vh on desktop, 65vh on mobile, ensuring scroll always exists
- A `· · ·` separator between pages creates visual breathing room without page numbers
- Desktop TOC highlights the page currently occupying the most viewport space
- The infinite-scroll mechanism is a reusable hook, not tightly coupled to the read page

**Non-Goals:**
- Virtualizing the DOM (removing off-screen pages from the tree) — page count is small enough
- Mobile TOC changes — bottom sheet stays as-is; spacing + separator carry the pagination feel
- Changing the data model (Page schema, Book schema)
- Prefetching or caching beyond what Next.js already provides

## Decisions

### Cursor-based pagination for the new GET endpoint

**Decision**: `GET /api/books/[bookId]/pages?after=<pageId>&limit=5`

Using cursor (last page ID) rather than offset avoids skipping or duplicating pages if the server-side `pageOrder` array changes during a reading session. Offset (`?page=2`) would be fragile if pages are reordered in another tab.

Alternatives considered:
- **Offset pagination** (`?skip=10&limit=5`): simpler, but prone to drift if order changes.
- **Load all on SSR + reveal with IntersectionObserver**: no API needed, but still sends full payload; doesn't solve the real lazy-load goal.

### SSR delivers first 5 pages; client fetches the rest

**Decision**: Server renders pages `0..4`. Client detects when the sentinel enters the viewport and fetches the next batch.

First 5 pages cover the above-the-fold content and the first few scrolls. Keeping SSR for them avoids a loading flash on initial render.

The `app/read/[bookId]/page.tsx` server component passes `initialPages` (first 5) and `totalCount` to `ReadPageClient`. `ReadPageClient` uses `useInfiniteScroll` to append subsequent batches.

### Separate `useActivePage` hook (not extending `useReadProgress`)

**Decision**: Create `hooks/use-active-page.ts` independently of `useReadProgress`.

`useReadProgress` has one job: mark pages as read (threshold: 0.5, fires once). `useActivePage` has a different job: continuously track which page is most centred in the viewport (rootMargin: "-35% 0px -35% 0px", fires repeatedly). Merging them would create a hook with two distinct observer lifecycles and two pieces of state — harder to reason about and harder to reuse.

### TOC shows only loaded pages

**Decision**: The TOC receives the same `pages[]` array that `ReadPageClient` maintains. It grows as new batches are appended — no placeholder items for unloaded pages.

Alternatives considered:
- **Show all pages from a metadata count**: requires fetching page metadata (IDs + labels) separately on mount, adding a request and complexity. Not worth it for a use case where most books are short.

### Page separator: `· · ·`, no page numbers

**Decision**: A centered `<div>` with three middle-dot characters (`·&nbsp;·&nbsp;·`) rendered between each pair of `motion.article` elements. Color `#2C1810` at 30% opacity, small tracking. No page number, no date.

Rationale: page numbers break the contemplative mood; dates are not in the current data model. The dots read as a natural pause — familiar from books and long-form editorial.

### Layout: `min-h-[65vh] sm:min-h-[75vh]` + `py-16 sm:py-20`

**Decision**: Each `motion.article` gets `min-h-[65vh] sm:min-h-[75vh]`. The outer list changes from `space-y-20` to individual wrappers so the separator `<div>` can sit between them without inheriting the gap class.

65vh on small screens (iPhone SE: ~667px → ~433px min) leaves roughly 234px for the separator to peek, which is sufficient. 75vh on desktop feels more page-like without requiring the user to scroll past half the screen to see new content.

## Risks / Trade-offs

- **IntersectionObserver count**: Three observers will run concurrently (`useReadProgress` + `useActivePage` + `useInfiniteScroll` sentinel). On a 50-page book this is ~102 observed elements. Performance is acceptable; the browser coalesces callbacks.
- **Cursor stability**: The cursor is a MongoDB ObjectId. If a page is deleted mid-session, the `after=<id>` query returns no results (empty array), which the hook treats as "no more pages" — the reader simply won't see new pages added after their session started. Acceptable trade-off.
- **SSR / client hydration mismatch**: Server renders 5 pages; client starts with 5 and appends more. React's hydration is fine here because the initial HTML and the initial client state match.

## Open Questions

- Resolved: separator = `· · ·`, no numbers.
- Resolved: min-height = 65vh mobile / 75vh desktop.
- Resolved: TOC shows only loaded pages (grows as user scrolls).
- **Unresolved**: Should `limit` per batch be 5 or 10? 5 is conservative; 10 reduces round-trips on longer books. Default to 5 for now; easy to tune.
