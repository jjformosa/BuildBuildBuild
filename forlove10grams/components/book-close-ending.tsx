'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { LikeButton } from '@/components/like-button'
import { HandoverLetter } from '@/components/handover-letter'
import { MessageComposer } from '@/components/message-composer'

const CLOSE_DURATION_MS = 1100
const HOLD_MS = 700
const REOPEN_DELAY_MS = 150
const CARD_DELAY_MS = 1300

type Phase = 'idle' | 'closing' | 'opened'

export function BookCloseEnding({
  bookId,
  lastPageId,
  scrollContainerRef,
  hasLiked,
  likeCount,
  isEditor,
  editorLetter,
  creatorName,
  canMessage,
  initialMessage,
  messageCreatorName,
  messageEditorName,
}: {
  bookId: string
  lastPageId: string
  scrollContainerRef: RefObject<HTMLElement | null>
  hasLiked: boolean
  likeCount: number
  isEditor?: boolean
  editorLetter?: string | null
  creatorName?: string | null
  canMessage?: boolean
  initialMessage?: string | null
  messageCreatorName?: string
  messageEditorName?: string | null
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const playedRef = useRef(false)

  useEffect(() => {
    const root = scrollContainerRef.current
    const target = document.getElementById(lastPageId)
    if (!root || !target) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !playedRef.current) {
            playedRef.current = true
            setPhase('closing')
            setTimeout(() => setPhase('opened'), CLOSE_DURATION_MS + HOLD_MS)
          }
        })
      },
      { root, threshold: 0.7 }
    )
    io.observe(target)
    return () => io.disconnect()
  }, [lastPageId, scrollContainerRef])

  const closed = phase === 'closing'
  const coverTransition = `transform ${CLOSE_DURATION_MS}ms cubic-bezier(0.65, 0, 0.35, 1)${
    phase === 'opened' ? ` ${REOPEN_DELAY_MS}ms` : ''
  }`

  return (
    <div className="relative mt-6 flex min-h-[clamp(430px,62vh,600px)] items-center justify-center overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 aspect-[433/370] w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 pointer-events-none [filter:drop-shadow(0_18px_30px_rgba(45,56,72,0.14))]"
        style={{ zIndex: 5 }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1/2 rounded-l-2xl bg-[#e4e2ef] bg-no-repeat"
          style={{
            backgroundImage: 'url(/ending-cover-illustration.png)',
            backgroundSize: '200% 100%',
            backgroundPosition: 'left top',
            transform: closed ? 'translateX(0)' : 'translateX(-122%)',
            transition: coverTransition,
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 rounded-r-2xl bg-[#e4e2ef] bg-no-repeat"
          style={{
            backgroundImage: 'url(/ending-cover-illustration.png)',
            backgroundSize: '200% 100%',
            backgroundPosition: 'right top',
            transform: closed ? 'translateX(0)' : 'translateX(122%)',
            transition: coverTransition,
          }}
        />
      </div>

      <div
        className="relative z-[1] w-full max-w-md px-4 text-center"
        style={{
          opacity: phase === 'opened' ? 1 : 0,
          transform: phase === 'opened' ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.98)',
          transition:
            phase === 'opened'
              ? `opacity 700ms ease ${CARD_DELAY_MS}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${CARD_DELAY_MS}ms`
              : 'none',
        }}
      >
        <div className="mb-3.5 text-[11px] tracking-[0.4em] text-gold">· · ·</div>
        <p className="mb-8 italic text-sm leading-relaxed text-muted-foreground">
          故事說到這裡，先闔上這一頁。
        </p>

        <div className="flex justify-center">
          <LikeButton bookId={bookId} initialHasLiked={hasLiked} initialLikeCount={likeCount} />
        </div>

        {canMessage && messageCreatorName && (
          <MessageComposer
            bookId={bookId}
            initialMessage={initialMessage ?? null}
            creatorName={messageCreatorName}
            editorName={messageEditorName ?? null}
          />
        )}

        {isEditor && editorLetter && creatorName && (
          <HandoverLetter
            isEditor={isEditor}
            editorLetter={editorLetter}
            creatorName={creatorName}
            bookId={bookId}
          />
        )}
      </div>
    </div>
  )
}
