# Role Permission + Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow editors to share books, remove the invite-reader system, and rebuild the dashboard with role-aware BookCard, shared search across owner and editor book lists.

**Architecture:** Bottom-up: API permission → edit page → delete invite-reader files → access cleanup → dashboard component refactor → dashboard page wiring. Each task is independently committable. No new DB models; existing Share, ReadProgress, and Book models are sufficient.

**Tech Stack:** Next.js 15 App Router, Mongoose, TypeScript, Tailwind CSS. No test framework — verification is via `npm run build` (TypeScript checks) and manual browser testing against the local dev server.

---

## Task 1: share/route.ts — requireOwner → requireManager for POST + DELETE

**Files:**
- Modify: `forlove10grams/app/api/books/[bookId]/share/route.ts`

- [ ] **Step 1: Add `requireManager` after the existing `requireOwner` function**

  Open `app/api/books/[bookId]/share/route.ts`. After the closing brace of `requireOwner` (line 16), insert:

  ```typescript
  async function requireManager(
    bookId: string,
    userId: string,
  ): Promise<{ book: IBook; err: null } | { book: null; err: Response }> {
    const book = await Book.findById(bookId)
    if (!book) return { book: null, err: Response.json({ error: 'Not found' }, { status: 404 }) }
    const isOwner = book.createdBy.toString() === userId
    const isEditor = book.editorId?.toString() === userId
    if (!isOwner && !isEditor)
      return { book: null, err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
    return { book, err: null }
  }
  ```

- [ ] **Step 2: Replace `requireOwner` with `requireManager` in POST and DELETE**

  In the `POST` handler (around line 53), change:
  ```typescript
  const { book, err } = await requireOwner(bookId, session.user.id!)
  ```
  to:
  ```typescript
  const { book, err } = await requireManager(bookId, session.user.id!)
  ```

  In the `DELETE` handler (around line 79), change:
  ```typescript
  const { book, err } = await requireOwner(bookId, session.user.id!)
  ```
  to:
  ```typescript
  const { book, err } = await requireManager(bookId, session.user.id!)
  ```

  The `GET` handler keeps `requireOwner` — no change.

- [ ] **Step 3: Verify TypeScript compiles**

  Run: `cd forlove10grams && npx tsc --noEmit`
  Expected: no errors related to this file.

- [ ] **Step 4: Commit**

  ```bash
  git add forlove10grams/app/api/books/[bookId]/share/route.ts
  git commit -m "feat: allow editor to create/revoke share link"
  ```

---

## Task 2: edit/page.tsx — Open ShareButton + ShareLinkManager to editor; remove InviteLinkManager

**Files:**
- Modify: `forlove10grams/app/books/[bookId]/edit/page.tsx`

- [ ] **Step 1: Remove the `InviteLinkManager` import**

  Delete line 11:
  ```typescript
  import { InviteLinkManager } from '@/components/invite-link-manager'
  ```

- [ ] **Step 2: Open ShareButton to editor**

  Line 70, change:
  ```tsx
  {isOwner && <ShareButton bookId={bookId} />}
  ```
  to:
  ```tsx
  {(isOwner || isEditor) && <ShareButton bookId={bookId} />}
  ```

- [ ] **Step 3: Remove InviteLinkManager usage and open ShareLinkManager to editor**

  In the `<section>` block (lines 76–79), replace:
  ```tsx
  <section className="flex-none border-t border-[#2C1810]/10 bg-[#FAF7F2] px-4 sm:px-6 py-4 space-y-6">
    <InviteLinkManager bookId={bookId} />
    {isOwner && <ShareLinkManager bookId={bookId} />}
  </section>
  ```
  with:
  ```tsx
  <section className="flex-none border-t border-[#2C1810]/10 bg-[#FAF7F2] px-4 sm:px-6 py-4 space-y-6">
    {(isOwner || isEditor) && <ShareLinkManager bookId={bookId} />}
  </section>
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  Run: `cd forlove10grams && npx tsc --noEmit`
  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add forlove10grams/app/books/[bookId]/edit/page.tsx
  git commit -m "feat: editor can see ShareButton and ShareLinkManager on edit page"
  ```

---

## Task 3: Remove isBookReader from access.ts and read/page.tsx

**Files:**
- Modify: `forlove10grams/lib/access.ts`
- Modify: `forlove10grams/app/read/[bookId]/page.tsx`

Do access.ts first — `read/page.tsx` imports from it.

- [ ] **Step 1: Remove `BookReader` import and `isBookReader` function from `lib/access.ts`**

  Current file content lines 1–3:
  ```typescript
  import Share from './models/share'
  import BookReader from './models/book-reader'
  import { dbConnect } from './mongoose'
  ```
  Change to:
  ```typescript
  import Share from './models/share'
  import { dbConnect } from './mongoose'
  ```

  Then delete the entire `isBookReader` function (lines 18–22):
  ```typescript
  export async function isBookReader(userId: string, bookId: string): Promise<boolean> {
    await dbConnect()
    const exists = await BookReader.exists({ bookId, userId })
    return exists !== null
  }
  ```

  Also delete the blank line separating it from `canReadBook`.

  Final `lib/access.ts` should be:
  ```typescript
  import Share from './models/share'
  import { dbConnect } from './mongoose'
  import type { IBook } from './models/book'

  export function isManager(userId: string, book: IBook): boolean {
    return (
      book.createdBy.toString() === userId ||
      book.editorId?.toString() === userId
    )
  }

  export function canEditBook(userId: string, book: IBook, role?: string): boolean {
    if (role === 'admin') return true
    return isManager(userId, book)
  }

  export async function canReadBook(
    userId: string,
    book: IBook,
    token?: string
  ): Promise<boolean> {
    if (canEditBook(userId, book)) return true
    if (!token) return false
    const share = await Share.exists({
      bookId: book._id,
      token,
      active: true,
    })
    return share !== null
  }
  ```

- [ ] **Step 2: Update the import in `app/read/[bookId]/page.tsx`**

  Line 7, change:
  ```typescript
  import { canEditBook, isBookReader } from '@/lib/access'
  ```
  to:
  ```typescript
  import { canEditBook } from '@/lib/access'
  ```

- [ ] **Step 3: Remove `isBookReader` from the `canAccess` check**

  Lines 26–31, change:
  ```typescript
  const canAccess =
    canEditBook(userId, book) ||
    book.shareStatus === 'shared' ||
    book.shareStatus === 'public' ||
    (await isBookReader(userId, bookId))
  ```
  to:
  ```typescript
  const canAccess =
    canEditBook(userId, book) ||
    book.shareStatus === 'shared' ||
    book.shareStatus === 'public'
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  Run: `cd forlove10grams && npx tsc --noEmit`
  Expected: no errors about `isBookReader`.

- [ ] **Step 5: Commit**

  ```bash
  git add forlove10grams/lib/access.ts forlove10grams/app/read/[bookId]/page.tsx
  git commit -m "refactor: remove isBookReader — access now via shareStatus only"
  ```

---

## Task 4: Delete invite-reader system (10 files)

**Files:**
- Delete: `forlove10grams/lib/models/book-invite.ts`
- Delete: `forlove10grams/lib/models/book-reader.ts`
- Delete: `forlove10grams/app/api/books/[bookId]/invite-link/route.ts`
- Delete: `forlove10grams/app/api/books/[bookId]/readers/route.ts`
- Delete: `forlove10grams/app/api/books/[bookId]/readers/[userId]/route.ts`
- Delete: `forlove10grams/app/api/invite/[token]/route.ts`
- Delete: `forlove10grams/app/api/invite/[token]/accept/route.ts`
- Delete: `forlove10grams/app/invite/[token]/page.tsx`
- Delete: `forlove10grams/app/invite/[token]/accept-button.tsx`
- Delete: `forlove10grams/components/invite-link-manager.tsx`

> **Do NOT delete:** `app/api/books/[bookId]/invite/route.ts` (editor invite) or `components/invite-editor-button.tsx`.

- [ ] **Step 1: Delete the 10 files**

  ```bash
  rm forlove10grams/lib/models/book-invite.ts
  rm forlove10grams/lib/models/book-reader.ts
  rm forlove10grams/app/api/books/[bookId]/invite-link/route.ts
  rm forlove10grams/app/api/books/[bookId]/readers/route.ts
  rm forlove10grams/app/api/books/[bookId]/readers/[userId]/route.ts
  rm forlove10grams/app/api/invite/[token]/route.ts
  rm forlove10grams/app/api/invite/[token]/accept/route.ts
  rm forlove10grams/app/invite/[token]/page.tsx
  rm forlove10grams/app/invite/[token]/accept-button.tsx
  rm forlove10grams/components/invite-link-manager.tsx
  ```

- [ ] **Step 2: Remove now-empty directories**

  ```bash
  rmdir forlove10grams/app/api/books/[bookId]/invite-link
  rmdir forlove10grams/app/api/books/[bookId]/readers/[userId]
  rmdir forlove10grams/app/api/books/[bookId]/readers
  rmdir forlove10grams/app/api/invite/[token]/accept
  rmdir forlove10grams/app/api/invite/[token]
  rmdir forlove10grams/app/api/invite
  rmdir forlove10grams/app/invite/[token]
  rmdir forlove10grams/app/invite
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  Run: `cd forlove10grams && npx tsc --noEmit`
  Expected: no remaining references to deleted files.

- [ ] **Step 4: Commit**

  ```bash
  git add -A forlove10grams/lib/models/book-invite.ts forlove10grams/lib/models/book-reader.ts \
    "forlove10grams/app/api/books/[bookId]/invite-link" \
    "forlove10grams/app/api/books/[bookId]/readers" \
    "forlove10grams/app/api/invite" \
    "forlove10grams/app/invite" \
    forlove10grams/components/invite-link-manager.tsx
  git commit -m "chore: delete invite-reader system — share link is now the sole access mechanism"
  ```

---

## Task 5: dashboard-books-client.tsx — BookCard role prop, EditorBooksClient, DashboardShell, DashboardBooksClient search props

This task rewrites `dashboard-books-client.tsx` in full. Read the current file before starting.

**Files:**
- Modify: `forlove10grams/components/dashboard-books-client.tsx`

- [ ] **Step 1: Export a `ReaderBookItem` type**

  After the existing `DashboardBook` type export (after line 19), add:

  ```typescript
  export type ReaderBookItem = {
    _id: string
    title: string
    description: string | null
    href: string
    isFullyRead: boolean
  }
  ```

- [ ] **Step 2: Add `role` prop to `BookCard`**

  Change the `BookCard` signature from:
  ```typescript
  function BookCard({
    book,
    onTagsChanged,
  }: {
    book: DashboardBook
    onTagsChanged: (bookId: string, updatedTags: string[]) => void
  })
  ```
  to:
  ```typescript
  function BookCard({
    book,
    role = 'owner',
    onTagsChanged,
  }: {
    book: DashboardBook
    role?: 'owner' | 'editor'
    onTagsChanged: (bookId: string, updatedTags: string[]) => void
  })
  ```

- [ ] **Step 3: Change BookCard render — role='editor' gets two buttons, no editor row**

  The current card JSX (starting at `return (`) renders a `<div>` with a `<Link>` wrapping the cover + title. Replace the entire `return` block with:

  ```tsx
  return (
    <div className="rounded-xl border border-[#2C1810]/10 bg-white px-4 py-3 transition-all hover:border-[#2C1810]/25 hover:shadow-sm">
      <div className="flex items-center gap-3">
        {role === 'owner' ? (
          <Link href={`/books/${book._id}/edit`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0 h-14 w-14 overflow-hidden rounded-lg bg-[#2C1810]/5 flex items-center justify-center">
              {book.coverImage ? (
                <Image src={book.coverImage} alt="" fill className="object-cover" />
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
          </Link>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0 h-14 w-14 overflow-hidden rounded-lg bg-[#2C1810]/5 flex items-center justify-center">
              {book.coverImage ? (
                <Image src={book.coverImage} alt="" fill className="object-cover" />
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
          </div>
        )}
        <div className="shrink-0 flex items-center gap-2">
          {book.likeCount > 0 && (
            <span className="text-xs text-[#2C1810]/40">♡ {book.likeCount}</span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              book.shareStatus === 'shared'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-[#2C1810]/5 text-[#2C1810]/40'
            }`}
          >
            {book.shareStatus === 'shared' ? '已分享' : '草稿'}
          </span>
          <button
            type="button"
            onClick={() => setShowTagModal(true)}
            className="text-xs text-[#2C1810]/40 hover:text-[#2C1810]/70 transition-colors px-1"
            title="管理標籤"
          >
            ＋標籤
          </button>
          {role === 'owner' && (
            <span className="text-[#2C1810]/30">
              <PencilIcon />
            </span>
          )}
          {role === 'editor' && (
            <div className="flex gap-2 ml-4 shrink-0">
              <Link
                href={`/read/${book._id}`}
                className="text-xs border border-[#2C1810]/20 rounded-md px-2.5 py-1 text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
              >
                閱讀
              </Link>
              <Link
                href={`/books/${book._id}/edit`}
                className="text-xs border border-[#2C1810]/20 rounded-md px-2.5 py-1 text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
              >
                編輯 ✎
              </Link>
            </div>
          )}
        </div>
      </div>
      {role === 'owner' && editorName && (
        <div className="border-t border-[#2C1810]/8 mt-2 pt-2 flex items-center justify-between">
          <span className="text-xs text-[#2C1810]/55">✎ {editorName}（編輯中）</span>
          <div className="flex items-center gap-2">
            {removeError && <span className="text-xs text-red-500">{removeError}</span>}
            <button
              onClick={handleRemoveEditor}
              disabled={removeLoading}
              className="text-xs text-red-600 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {removeLoading ? '移除中…' : '移除'}
            </button>
          </div>
        </div>
      )}
      {showTagModal && (
        <TagManagerModal
          tags={book.tags}
          onAdd={handleAddTag}
          onRemove={handleRemoveTag}
          onClose={() => setShowTagModal(false)}
        />
      )}
    </div>
  )
  ```

- [ ] **Step 4: Update `DashboardBooksClient` to receive `debouncedSearch` prop instead of managing its own search state**

  Change the Props type and the component:

  ```typescript
  type Props = {
    initialBooks: DashboardBook[]
    initialHasMore: boolean
    debouncedSearch: string
  }

  export function DashboardBooksClient({ initialBooks, initialHasMore, debouncedSearch }: Props) {
    const [sort, setSort] = useState<Sort>('newest')
    const [status, setStatus] = useState<Status>('all')

    const isSearching = debouncedSearch.length > 0
    const isDefault = sort === 'newest' && status === 'all'

    const sortLabels: Record<Sort, string> = { newest: '新→舊', oldest: '舊→新', title: 'A→Z' }
    const statusLabels: Record<Status, string> = { all: '全部', published: '已分享', unpublished: '草稿' }

    return (
      <>
        {/* Sort / status controls — hidden while searching */}
        {!isSearching && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              {(['newest', 'oldest', 'title'] as Sort[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    sort === s ? 'bg-[#2C1810] text-white' : 'text-[#2C1810]/50 hover:text-[#2C1810]'
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
                    status === st ? 'bg-[#2C1810] text-white' : 'text-[#2C1810]/50 hover:text-[#2C1810]'
                  }`}
                >
                  {statusLabels[st]}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSearching ? (
          <SearchResultsView key={debouncedSearch} query={debouncedSearch} />
        ) : (
          <BookListView
            key={`${sort}-${status}`}
            sort={sort}
            status={status}
            initialBooks={isDefault ? initialBooks : []}
            initialHasMore={isDefault ? initialHasMore : sort === 'newest'}
          />
        )}
      </>
    )
  }
  ```

  The `query` state, `debouncedQuery` state, debounce `useEffect`, and the search `<input>` block are removed from this component — they now live in `DashboardShell`.

- [ ] **Step 5: Add `EditorBooksClient` export**

  After the closing brace of `DashboardBooksClient`, add:

  ```typescript
  export function EditorBooksClient({
    books,
    debouncedSearch,
  }: {
    books: DashboardBook[]
    debouncedSearch: string
  }) {
    const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})

    const handleTagsChanged = useCallback((bookId: string, tags: string[]) => {
      setTagOverrides((prev) => ({ ...prev, [bookId]: tags }))
    }, [])

    const filtered = debouncedSearch
      ? books.filter((b) => b.title.toLowerCase().includes(debouncedSearch.toLowerCase()))
      : books

    if (filtered.length === 0 && debouncedSearch) {
      return (
        <p className="py-6 text-center text-sm text-[#2C1810]/40">
          找不到符合「{debouncedSearch}」的記憶書。
        </p>
      )
    }

    return (
      <ul className="space-y-3">
        {filtered.map((book) => (
          <li key={book._id}>
            <BookCard
              book={{ ...book, tags: tagOverrides[book._id] ?? book.tags }}
              role="editor"
              onTagsChanged={handleTagsChanged}
            />
          </li>
        ))}
      </ul>
    )
  }
  ```

- [ ] **Step 6: Add `DashboardShell` export**

  After `EditorBooksClient`, add:

  ```typescript
  function ReaderList({ books }: { books: ReaderBookItem[] }) {
    return (
      <ul className="space-y-3">
        {books.map((b) => (
          <li key={b._id}>
            <Link
              href={b.href}
              className="flex items-center justify-between rounded-xl border border-[#2C1810]/10 bg-white px-5 py-4 transition-all hover:border-[#2C1810]/25 hover:shadow-sm"
            >
              <div>
                <p className="font-medium text-[#2C1810]">{b.title}</p>
                {b.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-[#2C1810]/50">{b.description}</p>
                )}
              </div>
              <span className="ml-4 text-[#2C1810]/30">
                {b.isFullyRead ? <CheckCircleIcon /> : <CircleIcon />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  export function DashboardShell({
    isAdmin,
    ownerBooks,
    ownerHasMore,
    editorBooks,
    readerBooks,
    createButton,
  }: {
    isAdmin: boolean
    ownerBooks: DashboardBook[]
    ownerHasMore: boolean
    editorBooks: DashboardBook[]
    readerBooks: ReaderBookItem[]
    createButton: React.ReactNode
  }) {
    const [query, setQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
      const timer = setTimeout(() => setDebouncedSearch(query.trim()), 300)
      return () => clearTimeout(timer)
    }, [query])

    const hasSharedContent = editorBooks.length > 0 || readerBooks.length > 0

    return (
      <div className="space-y-10">
        {/* Global search input */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋記憶書標題…"
            className="w-full rounded-lg border border-[#2C1810]/15 bg-white px-3 py-2 pr-8 text-sm text-[#2C1810] placeholder:text-[#2C1810]/30 focus:border-[#2C1810]/30 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-lg leading-none text-[#2C1810]/30 hover:text-[#2C1810]/60"
              aria-label="清除搜尋"
            >
              ×
            </button>
          )}
        </div>

        {/* Owner books section — admin only */}
        {isAdmin && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#2C1810]">謝謝你，幫我記住</h2>
              {createButton}
            </div>
            <DashboardBooksClient
              initialBooks={ownerBooks}
              initialHasMore={ownerHasMore}
              debouncedSearch={debouncedSearch}
            />
          </section>
        )}

        {/* Editor + reader books section */}
        {hasSharedContent && (
          <section>
            {!isAdmin && (
              <h2 className="mb-6 text-xl sm:text-2xl font-semibold text-[#2C1810]">謝謝你，與我回憶</h2>
            )}
            {editorBooks.length > 0 && (
              <div className={readerBooks.length > 0 ? 'mb-3' : ''}>
                <EditorBooksClient books={editorBooks} debouncedSearch={debouncedSearch} />
              </div>
            )}
            {readerBooks.length > 0 && <ReaderList books={readerBooks} />}
          </section>
        )}
      </div>
    )
  }
  ```

  Add `CheckCircleIcon` and `CircleIcon` imports at the top of the file:
  ```typescript
  import { CheckCircleIcon } from '@/components/icons/check-circle'
  import { CircleIcon } from '@/components/icons/circle'
  ```

  And add `React` to the imports if not already present (needed for `React.ReactNode`):
  ```typescript
  import React, { useState, useEffect, useCallback } from 'react'
  ```

- [ ] **Step 7: Verify TypeScript compiles**

  Run: `cd forlove10grams && npx tsc --noEmit`
  Expected: no errors.

- [ ] **Step 8: Commit**

  ```bash
  git add forlove10grams/components/dashboard-books-client.tsx
  git commit -m "feat: BookCard role prop, EditorBooksClient, DashboardShell with shared search"
  ```

---

## Task 6: dashboard/page.tsx — Wire up DashboardShell, add editor like counts

**Files:**
- Modify: `forlove10grams/app/dashboard/page.tsx`

- [ ] **Step 1: Update imports**

  Replace the current import block with:
  ```typescript
  import mongoose from 'mongoose'
  import { auth, signOut } from '@/auth'
  import { dbConnect } from '@/lib/mongoose'
  import Book, { type ShareStatus } from '@/lib/models/book'
  import ReadProgress from '@/lib/models/read-progress'
  import { CreateBookButton } from '@/components/create-book-button'
  import {
    DashboardShell,
    type DashboardBook,
    type ReaderBookItem,
  } from '@/components/dashboard-books-client'
  import { getLikeCountsByBook } from '@/lib/queries/book-like-counts'
  ```

  Removed: `Link`, `PencilIcon`, `CheckCircleIcon`, `CircleIcon` (now in `DashboardShell`).
  Removed: `DashboardBooksClient` (used internally by `DashboardShell`).

- [ ] **Step 2: Remove the `SharedBookItem` type and `SharedBookList` component**

  Delete lines 40–67 (the `SharedBookItem` type definition and entire `SharedBookList` function). The `toBook` function and `OwnerBookDoc` type stay.

- [ ] **Step 3: Add editor like counts to the data fetching**

  After the `ownerLikeCounts` block, add:
  ```typescript
  const editorLikeCounts =
    editorBooksRaw.length > 0
      ? await getLikeCountsByBook(
          editorBooksRaw.map((b) => b._id as mongoose.Types.ObjectId),
        )
      : new Map<string, number>()
  ```

- [ ] **Step 4: Build `editorBooks` with like counts and `readerBooks` as `ReaderBookItem[]`**

  Replace the current `sharedItems` construction (lines ~113–128) with:

  ```typescript
  const editorBooks: DashboardBook[] = editorBooksRaw.map((b) =>
    toBook(b, editorLikeCounts.get(b._id.toString()) ?? 0)
  )

  const readerBooks: ReaderBookItem[] = readerBooksRaw.map((b) => {
    const readCount = readCountMap.get(b._id.toString()) ?? 0
    const isFullyRead = readCount >= b.pageOrder.length
    return {
      _id: b._id.toString(),
      title: b.title,
      description: b.description ?? null,
      href: `/read/${b._id.toString()}`,
      isFullyRead,
    }
  })
  ```

- [ ] **Step 5: Update derived values**

  Replace the `totalOwnerCount` / `initialHasMore` / `hasAnyBook` block with:
  ```typescript
  const totalOwnerCount = isAdmin ? await Book.countDocuments({ createdBy: uid }) : 0
  const ownerHasMore = ownerBooks.length < totalOwnerCount
  const hasAnyBook = isAdmin || editorBooks.length > 0 || readerBooks.length > 0
  ```

- [ ] **Step 6: Replace JSX — use `DashboardShell`**

  Replace the `<div className="mx-auto max-w-3xl ...">` contents with:

  ```tsx
  <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10">
    {hasAnyBook ? (
      <DashboardShell
        isAdmin={isAdmin}
        ownerBooks={ownerBooks}
        ownerHasMore={ownerHasMore}
        editorBooks={editorBooks}
        readerBooks={readerBooks}
        createButton={<CreateBookButton />}
      />
    ) : (
      <p className="py-20 text-center text-sm text-[#2C1810]/40">
        尚未有任何相關的記憶書。
      </p>
    )}
  </div>
  ```

- [ ] **Step 7: Verify TypeScript compiles**

  Run: `cd forlove10grams && npx tsc --noEmit`
  Expected: zero errors.

- [ ] **Step 8: Manual smoke test in browser**

  Start dev server: `npm run dev` (run in `forlove10grams/`)

  Verify as admin:
  - Dashboard shows search input, `謝謝你，幫我記住` section with owner books
  - Editor books (if any) appear below with 閱讀/編輯 buttons, no full-card link
  - Typing in search filters both owner books (via API) and editor books (client-side)
  - Clearing search restores both lists

  Verify as editor user:
  - Dashboard shows `謝謝你，與我回憶` with editor books (two buttons each)
  - Search filters editor books

  Verify edit page as editor:
  - ShareButton and ShareLinkManager are visible
  - InviteLinkManager is gone
  - InviteEditorButton is NOT visible (owner-only)

  Verify read page:
  - Book with `shareStatus='private'` is inaccessible to non-editors
  - Book with `shareStatus='shared'` is accessible to logged-in users

- [ ] **Step 9: Commit**

  ```bash
  git add forlove10grams/app/dashboard/page.tsx
  git commit -m "feat: wire up DashboardShell — shared search, editor like counts, remove SharedBookList"
  ```
