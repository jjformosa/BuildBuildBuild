'use client'

import { useRef, useState } from 'react'

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AudioPlayer({
  url,
  durationSec,
}: {
  url: string
  durationSec?: number | null
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(durationSec ?? 0)

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (playing) el.pause()
    else el.play()
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current
    if (!el) return
    const t = Number(e.target.value)
    el.currentTime = t
    setCurrent(t)
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-card px-4 py-3">
      <button
        onClick={toggle}
        aria-label={playing ? '暫停' : '播放'}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={current}
        onChange={onSeek}
        className="flex-1 accent-primary"
        aria-label="播放進度"
      />
      <span className="flex-none text-xs tabular-nums text-muted-foreground">
        {formatTime(current)} / {formatTime(duration)}
      </span>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  )
}
