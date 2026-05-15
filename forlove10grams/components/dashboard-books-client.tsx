'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'

export type DashboardBook = {
  _id: string
  title: string
  description: string | null
}

type Props = {
  initialBooks: DashboardBook[]
  initialHasMore: boolean
}

export function DashboardBooksClient({ initialBooks, initialHasMore }: Props) {
  const fetchMore = useCallback(async (cursor: string): Promise<DashboardBook[]> => {
    const params = new URLSearchParams({ limit: '10' })
    if (cursor) params.set('after', cursor)
    const res = await fetch(`/api/books?${params}`)
    if (!res.ok) return []
    return res.json()
  }, [])

  const getCursor = useCallback((book: DashboardBook) => book._id, [])

  const { items: books, sentinelRef, isLoading } = useInfiniteScroll<DashboardBook>({
    initialItems: initialBooks,
    fetchMore,
    getCursor,
    initialHasMore,
  })

  if (books.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-[#2C1810]/40">
        還沒有記憶書，點「+ 新增記憶書」開始建立。
      </p>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {books.map((book) => (
          <li key={book._id}>
            <Link
              href={`/books/${book._id}/edit`}
              className="flex items-center justify-between rounded-xl border border-[#2C1810]/10 bg-white px-5 py-4 transition-all hover:border-[#2C1810]/25 hover:shadow-sm"
            >
              <div>
                <p className="font-medium text-[#2C1810]">{book.title}</p>
                {book.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-[#2C1810]/50">
                    {book.description}
                  </p>
                )}
              </div>
              <span className="ml-4 text-xs text-[#2C1810]/30">編輯 →</span>
            </Link>
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="h-10" aria-hidden />

      {isLoading && (
        <p className="py-4 text-center text-sm text-[#2C1810]/40">載入中…</p>
      )}
    </>
  )
}
