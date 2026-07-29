'use client'

import { useEffect, useId, useRef, useState } from 'react'

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  playVideoAt(index: number): void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        opts: {
          width?: string | number
          height?: string | number
          playerVars: Record<string, string | number>
          events: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number }) => void
            onError?: (event: { data: number }) => void
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

export function useBackgroundPlaylist({
  playlistId,
  activePageId,
  pages,
}: {
  playlistId: string | null
  activePageId: string | null
  pages: BackgroundPlaylistPage[]
}) {
  const playerRef = useRef<YTPlayer | null>(null)
  // useId is stable across SSR and hydration. A random ID can leave the DOM with
  // the server ID while YT.Player looks for a different client ID.
  const reactId = useId()
  const containerId = `bg-playlist-player-${reactId.replace(/:/g, '')}`
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const readyRef = useRef(false)
  const startedRef = useRef(false)
  const jumpedPageIdsRef = useRef<Set<string>>(new Set())
  const activePageIdRef = useRef(activePageId)
  const pagesRef = useRef(pages)

  activePageIdRef.current = activePageId
  pagesRef.current = pages

  function startPlayback() {
    startedRef.current = true
    const page = pagesRef.current.find((p) => p._id === activePageIdRef.current)
    if (page?.playlistTrackIndex != null) {
      playerRef.current!.playVideoAt(page.playlistTrackIndex)
      jumpedPageIdsRef.current.add(page._id)
    } else {
      playerRef.current!.playVideo()
    }
    setIsPlaying(true)
  }

  useEffect(() => {
    if (!playlistId) return
    let cancelled = false

    loadYouTubeIframeApi().then(() => {
      if (cancelled) return
      playerRef.current = new window.YT!.Player(containerId, {
        // YouTube 要求嵌入的 player viewport 至少 200x200px，容器太小會導致 onReady 永遠不觸發
        width: 300,
        height: 300,
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
            setIsReady(true)
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === 1 /* YT.PlayerState.PLAYING */)
          },
          onError: (event) => {
            console.error('[background-playlist] YouTube player error', event.data)
          },
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [playlistId, containerId])

  // 換頁：有指定曲目且該頁尚未跳轉過 → 跳轉一次；否則不動作，讓目前曲目自然繼續 / 自然播完後交給 YouTube 自動接下一首
  useEffect(() => {
    if (!startedRef.current || !playerRef.current || !activePageId) return
    const page = pages.find((p) => p._id === activePageId)
    if (page?.playlistTrackIndex != null && !jumpedPageIdsRef.current.has(activePageId)) {
      playerRef.current.playVideoAt(page.playlistTrackIndex)
      jumpedPageIdsRef.current.add(activePageId)
    }
  }, [activePageId, pages])

  function play() {
    // 呼叫端要用 isReady 擋掉還沒準備好時的點擊：這裡呼叫必須是使用者手勢當下的同步呼叫，
    // 事後（例如在 onReady callback 裡）補呼叫會被瀏覽器的 autoplay 政策悄悄擋掉。
    if (!playlistId || !readyRef.current || !playerRef.current) return
    startPlayback()
  }

  function pause() {
    if (!playerRef.current) return
    playerRef.current.pauseVideo()
    setIsPlaying(false)
  }

  function toggle() {
    if (isPlaying) pause()
    else play()
  }

  return { isPlaying, isReady, play, pause, toggle, containerId }
}
