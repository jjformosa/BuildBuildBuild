'use client'

import { useState } from 'react'

export type TocPage = {
  _id: string
  type: 'carousel' | 'video'
  content: string
  index: number
}

type Props = {
  pages: TocPage[]
  readPageIds: string[]
  activePageId?: string | null
  onJumpTo?: (pageId: string) => Promise<void>
}

export function Toc({ pages, readPageIds, activePageId, onJumpTo }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [jumpingTo, setJumpingTo] = useState<string | null>(null)
  const readSet = new Set(readPageIds)

  async function scrollTo(pageId: string) {
    const el = document.getElementById(pageId)
    if (!el && onJumpTo) {
      // Page not yet loaded — trigger jump-load then scroll
      setJumpingTo(pageId)
      try {
        await onJumpTo(pageId)
      } finally {
        setJumpingTo(null)
      }
      // After loading, element should exist
      const loaded = document.getElementById(pageId)
      if (loaded) {
        const container = document.getElementById('read-scroll-container')
        if (container) {
          const delta = loaded.getBoundingClientRect().top - container.getBoundingClientRect().top - 32
          container.scrollBy({ top: delta, behavior: 'smooth' })
        }
      }
      setMobileOpen(false)
      return
    }
    if (!el) return
    const container = document.getElementById('read-scroll-container')
    if (container) {
      const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top - 32
      container.scrollBy({ top: delta, behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setMobileOpen(false)
  }

  function pageIcon(page: TocPage, isRead: boolean, isActive: boolean, isJumping: boolean, forDesktop: boolean) {
    if (isJumping) return <span className="text-[#2C1810]/40 text-[10px] animate-spin">◌</span>
    if (forDesktop && isActive) {
      return (
        <span className="text-[#2C1810] text-[10px] font-bold">►</span>
      )
    }
    return (
      <span
        className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[9px] transition-colors ${
          isRead
            ? 'border-[#2C1810]/50 bg-[#2C1810]/50 text-white'
            : 'border-[#2C1810]/20 text-[#2C1810]/30'
        }`}
      >
        {isRead ? '✓' : page.index + 1}
      </span>
    )
  }

  function buildPageList(forDesktop: boolean) {
    return (
      <ul className="space-y-0.5">
        {pages.map((page) => {
          const isRead = readSet.has(page._id)
          const isActive = forDesktop && activePageId === page._id
          const isJumping = jumpingTo === page._id
          const firstLine = page.content.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 38)
          const label = firstLine || `第 ${page.index + 1} 頁`
          return (
            <li key={page._id}>
              <button
                onClick={() => scrollTo(page._id)}
                disabled={isJumping}
                className={`group w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-[#2C1810]/5 ${
                  isActive ? 'bg-[#2C1810]/5' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {pageIcon(page, isRead, isActive, isJumping, forDesktop)}
                  <span
                    className={`truncate text-xs transition-colors ${
                      isActive
                        ? 'text-[#2C1810]/90 font-medium'
                        : 'text-[#2C1810]/55 group-hover:text-[#2C1810]/80'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <>
      {/* Desktop sidebar — acts as a flex child in the parent layout */}
      <aside className="hidden md:flex w-56 flex-none flex-col border-r border-[#2C1810]/10">
        <div className="flex-none border-b border-[#2C1810]/10 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[#2C1810]/40">
            目錄
          </span>
          <span className="ml-2 text-xs text-[#2C1810]/30">
            {readPageIds.length}/{pages.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-1">{buildPageList(true)}</div>
      </aside>

      {/* Mobile: floating button + bottom-sheet */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-6 right-6 z-30 rounded-full bg-[#2C1810] px-4 py-2 text-xs font-medium text-white shadow-lg"
        >
          目錄
        </button>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[72vh] overflow-y-auto rounded-t-2xl bg-[#FAF7F2] pb-8">
              <div className="sticky top-0 border-b border-[#2C1810]/10 bg-[#FAF7F2] px-4 pb-3 pt-3">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#2C1810]/20" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#2C1810]">目錄</span>
                  <span className="text-xs text-[#2C1810]/40">
                    {readPageIds.length}/{pages.length} 已讀
                  </span>
                </div>
              </div>
              <div className="p-4">{buildPageList(false)}</div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
