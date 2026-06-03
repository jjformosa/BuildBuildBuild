'use client'

import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'

type Props = {
  urls: string[]
  initialIndex: number
  onClose: () => void
}

const ANIM = {
  xOffset: 90,
  outDur: 0.20,
  inDur:  0.32,
  outEase: 'power2.in',
  inEase:  'power2.out',
} as const

export function CinemaGallery({ urls, initialIndex, onClose }: Props) {
  const [displayIdx, setDisplayIdx] = useState(initialIndex)
  const curRef     = useRef(initialIndex)
  const animRef    = useRef(false)
  const touchRef   = useRef({ x: 0, y: 0 })
  const tlRef      = useRef<gsap.core.Timeline | null>(null)

  const mainImgRef  = useRef<HTMLImageElement>(null)
  const ghostLImgRef = useRef<HTMLImageElement>(null)
  const ghostRImgRef = useRef<HTMLImageElement>(null)
  const ghostLRef   = useRef<HTMLDivElement>(null)
  const ghostRRef   = useRef<HTMLDivElement>(null)
  const flashRef    = useRef<HTMLDivElement>(null)

  const n = urls.length

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Initialize images
  useEffect(() => {
    if (mainImgRef.current) mainImgRef.current.src = urls[initialIndex]
    syncGhosts(initialIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kill any running timeline on unmount
  useEffect(() => () => { tlRef.current?.kill() }, [])

  function syncGhosts(idx: number) {
    if (ghostLImgRef.current) ghostLImgRef.current.src = idx > 0 ? urls[idx - 1] : ''
    if (ghostRImgRef.current) ghostRImgRef.current.src = idx < n - 1 ? urls[idx + 1] : ''
    gsap.set(ghostLRef.current, { autoAlpha: idx > 0 ? 1 : 0 })
    gsap.set(ghostRRef.current, { autoAlpha: idx < n - 1 ? 1 : 0 })
  }

  function goTo(newIdx: number, dir: 1 | -1) {
    if (animRef.current || newIdx < 0 || newIdx >= n) return
    animRef.current = true
    setDisplayIdx(newIdx) // update counter + mobile arrows immediately

    const mainImg = mainImgRef.current!
    const flash   = flashRef.current!

    tlRef.current?.kill()
    const tl = gsap.timeline({
      onComplete: () => {
        curRef.current = newIdx
        animRef.current = false
      }
    })
    tlRef.current = tl

    tl.to(mainImg, { x: dir * -ANIM.xOffset, autoAlpha: 0, duration: ANIM.outDur, ease: ANIM.outEase }, 0)
    // Projector-advance flash
    tl.to(flash,   { opacity: 0.38, duration: 0.06 }, ANIM.outDur - 0.04)
    tl.to(flash,   { opacity: 0,    duration: 0.10 }, ANIM.outDur + 0.02)
    tl.call(() => {
      mainImg.src = urls[newIdx]
      syncGhosts(newIdx)
      gsap.set(mainImg, { x: dir * ANIM.xOffset })
    }, [], ANIM.outDur)
    tl.to(mainImg, { x: 0, autoAlpha: 1, duration: ANIM.inDur, ease: ANIM.inEase }, ANIM.outDur + 0.05)
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft')   goTo(curRef.current - 1, -1)
      if (e.key === 'ArrowRight')  goTo(curRef.current + 1,  1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      goTo(curRef.current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#070604]"
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Three-column rail: ghost (20%) | main (60%) | ghost (20%) */}
      {/* On mobile: just main fills full width, no ghosts shown */}
      <div className="flex w-full h-full items-center">

        {/* Ghost Left — desktop only */}
        <div
          ref={ghostLRef}
          className="hidden md:block flex-none relative overflow-hidden cursor-pointer"
          style={{ width: '20%', height: '78%' }}
          onClick={() => goTo(curRef.current - 1, -1)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={ghostLImgRef}
            src=""
            alt=""
            className="absolute pointer-events-none object-cover"
            style={{ inset: '-5%', width: '110%', height: '110%', filter: 'blur(4px) brightness(0.2)' }}
          />
          {/* Feather edge into bg */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, #070604 0%, rgba(7,6,4,0.15) 100%)' }} />
          <span className="absolute top-1/2 right-3 -translate-y-1/2 select-none" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 22 }}>‹</span>
        </div>

        {/* Main image slot */}
        <div className="flex-1 md:flex-none md:w-3/5 h-full flex items-center justify-center relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={mainImgRef}
            src=""
            alt=""
            className="max-w-full max-h-full object-contain block"
            style={{ willChange: 'transform, opacity' }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 55%, rgba(7,6,4,0.48) 100%)' }}
          />
        </div>

        {/* Ghost Right — desktop only */}
        <div
          ref={ghostRRef}
          className="hidden md:block flex-none relative overflow-hidden cursor-pointer"
          style={{ width: '20%', height: '78%' }}
          onClick={() => goTo(curRef.current + 1, 1)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={ghostRImgRef}
            src=""
            alt=""
            className="absolute pointer-events-none object-cover"
            style={{ inset: '-5%', width: '110%', height: '110%', filter: 'blur(4px) brightness(0.2)' }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to left, #070604 0%, rgba(7,6,4,0.15) 100%)' }} />
          <span className="absolute top-1/2 left-3 -translate-y-1/2 select-none" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 22 }}>›</span>
        </div>
      </div>

      {/* Projector-advance flash overlay */}
      <div ref={flashRef} className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: 0, zIndex: 50 }} />

      {/* Counter — monospace, barely visible */}
      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none select-none"
        style={{ fontFamily: 'Courier New, monospace', fontSize: 11, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)', zIndex: 51 }}
      >
        {displayIdx + 1} / {n}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-[51] w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="關閉"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 3L13 13M13 3L3 13" />
        </svg>
      </button>

      {/* Mobile prev arrow — only show when navigable */}
      {displayIdx > 0 && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 z-[51] w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors md:hidden"
          onClick={() => goTo(curRef.current - 1, -1)}
          aria-label="上一張"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4L6 9L11 14" />
          </svg>
        </button>
      )}

      {/* Mobile next arrow */}
      {displayIdx < n - 1 && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 z-[51] w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors md:hidden"
          onClick={() => goTo(curRef.current + 1, 1)}
          aria-label="下一張"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7 4L12 9L7 14" />
          </svg>
        </button>
      )}
    </div>
  )
}
