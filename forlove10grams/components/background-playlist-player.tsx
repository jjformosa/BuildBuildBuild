'use client'

import { useEffect, useRef } from 'react'

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  playVideoAt(index: number): void
  mute(): void
  unMute(): void
  isMuted(): boolean
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        opts: {
          playerVars: Record<string, string | number>
          events: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number }) => void
          }
        }
      ) => YTPlayer
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiLoadPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(script)
  })
  return apiLoadPromise
}

export type BackgroundPlaylistPage = {
  _id: string
  playlistTrackIndex?: number | null
}

export function BackgroundPlaylistPlayer({
  playlistId,
  activePageId,
  pages,
}: {
  playlistId: string
  activePageId: string | null
  pages: BackgroundPlaylistPage[]
}) {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerIdRef = useRef(`bg-playlist-player-${Math.random().toString(36).slice(2)}`)
  const readyRef = useRef(false)
  const startedRef = useRef(false)
  const jumpedPageIdsRef = useRef<Set<string>>(new Set())
  const activePageIdRef = useRef(activePageId)
  const pagesRef = useRef(pages)

  activePageIdRef.current = activePageId
  pagesRef.current = pages

  useEffect(() => {
    let cancelled = false

    loadYouTubeIframeApi().then(() => {
      if (cancelled) return
      playerRef.current = new window.YT!.Player(containerIdRef.current, {
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          loop: 1,
          autoplay: 0,
          controls: 0,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            readyRef.current = true
          },
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [playlistId])

  // 首次使用者手勢：任何地方點擊/觸控都算，觸發後立即移除監聽
  useEffect(() => {
    function handleFirstGesture() {
      if (startedRef.current || !readyRef.current || !playerRef.current) return
      startedRef.current = true

      const page = pagesRef.current.find((p) => p._id === activePageIdRef.current)
      if (page?.playlistTrackIndex != null) {
        playerRef.current.playVideoAt(page.playlistTrackIndex)
        jumpedPageIdsRef.current.add(page._id)
      } else {
        playerRef.current.playVideo()
      }
    }

    document.addEventListener('pointerdown', handleFirstGesture, { capture: true, once: true })
    return () => document.removeEventListener('pointerdown', handleFirstGesture, { capture: true })
  }, [])

  // 換頁：有指定曲目且該頁尚未跳轉過 → 跳轉一次；否則不動作，讓目前曲目自然繼續 / 自然播完後交給 YouTube 自動接下一首
  useEffect(() => {
    if (!startedRef.current || !playerRef.current || !activePageId) return
    const page = pages.find((p) => p._id === activePageId)
    if (page?.playlistTrackIndex != null && !jumpedPageIdsRef.current.has(activePageId)) {
      playerRef.current.playVideoAt(page.playlistTrackIndex)
      jumpedPageIdsRef.current.add(activePageId)
    }
  }, [activePageId, pages])

  return (
    <div
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <div id={containerIdRef.current} />
    </div>
  )
}
