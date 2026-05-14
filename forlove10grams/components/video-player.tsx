'use client'

import { useRef, useEffect, useState } from 'react'

export function VideoPlayer({ url }: { url: string }) {
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

  return (
    <div
      className="relative w-full bg-black"
      style={{ paddingBottom: '56.25%' }}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2C1810]/5">
          <svg
            className="h-10 w-10 text-[#2C1810]/20"
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
          src={url}
          controls
          onError={() => setError(true)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
    </div>
  )
}
