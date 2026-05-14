'use client'

import { useState, useEffect, useRef } from 'react'

export function useReadProgress(bookId: string, pageIds: string[]) {
  const [readPageIds, setReadPageIds] = useState<string[]>([])
  // Tracks all marked IDs to deduplicate and support rollback
  const markedRef = useRef<Set<string>>(new Set())

  // Load existing progress from server on mount
  useEffect(() => {
    if (!bookId) return
    fetch(`/api/progress?bookId=${encodeURIComponent(bookId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.readPageIds) return
        ;(data.readPageIds as string[]).forEach((id) => markedRef.current.add(id))
        setReadPageIds(Array.from(markedRef.current))
      })
      .catch(() => {})
  }, [bookId])

  // Observe each page article entering viewport at ≥50%
  useEffect(() => {
    if (pageIds.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const pageId = entry.target.id
          if (!pageId || markedRef.current.has(pageId)) return

          // Optimistic update
          markedRef.current.add(pageId)
          setReadPageIds(Array.from(markedRef.current))

          // Persist; rollback on failure
          fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, pageId }),
          }).catch(() => {
            markedRef.current.delete(pageId)
            setReadPageIds(Array.from(markedRef.current))
          })
        })
      },
      { threshold: 0.5 }
    )

    pageIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [bookId, pageIds])

  return readPageIds
}
