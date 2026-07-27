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
}: {
  playlistId: string
  activePageId: string | null
  pages: BackgroundPlaylistPage[]
}) {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerIdRef = useRef(`bg-playlist-player-${Math.random().toString(36).slice(2)}`)

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
        events: {},
      })
    })

    return () => {
      cancelled = true
    }
  }, [playlistId])

  return (
    <div
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <div id={containerIdRef.current} />
    </div>
  )
}
