'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { PencilIcon } from '@/components/icons/pencil'
import TagManagerModal from '@/components/tag-manager-modal'

export type DashboardBook = {
  _id: string
  title: string
  description: string | null
  coverImage: string | null
  published: boolean
  tags: string[]
}

type Sort = 'newest' | 'oldest' | 'title'
type Status = 'all' | 'published' | 'unpublished'

function BookCard({
  book,
  onTagsChanged,
}: {
  book: DashboardBook
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

  return (
    <div className="rounded-xl border border-[#2C1810]/10 bg-white px-4 py-3 transition-all hover:border-[#2C1810]/25 hover:shadow-sm">
      <div className="flex items-center gap-3">
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
        <div className="shrink-0 flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              book.published
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-[#2C1810]/5 text-[#2C1810]/40'
            }`}
          >
            {book.published ? '已分享' : '草稿'}
          </span>
          <button
            type="button"
            onClick={() => setShowTagModal(true)}
            className="text-xs text-[#2C1810]/40 hover:text-[#2C1810]/70 transition-colors px-1"
            title="管理標籤"
          >
            ＋標籤
          </button>
          <span className="text-[#2C1810]/30">
            <PencilIcon />
          </span>
        </div>
      </div>
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
      <p className="py-20 text-center text-sm text-[#2C1810]/40">
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
        <p className="py-4 text-center text-sm text-[#2C1810]/40">載入中…</p>
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
            <BookCard
              book={{ ...book, tags: tagOverrides[book._id] ?? book.tags }}
              onTagsChanged={handleTagsChanged}
            />
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
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const isSearching = debouncedQuery.length > 0
  const isDefault = sort === 'newest' && status === 'all'

  const sortLabels: Record<Sort, string> = { newest: '新→舊', oldest: '舊→新', title: 'A→Z' }
  const statusLabels: Record<Status, string> = { all: '全部', published: '已分享', unpublished: '草稿' }

  return (
    <>
      {/* Search input */}
      <div className="mb-4 relative">
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

      {/* Sort / status controls — hidden while searching */}
      {!isSearching && (
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
      )}

      {isSearching ? (
        <SearchResultsView key={debouncedQuery} query={debouncedQuery} />
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
