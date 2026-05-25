'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { PencilIcon } from '@/components/icons/pencil'
import { CheckCircleIcon } from '@/components/icons/check-circle'
import { CircleIcon } from '@/components/icons/circle'
import TagManagerModal from '@/components/tag-manager-modal'
import { createRipple } from '@/lib/ripple'

export type DashboardBook = {
  _id: string
  title: string
  description: string | null
  coverImage: string | null
  shareStatus: 'private' | 'shared' | 'public'
  tags: string[]
  likeCount: number
  editorName: string | null
}

export type ReaderBookItem = {
  _id: string
  title: string
  description: string | null
  href: string
  isFullyRead: boolean
}

type Sort = 'newest' | 'oldest' | 'title'
type Status = 'all' | 'published' | 'unpublished'

function BookCard({
  book,
  role = 'owner',
  onTagsChanged,
}: {
  book: DashboardBook
  role?: 'owner' | 'editor'
  onTagsChanged: (bookId: string, updatedTags: string[]) => void
}) {
  const [showTagModal, setShowTagModal] = useState(false)
  const initial = book.title.charAt(0)

  const handleAddTag = async (tag: string) => {
    const res = await fetch(`/api/books/${book._id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tag }),
    })
    if (res.ok) {
      const data = await res.json()
      onTagsChanged(book._id, data.tags)
    }
  }

  const handleRemoveTag = async (tag: string) => {
    const res = await fetch(`/api/books/${book._id}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      const data = await res.json()
      onTagsChanged(book._id, data.tags)
    }
  }

  const [editorName, setEditorName] = useState(book.editorName)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState('')

  async function handleRemoveEditor() {
    setRemoveLoading(true)
    setRemoveError('')
    try {
      const res = await fetch(`/api/books/${book._id}/editor`, { method: 'DELETE' })
      if (!res.ok) throw new Error('移除失敗')
      setEditorName(null)
    } catch {
      setRemoveError('移除失敗')
    } finally {
      setRemoveLoading(false)
    }
  }

  const coverAndTitle = (
    <>
      <div className="relative shrink-0 h-14 w-14 overflow-hidden rounded-lg bg-foreground/5 flex items-center justify-center">
        {book.coverImage ? (
          <Image src={book.coverImage} alt="" fill className="object-cover" />
        ) : (
          <span className="text-xl font-semibold text-foreground/25">{initial}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground line-clamp-2 md:line-clamp-none md:truncate">{book.title}</p>
        {book.description && (
          <p className="mt-0.5 line-clamp-1 text-sm text-foreground/50">{book.description}</p>
        )}
      </div>
    </>
  )

  return (
    <div className="rounded-xl border border-foreground/10 bg-white px-4 py-3 transition-all hover:border-foreground/25 hover:shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3">
        {role === 'owner' ? (
          <Link href={`/books/${book._id}/edit`} className="flex items-center gap-3 flex-1 min-w-0">
            {coverAndTitle}
          </Link>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {coverAndTitle}
          </div>
        )}
        <div className="w-full md:w-auto md:shrink-0 flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-foreground/8 md:mt-0 md:pt-0 md:border-t-0">
          {book.likeCount > 0 && (
            <span className="text-xs text-foreground/40">♡ {book.likeCount}</span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              book.shareStatus === 'shared' || book.shareStatus === 'public'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-foreground/5 text-foreground/40'
            }`}
          >
            {book.shareStatus === 'public' ? '公開' : book.shareStatus === 'shared' ? '已分享' : '草稿'}
          </span>
          <button
            type="button"
            onClick={(e) => { createRipple(e); setShowTagModal(true) }}
            className="relative overflow-hidden rounded text-xs text-foreground/40 hover:text-foreground/70 transition-colors px-1"
            title="管理標籤"
          >
            ＋標籤
          </button>
          {role === 'owner' && (
            <span className="text-foreground/30">
              <PencilIcon />
            </span>
          )}
          {role === 'editor' && (
            <div className="flex gap-2 md:ml-4">
              <Link
                href={`/read/${book._id}`}
                className="relative overflow-hidden text-xs border border-foreground/20 rounded-md px-2.5 py-1 text-foreground hover:bg-foreground/5 transition-colors"
                onClick={createRipple}
              >
                閱讀
              </Link>
              <Link
                href={`/books/${book._id}/edit`}
                className="relative overflow-hidden text-xs border border-foreground/20 rounded-md px-2.5 py-1 text-foreground hover:bg-foreground/5 transition-colors"
                onClick={createRipple}
              >
                編輯 ✎
              </Link>
            </div>
          )}
        </div>
      </div>
      {role === 'owner' && editorName && (
        <div className="border-t border-foreground/8 mt-2 pt-2 flex items-center justify-between">
          <span className="text-xs text-foreground/55">✎ {editorName}（編輯中）</span>
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
}

// Remounts via key prop when query changes — ensures useInfiniteScroll resets cleanly.
function SearchResultsView({ query }: { query: string }) {
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})

  const fetchMore = useCallback(async (cursor: string): Promise<DashboardBook[]> => {
    const params = new URLSearchParams({ q: query, limit: '10' })
    if (cursor) params.set('after', cursor)
    const res = await fetch(`/api/books?${params}`)
    if (!res.ok) return []
    return res.json()
  }, []) // intentionally empty — component remounts on query change via key prop

  const getCursor = useCallback((book: DashboardBook) => book._id, [])

  const { items, sentinelRef, isLoading, hasMore } = useInfiniteScroll<DashboardBook>({
    initialItems: [],
    fetchMore,
    getCursor,
    initialHasMore: true,
  })

  const handleTagsChanged = useCallback((bookId: string, updatedTags: string[]) => {
    setTagOverrides((prev) => ({ ...prev, [bookId]: updatedTags }))
  }, [])

  // Suppress empty state while first fetch hasn't fired yet (sentinel not yet observed).
  const stillLoading = hasMore && items.length === 0
  const showLoading = isLoading || stillLoading

  if (items.length === 0 && !showLoading) {
    return (
      <p className="py-20 text-center text-sm text-foreground/40">
        找不到符合「{query}」的記憶書。
      </p>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((book) => (
          <li key={book._id}>
            <BookCard
              book={{ ...book, tags: tagOverrides[book._id] ?? book.tags }}
              onTagsChanged={handleTagsChanged}
            />
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} className="h-10" aria-hidden />
      {showLoading && (
        <p className="py-4 text-center text-sm text-foreground/40">載入中…</p>
      )}
    </>
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
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})

  const handleTagsChanged = useCallback((bookId: string, updatedTags: string[]) => {
    setTagOverrides((prev) => ({ ...prev, [bookId]: updatedTags }))
  }, [])

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
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      })
      .then((books: DashboardBook[]) => {
        if (sort === 'oldest') books.reverse()
        if (sort === 'title') books.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'))
        setFilteredBooks(books)
      })
      .catch(() => setFilteredBooks([]))
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

  const { items: scrollItems, sentinelRef, isLoading, hasMore } = useInfiniteScroll<DashboardBook>({
    initialItems: initialBooks,
    fetchMore,
    getCursor,
    initialHasMore,
  })

  const displayBooks = filteredBooks ?? scrollItems
  // When newest mode starts with empty initialBooks (e.g. filtered status), hasMore=true but
  // the sentinel hasn't triggered yet — treat as still-loading so we don't early-return and
  // accidentally skip rendering the sentinel that kicks off the first fetch.
  const stillLoading = isNewest && hasMore && scrollItems.length === 0
  const showLoading = isFiltering || (!filteredBooks && isLoading) || stillLoading

  if (displayBooks.length === 0 && !showLoading) {
    return (
      <p className="py-20 text-center text-sm text-foreground/40">
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
            <BookCard
              book={{ ...book, tags: tagOverrides[book._id] ?? book.tags }}
              onTagsChanged={handleTagsChanged}
            />
          </li>
        ))}
      </ul>

      {isNewest && <div ref={sentinelRef} className="h-10" aria-hidden />}

      {showLoading && (
        <p className="py-4 text-center text-sm text-foreground/40">載入中…</p>
      )}
    </>
  )
}

type Props = {
  initialBooks: DashboardBook[]
  initialHasMore: boolean
  debouncedSearch?: string
}

export function DashboardBooksClient({ initialBooks, initialHasMore, debouncedSearch = '' }: Props) {
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
                className={`rounded-md px-2.5 py-1 transition-[color,background-color,transform] duration-150 active:scale-95 ${
                  sort === s ? 'bg-primary text-white' : 'text-foreground/50 hover:text-foreground'
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
                className={`rounded-md px-2.5 py-1 transition-[color,background-color,transform] duration-150 active:scale-95 ${
                  status === st ? 'bg-primary text-white' : 'text-foreground/50 hover:text-foreground'
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
      <p className="py-6 text-center text-sm text-foreground/40">
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

function ReaderList({ books }: { books: ReaderBookItem[] }) {
  return (
    <ul className="space-y-3">
      {books.map((b) => (
        <li key={b._id}>
          <Link
            href={b.href}
            className="flex items-center justify-between rounded-xl border border-foreground/10 bg-white px-5 py-4 transition-all hover:border-foreground/25 hover:shadow-sm"
          >
            <div>
              <p className="font-medium text-foreground">{b.title}</p>
              {b.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-foreground/50">{b.description}</p>
              )}
            </div>
            <span className="ml-4 text-foreground/30">
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
      <form onSubmit={(e) => { e.preventDefault(); setDebouncedSearch(query.trim()) }}>
        <div className="relative">
          <button
            type="submit"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
            aria-label="搜尋"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋記憶書標題…"
            className="w-full rounded-lg border border-foreground/15 bg-white pl-8 py-2 pr-8 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-lg leading-none text-foreground/30 hover:text-foreground/60"
              aria-label="清除搜尋"
            >
              ×
            </button>
          )}
        </div>
      </form>

      {/* Owner books section — admin only */}
      {isAdmin && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">謝謝你，幫我記住</h2>
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
            <h2 className="mb-6 text-xl sm:text-2xl font-semibold text-foreground">謝謝你，與我回憶</h2>
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
