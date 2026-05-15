'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Options<T> = {
  initialItems: T[]
  fetchMore: (cursor: string) => Promise<T[]>
  getCursor: (item: T) => string
  initialHasMore: boolean
}

export function useInfiniteScroll<T>({
  initialItems,
  fetchMore,
  getCursor,
  initialHasMore,
}: Options<T>) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFetchingRef = useRef(false)

  const load = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return
    isFetchingRef.current = true
    setIsLoading(true)
    try {
      const cursor = items.length > 0 ? getCursor(items[items.length - 1]) : ''
      const next = await fetchMore(cursor)
      if (next.length === 0) {
        setHasMore(false)
      } else {
        setItems((prev) => [...prev, ...next])
      }
    } finally {
      isFetchingRef.current = false
      setIsLoading(false)
    }
  }, [items, hasMore, fetchMore, getCursor])

  // Expose load for imperative jump-to-page calls
  const jumpTo = useCallback(
    async (targetId: string, isLoaded: (id: string) => boolean) => {
      while (!isLoaded(targetId) && hasMore && !isFetchingRef.current) {
        await load()
        // Small yield so state updates before next check
        await new Promise((r) => setTimeout(r, 50))
      }
    },
    [load, hasMore]
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) load()
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [load])

  return { items, sentinelRef, isLoading, hasMore, jumpTo }
}
