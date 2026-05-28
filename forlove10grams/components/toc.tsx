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
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export function Toc({ pages, readPageIds, activePageId, onJumpTo, mobileOpen: externalOpen, onMobileOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [jumpingTo, setJumpingTo] = useState<string | null>(null)
  const readSet = new Set(readPageIds)

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (onMobileOpenChange) onMobileOpenChange(v)
    else setInternalOpen(v)
  }

  async function scrollTo(pageId: string) {
    const el = document.getElementById(pageId)
    if (!el && onJumpTo) {
      setJumpingTo(pageId)
      try {
        await onJumpTo(pageId)
      } finally {
        setJumpingTo(null)
      }
      const loaded = document.getElementById(pageId)
      if (loaded) {
        const container = document.getElementById('read-scroll-container')
        if (container) {
          const delta = loaded.getBoundingClientRect().top - container.getBoundingClientRect().top - 32
          container.scrollBy({ top: delta, behavior: 'smooth' })
        }
      }
      setOpen(false)
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
    setOpen(false)
  }

  function pageIcon(page: TocPage, isRead: boolean, isActive: boolean, isJumping: boolean, forDesktop: boolean) {
    if (isJumping) return <span className="text-muted-foreground text-[10px] animate-spin">◌</span>
    if (forDesktop && isActive) {
      return <span className="text-primary text-[10px] font-bold">►</span>
    }
    return (
      <span
        className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[9px] transition-colors ${
          isRead
            ? 'border-primary/60 bg-primary/60 text-white'
            : 'border-border text-muted-foreground'
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
                className={`group w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted cursor-pointer ${
                  isActive ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {pageIcon(page, isRead, isActive, isJumping, forDesktop)}
                  <span
                    className={`truncate text-xs transition-colors ${
                      isActive
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground group-hover:text-foreground'
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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-none flex-col border-r border-border">
        <div className="flex-none border-b border-border px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            目錄
          </span>
          <span className="ml-2 text-xs text-muted-foreground/70">
            {readPageIds.length}/{pages.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-1">{buildPageList(true)}</div>
      </aside>

      {/* Mobile bottom sheet (triggered externally via mobileOpen prop) */}
      {isOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[72vh] overflow-y-auto rounded-t-2xl bg-background pb-8">
            <div className="sticky top-0 border-b border-border bg-background px-4 pb-3 pt-3">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">目錄</span>
                <span className="text-xs text-muted-foreground">
                  {readPageIds.length}/{pages.length} 已讀
                </span>
              </div>
            </div>
            <div className="p-4">{buildPageList(false)}</div>
          </div>
        </div>
      )}
    </>
  )
}
