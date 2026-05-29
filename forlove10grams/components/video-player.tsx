'use client'

import { useRef, useEffect, useState } from 'react'
import Hls from 'hls.js'
import type { TranscodingStatus } from '@/lib/models/page'

type Props = {
  url: string
  transcodingStatus?: TranscodingStatus | null
  tokenReady?: boolean
}

export function VideoPlayer({ url, transcodingStatus, tokenReady = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(false)

  // Auto-pause when scrolled off-screen; never auto-play on entry
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) video.pause() },
      { threshold: 0.1 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  // HLS or direct playback setup
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    // Legacy videos (no transcodingStatus) use the URL directly as an MP4 src
    if (!transcodingStatus) {
      video.src = url
      return
    }

    if (transcodingStatus !== 'ready') return
    if (!tokenReady) return

    if (Hls.isSupported()) {
      const hls = new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = true } })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setError(true)
      })
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS — cookies are sent automatically
      video.src = url
    } else {
      setError(true)
    }
  }, [url, transcodingStatus, tokenReady])

  if (transcodingStatus === 'pending' || transcodingStatus === 'processing') {
    return (
      <div
        className="relative w-full bg-foreground/5 flex items-center justify-center"
        style={{ paddingBottom: '56.25%' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="h-6 w-6 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
          <span className="text-xs text-foreground/40">轉檔中…</span>
        </div>
      </div>
    )
  }

  if (transcodingStatus === 'error') {
    return (
      <div
        className="relative w-full bg-foreground/5"
        style={{ paddingBottom: '56.25%' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-red-400">影片轉檔失敗，請重新上傳</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full bg-black"
      style={{ paddingBottom: '56.25%' }}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/5">
          <svg
            className="h-10 w-10 text-foreground/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
    </div>
  )
}
