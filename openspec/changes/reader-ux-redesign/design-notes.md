# Reader UX Redesign — Design Notes

Generated from explore session on 2026-05-16.
This doc captures decisions made before implementation begins.

---

## Problem

The current read page (`/read/[bookId]`) renders all pages as vertically stacked
`motion.article` elements with `space-y-20` (80px) gaps. The problems:

1. **No pagination feel** — gaps look like paragraph spacing, not page breaks.
2. **Short pages have no scroll trigger** — if a page has just one line of text,
   all pages may fit in the viewport at once. IntersectionObserver never fires.
   TOC "current page" highlighting (not yet implemented) would be useless.
3. **No visual cue that more pages exist** — a user could mistake the whole book
   for a single long article.

---

## Decided Solution: 3-part combination

### 1. `min-height: 70vh` on each page article

Force every page to occupy at least 70% of the viewport height.
- Short pages (one photo + one sentence) are padded with whitespace.
- Long pages (many paragraphs) grow naturally beyond 70vh — `min-height`, not `height`.
- Guarantees scrolling always exists, making IntersectionObserver reliable.
- Chosen value: `70vh` (not 100vh) so the top of the next page's separator
  peeks into view — acting as a visual affordance ("there's more below").

```
Viewport (100vh)
┌──────────────────────────────┐
│  [Page N content]            │
│  Image + text                │
│                              │
│  (whitespace padding)        │
│                              │
│  ─── 第 N+1 頁 ───           │ ← separator peeks at bottom
└──────────────────────────────┘
```

### 2. Visual page separator between articles (Direction A)

Replace the plain `space-y-20` gap with a dedicated separator element
rendered between each pair of pages.

Proposed style (Film Diary aesthetic, warm palette):

```
   ──────────────────── 3 ────────────────────
```

- Thin horizontal rules flanking a page number.
- Color: `#2C1810` at low opacity (~20–30%) to stay subtle.
- Font: small, uppercase or light tracking.
- Future extension: if `Page` model gets an optional `date` field,
  show the date instead of / alongside the number.

Implementation note: render this as a separate `<div>` between articles,
NOT inside the article itself. Keep article semantics clean.

### 3. TOC active-page highlighting (Direction D)

The existing TOC shows read/unread state. Add a "currently viewing" highlight
that updates as the user scrolls.

- Use IntersectionObserver (or the existing `useReadProgress` pattern)
  to detect which page occupies the most viewport space.
- Highlight that page in the TOC with a slightly stronger color or bold label.
- This works because `min-height: 70vh` guarantees at most ~1–2 pages
  are in the viewport at any time, making the "current page" unambiguous.

TOC item states (3 states now instead of 2):
```
○  4   未讀、不在視窗內
►  5   當前頁（正在看）   ← new state
●  3   已讀
```

---

## What Does NOT Change

- Data fetching: all pages still loaded via SSR, passed as props.
  Page count is small enough that incremental loading is unnecessary.
- Scroll container: still `main#read-scroll-container` with `overflow-y-auto`.
  TOC `scrollBy` logic stays the same.
- Framer Motion fade-in: `whileInView` + `viewport={{ root: scrollContainerRef }}`
  continues to work correctly with `min-height`.
- Mobile TOC bottom sheet: unchanged.

---

## Files Expected to Change

| File | Change |
|------|--------|
| `components/read-page-client.tsx` | Add `min-h-[70vh]` to `motion.article`; render separator between pages |
| `components/toc.tsx` | Add "active page" prop + highlight style |
| `hooks/use-read-progress.ts` | May need to expose "current page" separately, or add new hook |

Separator could be an inline element in `read-page-client.tsx` or extracted
to a small `PageSeparator` component — decide during implementation.

---

## Open Questions (decide before / during implementation)

1. **Separator content**: page number only, or room for future `date` field?
   Recommendation: number now, design the markup to accept an optional subtitle line.

2. **TOC active highlight**: track via IntersectionObserver root in the scroll container
   with `rootMargin: "-40% 0px -40% 0px"` (middle 20% of viewport = "current").
   Confirm this threshold feels right on mobile vs desktop.

3. **`min-height` on mobile**: 70vh may feel different on short mobile screens
   (some phones are ~667px tall). May want `min-h-[65vh] sm:min-h-[70vh]`.
