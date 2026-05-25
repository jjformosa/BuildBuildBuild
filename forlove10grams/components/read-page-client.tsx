'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { Toc, type TocPage } from '@/components/toc'
import { Carousel } from '@/components/carousel'
import { VideoPlayer } from '@/components/video-player'
import { useReadProgress } from '@/hooks/use-read-progress'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { useActivePage } from '@/hooks/use-active-page'
import { resolveSlots } from '@/lib/resolve-slots'
import { HandoverLetter } from '@/components/handover-letter'
import Image from 'next/image'
import logo from '@/public/logo.png'

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
      className="flex flex-col items-center gap-3 text-foreground/50 hover:text-gold transition-colors disabled:opacity-40"
    >
      <span className="text-4xl leading-none">{liked ? '❤️' : '🤍'}</span>
      <span className="text-xs tracking-wide">
        {liked ? '謝謝你喜歡這本書' : '謝謝你讀完了'}
      </span>
    </button>
  )
}

export function ReadPageClient({ bookId, bookTitle, initialPages, totalCount, viewerNickname, viewerMyNickname, hasLiked, isEditor, editorLetter, creatorName }: Props) {
  const scrollContainerRef = useRef<HTMLElement>(null)

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

  const loadedIdSet = useMemo(() => new Set(pageIds), [pageIds])

  const handleJumpTo = useCallback(
    async (pageId: string) => {
      await jumpTo(pageId, (id) => loadedIdSet.has(id))
    },
    [jumpTo, loadedIdSet]
  )

  const tocPages: TocPage[] = pages.map((p, i) => ({
    _id: p._id,
    type: p.type,
    content: resolveSlots(p.content, viewerNickname, viewerMyNickname),
    index: i,
  }))

  return (
    <div className="flex h-screen bg-background">
      <Toc
        pages={tocPages}
        readPageIds={readPageIds}
        activePageId={activePageId}
        onJumpTo={handleJumpTo}
      />

      <main ref={scrollContainerRef} id="read-scroll-container" className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
          <header className="mb-10 sm:mb-12 text-center flex flex-col items-center gap-3">
            <Image src={logo} alt="" aria-hidden width={48} height={48} className="opacity-80" />
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  viewport={{ root: scrollContainerRef, once: true, amount: 0.1 }}
                >
                  {page.mediaUrls.length > 0 &&
                    (page.type === 'carousel' ? (
                      <Carousel urls={page.mediaUrls} />
                    ) : (
                      <VideoPlayer url={page.mediaUrls[0]} transcodingStatus={page.transcodingStatus} />
                    ))}

                  {page.content && (
                    <div className="mt-6 text-sm leading-relaxed text-foreground/80 [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/20 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:mb-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-medium [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
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

          {hasMore && (
            <div ref={sentinelRef} className="h-20" aria-hidden />
          )}

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
    </div>
  )
}
