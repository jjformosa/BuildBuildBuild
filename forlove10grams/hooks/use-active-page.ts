'use client'

import { useState, useEffect, type RefObject } from 'react'

export function useActivePage(
  scrollContainerRef: RefObject<HTMLElement | null>,
  pageIds: string[]
): string | null {
  const [activePageId, setActivePageId] = useState<string | null>(null)

  useEffect(() => {
    if (pageIds.length === 0) return
    const root = scrollContainerRef.current
    if (!root) return

    const ratios = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.intersectionRatio)
        })
        // Pick the page with the highest intersection ratio
        let best: string | null = null
        let bestRatio = 0
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id
          }
        })
        if (best !== null) setActivePageId(best)
      },
      { root, rootMargin: '-35% 0px -35% 0px', threshold: Array.from({ length: 21 }, (_, i) => i / 20) }
    )

    pageIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [scrollContainerRef, pageIds])

  return activePageId
}
