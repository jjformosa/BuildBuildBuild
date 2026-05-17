# Dashboard Cover Image + Sort/Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display book cover images on dashboard cards and add sort (newest/oldest/title) and status-filter (all/shared/draft) controls.

**Architecture:** Three-layer change — API adds `coverImage`/`published` fields and `status` filter param; server component passes new fields through `toBook()`; client component gains a `BookCard` sub-component and a `BookListView` that remounts on sort/status change (using React `key`) so `useInfiniteScroll` resets cleanly. Non-newest sorts fetch all books in one request (limit=200) and sort client-side; the default newest-first path keeps cursor-based infinite scroll.

**Tech Stack:** Next.js 16 App Router · React 19 · MongoDB/Mongoose · TypeScript · Tailwind CSS · `useInfiniteScroll` hook (`hooks/use-infinite-scroll.ts`)

> **Note:** This project has no test framework. TypeScript compilation (`npx tsc --noEmit`) is the correctness gate. Manual browser verification is specified at each integration point.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| ✅ Modified | `app/api/books/route.ts` | `GET`: select `coverImage published`, add `status` filter, max limit 200 |
| ✅ Modified | `app/dashboard/page.tsx` | `toBook()` returns `coverImage` and `published` |
| Modify | `components/dashboard-books-client.tsx` | Updated type, `BookCard`, `BookListView`, sort/filter controls |

---

## Task 1: Verify Already-Completed Changes ✅

**Files:**
- Check: `app/api/books/route.ts`
- Check: `app/dashboard/page.tsx`

- [ ] **Step 1.1: Confirm API selects the right fields**

  Open `app/api/books/route.ts`. Verify the `GET` handler matches this exactly:

  ```ts
  const limit = Math.min(Number(searchParams.get('limit') ?? '10'), 200)
  const status = searchParams.get('status')
  // ...
  if (status === 'published') query.published = true
  if (status === 'unpublished') query.published = { $ne: true }

  const books = await Book.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .select('_id title description coverImage published')
    .lean()

  return Response.json(
    books.map((b) => ({
      _id: b._id.toString(),
      title: b.title,
      description: b.description ?? null,
      coverImage: b.coverImage ?? null,
      published: b.published ?? false,
    }))
  )
  ```

  If not matching, apply the diff now before continuing.

- [ ] **Step 1.2: Confirm toBook() in dashboard/page.tsx**

  Open `app/dashboard/page.tsx`. Verify `toBook()` matches:

  ```ts
  function toBook(b: { _id: mongoose.Types.ObjectId; title: string; description?: string; coverImage?: string; published?: boolean }): DashboardBook {
    return {
      _id: b._id.toString(),
      title: b.title,
      description: b.description ?? null,
      coverImage: b.coverImage ?? null,
      published: b.published ?? false,
    }
  }
  ```

- [ ] **Step 1.3: Run TypeScript check**

  ```bash
  cd forlove10grams && npx tsc --noEmit
  ```

  Expected: errors about `DashboardBook` missing `coverImage`/`published` properties — these will be resolved in Task 2.

---

## Task 2: Update DashboardBook Type and BookCard Component

**Files:**
- Modify: `components/dashboard-books-client.tsx`

Replace the entire file with the new implementation. The full replacement is given in steps 2.1–2.3 for clarity.

- [ ] **Step 2.1: Replace the file contents**

  Replace `components/dashboard-books-client.tsx` with:

  ```tsx
  'use client'

  import Link from 'next/link'
  import { useState, useEffect, useCallback } from 'react'
  import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
  import { PencilIcon } from '@/components/icons/pencil'

  export type DashboardBook = {
    _id: string
    title: string
    description: string | null
    coverImage: string | null
    published: boolean
  }

  type Sort = 'newest' | 'oldest' | 'title'
  type Status = 'all' | 'published' | 'unpublished'

  function BookCard({ book }: { book: DashboardBook }) {
    const initial = book.title.charAt(0)
    return (
      <Link
        href={`/books/${book._id}/edit`}
        className="flex items-center gap-3 rounded-xl border border-[#2C1810]/10 bg-white px-4 py-3 transition-all hover:border-[#2C1810]/25 hover:shadow-sm"
      >
        <div className="shrink-0 h-14 w-14 overflow-hidden rounded-lg bg-[#2C1810]/5 flex items-center justify-center">
          {book.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-[#2C1810]/25">{initial}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#2C1810] truncate">{book.title}</p>
          {book.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-[#2C1810]/50">{book.description}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              book.published
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-[#2C1810]/5 text-[#2C1810]/40'
            }`}
          >
            {book.published ? '已分享' : '草稿'}
          </span>
          <span className="text-[#2C1810]/30">
            <PencilIcon />
          </span>
        </div>
      </Link>
    )
  }

  // Remounts via key prop when sort/status changes — ensures useInfiniteScroll resets cleanly.
  function BookListView({
    sort,
    status,
    initialBooks,
    initialHasMore,
  }: {
    sort: Sort
    status: Status
    initialBooks: DashboardBook[]
    initialHasMore: boolean
  }) {
    const isNewest = sort === 'newest'

    // For oldest/title: fetch all once and sort client-side.
    // null = use scroll items; [] = loading; [...] = fetched
    const [filteredBooks, setFilteredBooks] = useState<DashboardBook[] | null>(
      isNewest ? null : []
    )
    const [isFiltering, setIsFiltering] = useState(!isNewest)

    useEffect(() => {
      if (isNewest) return
      setIsFiltering(true)
      const params = new URLSearchParams({ limit: '200' })
      if (status !== 'all') params.set('status', status)
      fetch(`/api/books?${params}`)
        .then((r) => r.json())
        .then((books: DashboardBook[]) => {
          if (sort === 'oldest') books.reverse()
          if (sort === 'title') books.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'))
          setFilteredBooks(books)
        })
        .finally(() => setIsFiltering(false))
    }, []) // intentionally empty — component remounts on sort/status change via key prop

    const fetchMore = useCallback(async (cursor: string): Promise<DashboardBook[]> => {
      const params = new URLSearchParams({ limit: '10' })
      if (cursor) params.set('after', cursor)
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/books?${params}`)
      if (!res.ok) return []
      return res.json()
    }, []) // intentionally empty — component remounts on sort/status change via key prop

    const getCursor = useCallback((book: DashboardBook) => book._id, [])

    const { items: scrollItems, sentinelRef, isLoading } = useInfiniteScroll<DashboardBook>({
      initialItems: initialBooks,
      fetchMore,
      getCursor,
      initialHasMore,
    })

    const displayBooks = filteredBooks ?? scrollItems
    const showLoading = isFiltering || (!filteredBooks && isLoading)

    if (displayBooks.length === 0 && !showLoading) {
      return (
        <p className="py-20 text-center text-sm text-[#2C1810]/40">
          {isNewest && status === 'all'
            ? '還沒有記憶書，點「+ 新增記憶書」開始建立。'
            : '沒有符合條件的記憶書。'}
        </p>
      )
    }

    return (
      <>
        <ul className="space-y-3">
          {displayBooks.map((book) => (
            <li key={book._id}>
              <BookCard book={book} />
            </li>
          ))}
        </ul>

        {isNewest && <div ref={sentinelRef} className="h-10" aria-hidden />}

        {showLoading && (
          <p className="py-4 text-center text-sm text-[#2C1810]/40">載入中…</p>
        )}
      </>
    )
  }

  type Props = {
    initialBooks: DashboardBook[]
    initialHasMore: boolean
  }

  export function DashboardBooksClient({ initialBooks, initialHasMore }: Props) {
    const [sort, setSort] = useState<Sort>('newest')
    const [status, setStatus] = useState<Status>('all')

    const isDefault = sort === 'newest' && status === 'all'

    const sortLabels: Record<Sort, string> = { newest: '新→舊', oldest: '舊→新', title: 'A→Z' }
    const statusLabels: Record<Status, string> = { all: '全部', published: '已分享', unpublished: '草稿' }

    return (
      <>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-sm">
            {(['newest', 'oldest', 'title'] as Sort[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  sort === s
                    ? 'bg-[#2C1810] text-white'
                    : 'text-[#2C1810]/50 hover:text-[#2C1810]'
                }`}
              >
                {sortLabels[s]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 text-sm">
            {(['all', 'published', 'unpublished'] as Status[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  status === st
                    ? 'bg-[#2C1810] text-white'
                    : 'text-[#2C1810]/50 hover:text-[#2C1810]'
                }`}
              >
                {statusLabels[st]}
              </button>
            ))}
          </div>
        </div>

        <BookListView
          key={`${sort}-${status}`}
          sort={sort}
          status={status}
          initialBooks={isDefault ? initialBooks : []}
          initialHasMore={isDefault ? initialHasMore : true}
        />
      </>
    )
  }
  ```

- [ ] **Step 2.2: Run TypeScript check**

  ```bash
  cd forlove10grams && npx tsc --noEmit
  ```

  Expected: no errors. The `DashboardBook` type now matches what `toBook()` returns and what the API sends.

- [ ] **Step 2.3: Commit**

  ```bash
  git add app/api/books/route.ts app/dashboard/page.tsx components/dashboard-books-client.tsx
  git commit -m "feat: dashboard cover image, sort, and status filter"
  ```

---

## Task 3: Manual Verification

- [ ] **Step 3.1: Start dev server**

  ```bash
  cd forlove10grams && npm run dev
  ```

- [ ] **Step 3.2: Verify cover image display**

  1. Log in as admin and go to `/dashboard`
  2. A book that has a cover image → card shows a 56×56 thumbnail on the left
  3. A book without a cover image → card shows a grey box with the first letter of the title

- [ ] **Step 3.3: Verify status badge**

  1. A book where you have previously clicked "Share" (published=true) → green「已分享」badge
  2. A book never shared (published=false) → muted「草稿」badge

- [ ] **Step 3.4: Verify status filter**

  1. Click「已分享」→ only shared books appear; list resets (not paginated from before)
  2. Click「草稿」→ only draft books appear
  3. Click「全部」→ all books appear again
  4. If there are no matching books, the message「沒有符合條件的記憶書。」appears

- [ ] **Step 3.5: Verify sort**

  1. Click「舊→新」→ list resets and shows oldest books first
  2. Click「A→Z」→ list resets and shows books in title alphabetical order
  3. Click「新→舊」→ returns to default newest-first with infinite scroll

- [ ] **Step 3.6: Verify infinite scroll (default view only)**

  1. With sort=「新→舊」and filter=「全部」(the default), scroll to the bottom
  2. If there are more than 10 books, the next batch loads automatically
  3. Switch to「舊→新」and back to「新→舊」→ list resets and scroll works again from the top
