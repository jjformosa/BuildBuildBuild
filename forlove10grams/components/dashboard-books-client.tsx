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

function HeartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M12 7v4" />
      <path d="M7 21h10a3 3 0 0 0 3-3v-4a8 8 0 0 0-16 0v4a3 3 0 0 0 3 3Z" />
      <path d="M9 16a3 3 0 0 0 6 0" />
    </svg>
  )
}

function formatGramCount(count: number) {
  return count >= 10 ? '10g+' : `${count}g`
}

function StatusBadge({ status }: { status: DashboardBook['shareStatus'] }) {
  if (status === 'public') {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-primary/12 text-primary font-medium">
        公開
      </span>
    )
  }
  if (status === 'shared') {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-rose/12 text-rose font-medium">
        已分享
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      草稿
    </span>
  )
}

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

  const coverImage = (
    <div className="relative shrink-0 h-14 w-14 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-rose/10 flex items-center justify-center">
      {book.coverImage ? (
        <Image src={book.coverImage} alt="" fill className="object-cover" />
      ) : (
        <span className="text-xl font-semibold text-primary/35">{initial}</span>
      )}
    </div>
  )

  const titleBlock = (
    <div className="flex-1 min-w-0 pt-0.5">
      <p className="font-semibold text-foreground leading-snug line-clamp-2 md:line-clamp-none md:truncate">
        {book.title}
      </p>
      {book.description && (
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{book.description}</p>
      )}
    </div>
  )

  return (
    <div className="group rounded-xl border border-border bg-card px-4 py-3.5 transition-all duration-200 hover:border-primary/30 hover:shadow-[0_2px_16px_rgba(44,94,119,0.10)]">
      {/* Top row: cover + title + actions */}
      <div className="flex items-start gap-3">
        {role === 'owner' ? (
          <Link href={`/books/${book._id}/edit`} className="flex items-start gap-3 flex-1 min-w-0">
            {coverImage}
            {titleBlock}
          </Link>
        ) : (
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {coverImage}
            {titleBlock}
          </div>
        )}

        {/* Desktop-only action icons */}
        {role === 'owner' && (
          <span className="hidden md:flex shrink-0 mt-1 text-muted-foreground/60 group-hover:text-primary/60 transition-colors">
            <PencilIcon />
          </span>
        )}
        {role === 'editor' && (
          <div className="hidden md:flex shrink-0 gap-2 mt-0.5">
            <Link
              href={`/read/${book._id}`}
              className="relative overflow-hidden text-xs border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              onClick={createRipple}
            >
              閱讀
            </Link>
            <Link
              href={`/books/${book._id}/edit`}
              className="relative overflow-hidden text-xs bg-primary/8 border border-primary/20 rounded-lg px-2.5 py-1.5 text-primary hover:bg-primary/14 transition-colors"
              onClick={createRipple}
            >
              編輯
            </Link>
          </div>
        )}
      </div>

      {/* Bottom metadata row */}
      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {book.likeCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HeartIcon /> 心意 {formatGramCount(book.likeCount)}
          </span>
        )}
        <StatusBadge status={book.shareStatus} />
        <button
          type="button"
          onClick={(e) => { createRipple(e); setShowTagModal(true) }}
          className="relative overflow-hidden rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors px-1.5 py-0.5 cursor-pointer"
          title="管理標籤"
        >
          + 標籤
        </button>

        {/* Mobile editor actions */}
        {role === 'editor' && (
          <div className="flex md:hidden gap-2 ml-auto">
            <Link
              href={`/read/${book._id}`}
              className="text-xs border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              閱讀
            </Link>
            <Link
              href={`/books/${book._id}/edit`}
              className="text-xs bg-primary/8 border border-primary/20 rounded-lg px-2.5 py-1.5 text-primary hover:bg-primary/14 transition-colors"
            >
              編輯
            </Link>
          </div>
        )}
      </div>

      {/* Editor info row (owner view) */}
      {role === 'owner' && editorName && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="text-primary/60"><PencilIcon /></span>
            {editorName} 編輯中
          </span>
          <div className="flex items-center gap-2">
            {removeError && <span className="text-xs text-destructive">{removeError}</span>}
            <button
              onClick={handleRemoveEditor}
              disabled={removeLoading}
              className="btn-danger-xs"
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

function SearchResultsView({ query }: { query: string }) {
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})

  const fetchMore = useCallback(async (cursor: string): Promise<DashboardBook[]> => {
    const params = new URLSearchParams({ q: query, limit: '10' })
    if (cursor) params.set('after', cursor)
    const res = await fetch(`/api/books?${params}`)
    if (!res.ok) return []
    return res.json()
  }, [])

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

  const stillLoading = hasMore && items.length === 0
  const showLoading = isLoading || stillLoading

  if (items.length === 0 && !showLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">找不到符合「{query}」的記憶書。</p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-2.5">
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
        <p className="py-4 text-center text-sm text-muted-foreground">載入中…</p>
      )}
    </>
  )
}

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
  }, [])

  const fetchMore = useCallback(async (cursor: string): Promise<DashboardBook[]> => {
    const params = new URLSearchParams({ limit: '10' })
    if (cursor) params.set('after', cursor)
    if (status !== 'all') params.set('status', status)
    const res = await fetch(`/api/books?${params}`)
    if (!res.ok) return []
    return res.json()
  }, [])

  const getCursor = useCallback((book: DashboardBook) => book._id, [])

  const { items: scrollItems, sentinelRef, isLoading, hasMore } = useInfiniteScroll<DashboardBook>({
    initialItems: initialBooks,
    fetchMore,
    getCursor,
    initialHasMore,
  })

  const displayBooks = filteredBooks ?? scrollItems
  const stillLoading = isNewest && hasMore && scrollItems.length === 0
  const showLoading = isFiltering || (!filteredBooks && isLoading) || stillLoading

  if (displayBooks.length === 0 && !showLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {isNewest && status === 'all'
            ? '還沒有記憶書，點「+ 新增記憶書」開始建立。'
            : '沒有符合條件的記憶書。'}
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-2.5">
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
        <p className="py-4 text-center text-sm text-muted-foreground">載入中…</p>
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
      {!isSearching && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {(['newest', 'oldest', 'title'] as Sort[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 cursor-pointer ${
                  sort === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {sortLabels[s]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {(['all', 'published', 'unpublished'] as Status[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 cursor-pointer ${
                  status === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">找不到符合「{debouncedSearch}」的記憶書。</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2.5">
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
    <ul className="space-y-2.5">
      {books.map((b) => (
        <li key={b._id}>
          <Link
            href={b.href}
            className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 transition-all duration-200 hover:border-primary/30 hover:shadow-[0_2px_16px_rgba(44,94,119,0.10)]"
          >
            <div className="min-w-0">
              <p className="font-semibold text-foreground leading-snug">{b.title}</p>
              {b.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{b.description}</p>
              )}
            </div>
            <span className={`ml-4 shrink-0 transition-colors ${b.isFullyRead ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`}>
              {b.isFullyRead ? <CheckCircleIcon /> : <CircleIcon />}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function SectionHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-rose shrink-0" aria-hidden />
      <h2 className="text-lg sm:text-xl font-semibold text-foreground">{children}</h2>
    </div>
  )
}

export function DashboardShell({
  isAdmin,
  ownerBooks,
  ownerHasMore,
  editorBooks,
  readerBooks,
  createButton,
  quickCapture,
}: {
  isAdmin: boolean
  ownerBooks: DashboardBook[]
  ownerHasMore: boolean
  editorBooks: DashboardBook[]
  readerBooks: ReaderBookItem[]
  createButton: React.ReactNode
  quickCapture?: React.ReactNode
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
      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setDebouncedSearch(query.trim()) }}>
        <div className="relative">
          <button
            type="submit"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="搜尋"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋記憶書標題…"
            className="w-full rounded-xl border border-border bg-card pl-9 py-2.5 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="清除搜尋"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </form>

      {quickCapture && <div className="-mt-4">{quickCapture}</div>}

      {/* Admin: owner books */}
      {isAdmin && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <SectionHeading>謝謝你，幫我記住</SectionHeading>
            {createButton}
          </div>
          <DashboardBooksClient
            initialBooks={ownerBooks}
            initialHasMore={ownerHasMore}
            debouncedSearch={debouncedSearch}
          />
        </section>
      )}

      {/* Editor + reader books */}
      {hasSharedContent && (
        <section>
          {!isAdmin && (
            <SectionHeading className="mb-5">謝謝你，與我回憶</SectionHeading>
          )}
          {isAdmin && editorBooks.length > 0 && (
            <SectionHeading className="mb-5">協作中的記憶書</SectionHeading>
          )}
          {editorBooks.length > 0 && (
            <div className={readerBooks.length > 0 ? 'mb-3' : ''}>
              <EditorBooksClient books={editorBooks} debouncedSearch={debouncedSearch} />
            </div>
          )}
          {readerBooks.length > 0 && (
            <>
              {(isAdmin || editorBooks.length > 0) && (
                <SectionHeading className="mt-8 mb-5">閱讀過的記憶書</SectionHeading>
              )}
              <ReaderList books={readerBooks} />
            </>
          )}
        </section>
      )}
    </div>
  )
}
