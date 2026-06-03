'use client'

import { useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { CinemaGallery } from '@/components/cinema-gallery'

type Props = { urls: string[] }

// Animation timings — adjust here to tune the feel
const ANIM = {
  tipDur:    0.15,                   // telegraph tilt before shuffle
  settleDur: 0.44,                   // card settling duration
  stagger:   0.035,                  // delay between each card settling
  tipEase:   'power1.in' as const,
  settleEase:'power2.out' as const,
} as const

// Visual stack layers — index 0 = top card, index N-1 = bottom (barely peeking).
// Extend if you have more than 5 images.
const STACK_BASE = [
  { rotation:  0, y:  0, scale: 1.00, zIndex: 50 },
  { rotation: -5, y:  9, scale: 0.97, zIndex: 40 },
  { rotation:  8, y: 17, scale: 0.94, zIndex: 30 },
  { rotation: -4, y: 24, scale: 0.91, zIndex: 20 },
  { rotation:  3, y: 30, scale: 0.88, zIndex: 10 },
]

// Returns a STACK config for position `pos` — clamps if pos >= STACK_BASE.length
function stackCfg(pos: number) {
  return STACK_BASE[Math.min(pos, STACK_BASE.length - 1)]
}

// Visual position of card `cardIdx` given current top `topIdx`
function stackPos(cardIdx: number, topIdx: number, n: number) {
  return (cardIdx - topIdx + n) % n
}

// Fixed dimensions — cards are 240px wide, square photo, 52px caption area
const CARD_W  = 240
const PHOTO_W = CARD_W - 20          // 10px padding each side
const CARD_H  = 10 + PHOTO_W + 52   // top + photo (square) + bottom caption area
const WRAP_W  = 260
const WRAP_H  = 340

export function PolaroidCarousel({ urls }: Props) {
  const n = urls.length
  const cardRefs   = useRef<HTMLDivElement[]>([])
  const curRef     = useRef(0)
  const animRef    = useRef(false)
  const tlRef      = useRef<gsap.core.Timeline | null>(null)
  const touchRef   = useRef({ x: 0, y: 0 })
  const initialised = useRef(false)

  const [displayIdx, setDisplayIdx] = useState(0)
  const [lbOpen,     setLbOpen]     = useState(false)
  const [lbIndex,    setLbIndex]    = useState(0)

  // Set a card's GSAP props from its stack config
  function applyStack(card: HTMLDivElement, pos: number, animate = false) {
    const cfg = stackCfg(pos)
    const props = { x: 0, y: cfg.y, rotation: cfg.rotation, scale: cfg.scale, zIndex: cfg.zIndex, autoAlpha: 1 }
    if (animate) gsap.to(card, { ...props, duration: ANIM.settleDur, ease: ANIM.settleEase })
    else         gsap.set(card, props)
  }

  // Callback ref — initialise each card's position once mounted
  const setCardRef = useCallback((el: HTMLDivElement | null, i: number) => {
    if (!el) return
    cardRefs.current[i] = el
    if (!initialised.current && cardRefs.current.filter(Boolean).length === n) {
      initialised.current = true
      cardRefs.current.forEach((card, idx) => {
        applyStack(card, stackPos(idx, 0, n))
      })
    }
  }, [n])

  function shuffle(dir: 1 | -1) {
    if (animRef.current || n <= 1) return
    animRef.current = true

    const cur     = curRef.current
    const nextCur = (cur + dir + n) % n

    setDisplayIdx(nextCur) // update counter immediately

    tlRef.current?.kill()
    const tl = gsap.timeline({
      onComplete: () => {
        curRef.current = nextCur
        animRef.current = false
      }
    })
    tlRef.current = tl

    if (dir === 1) {
      // ── NEXT: top card shuffles to the bottom of the deck ─────────────
      const topCard = cardRefs.current[cur]

      // Phase 1: top card tips to the right (telegraph)
      tl.to(topCard, {
        x: 30, y: -14, rotation: 16, scale: 0.87,
        duration: ANIM.tipDur, ease: ANIM.tipEase,
      }, 0)

      // Phase 2: instantly snap it behind the deck (invisible during jump)
      tl.call(() => {
        const btm = stackCfg(n - 1)
        gsap.set(topCard, {
          zIndex: 1, autoAlpha: 0,
          x: 4, y: btm.y + 12,
          rotation: btm.rotation, scale: btm.scale,
        })
      }, [], ANIM.tipDur)

      // Phase 3: all cards settle to their new circular positions
      // Former top fades in at the bottom slot — the "shuffle" completes
      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const newPos = stackPos(i, nextCur, n)
        const cfg    = stackCfg(newPos)
        tl.to(card, {
          x: 0, y: cfg.y, rotation: cfg.rotation,
          scale: cfg.scale, zIndex: cfg.zIndex, autoAlpha: 1,
          duration: ANIM.settleDur, ease: ANIM.settleEase,
        }, ANIM.tipDur + 0.02 + newPos * ANIM.stagger)
      })

    } else {
      // ── PREV: new top card falls in from above ─────────────────────────
      const newTop = cardRefs.current[nextCur]

      // Start above the stack, invisible
      gsap.set(newTop, {
        zIndex: 60, y: -90, x: 0,
        rotation: -12, scale: 0.88, autoAlpha: 0,
      })

      // New top card falls into place with a soft bounce
      tl.to(newTop, {
        y: STACK_BASE[0].y, x: 0, rotation: 0, scale: 1,
        zIndex: STACK_BASE[0].zIndex, autoAlpha: 1,
        duration: ANIM.settleDur, ease: 'back.out(1.35)',
      }, 0)

      // All other cards shift down one level in the stack
      cardRefs.current.forEach((card, i) => {
        if (!card || i === nextCur) return
        const newPos = stackPos(i, nextCur, n)
        const cfg    = stackCfg(newPos)
        tl.to(card, {
          x: 0, y: cfg.y, rotation: cfg.rotation,
          scale: cfg.scale, zIndex: cfg.zIndex, autoAlpha: 1,
          duration: ANIM.settleDur, ease: ANIM.settleEase,
        }, newPos * ANIM.stagger)
      })
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    // Only fire on clear horizontal swipes (> 38px, steeper than ~55° from horizontal)
    if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      shuffle(dx < 0 ? 1 : -1)
    }
  }

  if (n === 0) return null

  return (
    <>
      <div className="flex flex-col items-center gap-6 py-4">

        {/* Stack area */}
        <div
          className="relative select-none"
          style={{ width: WRAP_W, height: WRAP_H }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {urls.map((url, i) => (
            <div
              key={i}
              ref={el => setCardRef(el, i)}
              className="absolute cursor-pointer"
              style={{
                left: (WRAP_W - CARD_W) / 2,
                top:  (WRAP_H - CARD_H) / 2,
                width: CARD_W,
                background: '#fff',
                padding: '10px 10px 52px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.05)',
                willChange: 'transform',
              }}
              // Tapping the top card = shuffle forward
              onClick={() => { if (i === curRef.current) shuffle(1) }}
            >
              {/* Photo — square crop */}
              <div className="overflow-hidden bg-foreground/5" style={{ width: '100%', aspectRatio: '1 / 1' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading={i < 2 ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover block pointer-events-none"
                />
              </div>

              {/* Caption / counter */}
              <span
                className="absolute left-0 right-0 text-center pointer-events-none"
                style={{
                  bottom: 14,
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: '#8a7b6e',
                  letterSpacing: '0.03em',
                }}
              >
                {i + 1} / {n}
              </span>

              {/* Expand to fullscreen — always visible at low opacity (mobile-safe) */}
              <button
                className="absolute flex items-center justify-center rounded"
                style={{
                  bottom: 10, right: 10,
                  width: 32, height: 32,
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  color: '#9a8c7e',
                  opacity: 0.55,
                }}
                onClick={e => {
                  e.stopPropagation()
                  setLbIndex(i)
                  setLbOpen(true)
                }}
                aria-label="全螢幕"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1 4V1H4M7 1H10V4M10 7V10H7M4 10H1V7" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Navigation row — only when there's more than one image */}
        {n > 1 && (
          <div className="flex items-center gap-5">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center border border-foreground/10 bg-card/70 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => shuffle(-1)}
              aria-label="上一張"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 2.5L5 7.5L10 12.5" />
              </svg>
            </button>

            <span
              className="min-w-[44px] text-center"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--muted-foreground)' }}
            >
              {displayIdx + 1} / {n}
            </span>

            <button
              className="w-10 h-10 rounded-full flex items-center justify-center border border-foreground/10 bg-card/70 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => shuffle(1)}
              aria-label="下一張"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 2.5L10 7.5L5 12.5" />
              </svg>
            </button>
          </div>
        )}

      </div>

      {lbOpen && (
        <CinemaGallery
          urls={urls}
          initialIndex={lbIndex}
          onClose={() => setLbOpen(false)}
        />
      )}
    </>
  )
}
