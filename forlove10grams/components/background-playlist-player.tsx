'use client'

import { useEffect, useRef, useState } from 'react'

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
  const [expanded, setExpanded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
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
          onReady: (event) => {
            readyRef.current = true
            setIsMuted(event.target.isMuted())
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === 1 /* YT.PlayerState.PLAYING */)
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
      document.removeEventListener('pointerdown', handleFirstGesture, { capture: true })

      const page = pagesRef.current.find((p) => p._id === activePageIdRef.current)
      if (page?.playlistTrackIndex != null) {
        playerRef.current.playVideoAt(page.playlistTrackIndex)
        jumpedPageIdsRef.current.add(page._id)
      } else {
        playerRef.current.playVideo()
      }
      setIsPlaying(true)
    }

    document.addEventListener('pointerdown', handleFirstGesture, { capture: true })
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

  function togglePlay() {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  function toggleMute() {
    if (!playerRef.current) return
    if (isMuted) {
      playerRef.current.unMute()
    } else {
      playerRef.current.mute()
    }
    setIsMuted(!isMuted)
  }

  return (
    <>
      <div
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        aria-hidden
      >
        <div id={containerIdRef.current} />
      </div>

      <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
        {expanded && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm">
            <button
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-foreground/5 cursor-pointer"
              aria-label={isPlaying ? '暫停' : '播放'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-foreground/5 cursor-pointer"
              aria-label={isMuted ? '取消靜音' : '靜音'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-foreground/5 cursor-pointer"
          aria-label="背景音樂控制"
        >
          🎵
        </button>
      </div>
    </>
  )
}
