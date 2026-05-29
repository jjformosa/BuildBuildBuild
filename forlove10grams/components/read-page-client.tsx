'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { signOut } from 'next-auth/react'
import { Toc, type TocPage } from '@/components/toc'
import { Carousel } from '@/components/carousel'
import { VideoPlayer } from '@/components/video-player'
import { useReadProgress } from '@/hooks/use-read-progress'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { useActivePage } from '@/hooks/use-active-page'
import { resolveSlots } from '@/lib/resolve-slots'
import { HandoverLetter } from '@/components/handover-letter'

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => null,
})

export type ReadPageData = {
  _id: string
  type: 'carousel' | 'video'
  content: string
  mediaUrls: string[]
  transcodingStatus?: 'pending' | 'processing' | 'ready' | 'error' | null
}

type Props = {
  bookId: string
  bookTitle: string
  initialPages: ReadPageData[]
  totalCount: number
  viewerNickname: string | null
  viewerMyNickname: string | null
  hasLiked: boolean
  isEditor?: boolean
  editorLetter?: string | null
  creatorName?: string | null
}

function TocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="15" y2="12"/>
      <line x1="3" y1="18" x2="18" y2="18"/>
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function LikeButton({ bookId, initialHasLiked }: { bookId: string; initialHasLiked: boolean }) {
  const [liked, setLiked] = useState(initialHasLiked)
  const [pending, setPending] = useState(false)

  const toggle = async () => {
    if (pending) return
    const next = !liked
    setLiked(next)
    setPending(true)
    try {
      const res = await fetch(`/api/books/${bookId}/like`, { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      const data: { liked: boolean } = await res.json()
      setLiked(data.liked)
    } catch {
      setLiked(!next)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex flex-col items-center gap-3 text-foreground/50 hover:text-gold transition-colors disabled:opacity-40 cursor-pointer"
    >
      <span className="text-4xl leading-none">{liked ? '❤️' : '🤍'}</span>
      <span className="text-xs tracking-wide">
        {liked ? '謝謝你喜歡這本書' : '謝謝你讀完了'}
      </span>
    </button>
  )
}

export function ReadPageClient({
  bookId, bookTitle, initialPages, totalCount,
  viewerNickname, viewerMyNickname, hasLiked, isEditor, editorLetter, creatorName,
}: Props) {
  const scrollContainerRef = useRef<HTMLElement>(null)

  // ── Infinite scroll ──────────────────────────────────────────────────────────
  const fetchMore = useCallback(
    async (cursor: string): Promise<ReadPageData[]> => {
      const params = new URLSearchParams({ limit: '5' })
      if (cursor) params.set('after', cursor)
      const res = await fetch(`/api/books/${bookId}/pages?${params}`)
      if (!res.ok) return []
      return res.json()
    },
    [bookId]
  )
  const getCursor = useCallback((page: ReadPageData) => page._id, [])
  const { items: pages, sentinelRef, hasMore, jumpTo } = useInfiniteScroll<ReadPageData>({
    initialItems: initialPages,
    fetchMore,
    getCursor,
    initialHasMore: initialPages.length < totalCount,
  })

  const pageIds = useMemo(() => pages.map((p) => p._id), [pages])
  const readPageIds = useReadProgress(bookId, pageIds)
  const activePageId = useActivePage(scrollContainerRef, pageIds)

  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const markSeen = useCallback((id: string) => {
    setSeenIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const loadedIdSet = useMemo(() => new Set(pageIds), [pageIds])
  const handleJumpTo = useCallback(
    async (pageId: string) => { await jumpTo(pageId, (id) => loadedIdSet.has(id)) },
    [jumpTo, loadedIdSet]
  )

  const tocPages: TocPage[] = pages.map((p, i) => ({
    _id: p._id,
    type: p.type,
    content: resolveSlots(p.content, viewerNickname, viewerMyNickname),
    index: i,
  }))

  // ── Mobile header state ───────────────────────────────────────────────────────
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)
  const lastScrollYRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect scrollability (re-check when pages load)
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const check = () => setIsScrollable(el.scrollHeight > el.clientHeight + 4)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    setIsScrollable(el.scrollHeight > el.clientHeight + 4)
  }, [pages])

  // Scroll-aware header: hide on down, show on up, restore after 2s idle
  useEffect(() => {
    if (!isScrollable) {
      setHeaderHidden(false)
      return
    }
    const el = scrollContainerRef.current
    if (!el) return

    const onScroll = () => {
      const y = el.scrollTop
      const delta = y - lastScrollYRef.current
      if (delta > 6) setHeaderHidden(true)
      else if (delta < -6) setHeaderHidden(false)
      lastScrollYRef.current = y

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => setHeaderHidden(false), 2000)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [isScrollable])

  async function handleExit() {
    setShowExitConfirm(false)
    await signOut({ callbackUrl: '/login' })
  }

  const currentPageIndex = activePageId ? pageIds.indexOf(activePageId) : 0
  const currentPageNum = Math.max(1, currentPageIndex + 1)
  const readCount = readPageIds.length

  return (
    <div className="flex h-dvh bg-background">
      <Toc
        pages={tocPages}
        readPageIds={readPageIds}
        activePageId={activePageId}
        onJumpTo={handleJumpTo}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      <main ref={scrollContainerRef} id="read-scroll-container" className="flex-1 overflow-y-auto">

        {/* ── Mobile sticky header (md:hidden) ─────────────────────────────── */}
        <div
          className={`md:hidden sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-sm transition-transform duration-200 ease-out ${
            headerHidden ? '-translate-y-full' : 'translate-y-0'
          }`}
        >
          <div className="relative flex h-11 items-center px-1">
            {/* Left: TOC icon + page number + read progress */}
            <div className="flex items-center gap-1.5 pl-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="目錄"
              >
                <TocIcon />
              </button>
              <span className="text-xs font-semibold text-foreground tabular-nums leading-none">
                {currentPageNum}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums leading-none">
                {readCount}/{totalCount}
              </span>
            </div>

            {/* Center: book title — absolutely positioned for true centering */}
            <p className="pointer-events-none absolute inset-x-0 mx-auto max-w-[46%] truncate text-center text-sm font-medium text-foreground">
              {bookTitle}
            </p>

            {/* Right: exit/logout button */}
            <button
              onClick={() => setShowExitConfirm(true)}
              className="ml-auto flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="離開並登出"
            >
              <LogOutIcon />
            </button>
          </div>
        </div>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10 pb-16">
          <header className="mb-10 sm:mb-12 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {bookTitle}
            </h1>
          </header>

          <div>
            {pages.map((page, index) => (
              <div key={page._id}>
                <motion.article
                  id={page._id}
                  className="scroll-mt-8 min-h-[65vh] sm:min-h-[75vh] py-12 sm:py-16"
                  initial={{ opacity: 0, y: 20, scale: 1 }}
                  animate={seenIds.has(page._id)
                    ? {
                        opacity: activePageId === page._id ? 1 : 0.28,
                        y: 0,
                        scale: activePageId === page._id ? 1 : 0.975,
                      }
                    : undefined}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{ transformOrigin: 'center top' }}
                  onViewportEnter={() => markSeen(page._id)}
                  viewport={{ root: scrollContainerRef, once: true, amount: 0.1 }}
                >
                  {page.mediaUrls.length > 0 && (
                    <div className="-mx-4 sm:mx-0">
                      {page.type === 'carousel' ? (
                        <Carousel urls={page.mediaUrls} />
                      ) : (
                        <VideoPlayer url={page.mediaUrls[0]} transcodingStatus={page.transcodingStatus} />
                      )}
                    </div>
                  )}

                  {page.content && (
                    <div className="mt-6 text-sm leading-relaxed text-foreground/85 [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/20 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:mb-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-medium [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {resolveSlots(page.content, viewerNickname, viewerMyNickname)}
                      </ReactMarkdown>
                    </div>
                  )}
                </motion.article>

                {index < pages.length - 1 && (
                  <div aria-hidden className="flex items-center justify-center gap-2 py-8">
                    <span className="block h-1 w-1 rounded-full bg-gold/50" />
                    <span className="block h-1 w-1 rounded-full bg-gold/50" />
                    <span className="block h-1 w-1 rounded-full bg-gold/50" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasMore && <div ref={sentinelRef} className="h-20" aria-hidden />}

          {!hasMore && pages.length > 0 && (
            <div className="mt-16 mb-12 flex justify-center">
              <LikeButton bookId={bookId} initialHasLiked={hasLiked} />
            </div>
          )}

          {!hasMore && isEditor && editorLetter && creatorName && (
            <HandoverLetter
              isEditor={isEditor}
              editorLetter={editorLetter}
              creatorName={creatorName}
              bookId={bookId}
            />
          )}
        </div>
      </main>

      {/* ── Exit confirmation bottom sheet ───────────────────────────────────── */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
            <p className="text-base font-semibold text-foreground">離開並登出</p>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">將會登出帳號並前往登入頁面。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="btn-outline-sm flex-1 justify-center py-2.5"
              >
                取消
              </button>
              <button
                onClick={handleExit}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                確認登出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
