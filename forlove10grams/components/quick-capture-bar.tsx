'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRipple } from '@/lib/ripple'
import type { QuickCaptureMode } from '@/lib/quick-capture'

type Status = 'idle' | 'loading' | 'error'

class QuickCaptureRequestError extends Error {}

const OPTIONS: Array<{ mode: QuickCaptureMode; label: string }> = [
  { mode: 'photo', label: '照片' },
  { mode: 'video', label: '影片' },
  { mode: 'text', label: '文字' },
]

export function QuickCaptureBar() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [loadingMode, setLoadingMode] = useState<QuickCaptureMode | null>(null)
  const [error, setError] = useState('')

  async function handleCapture(mode: QuickCaptureMode) {
    setStatus('loading')
    setLoadingMode(mode)
    setError('')
    try {
      const res = await fetch('/api/books/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data || typeof data.redirectTo !== 'string') {
        throw new QuickCaptureRequestError(data?.error ?? '建立失敗，請再試一次')
      }
      router.push(data.redirectTo)
    } catch (err) {
      setStatus('error')
      setLoadingMode(null)
      setError(
        err instanceof QuickCaptureRequestError ? err.message : '建立失敗，請再試一次',
      )
    }
  }

  const disabled = status === 'loading'

  return (
    <section className="rounded-xl border border-rose/20 bg-rose/12 px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">現在記一筆</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            先捕捉，標題和整理之後再補。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-none">
          {OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              disabled={disabled}
              onClick={(event) => {
                createRipple(event)
                handleCapture(option.mode)
              }}
              className="relative overflow-hidden rounded-lg border border-rose/20 bg-background px-3 py-2 text-sm font-medium text-rose transition-colors hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMode === option.mode ? '建立中…' : option.label}
            </button>
          ))}
        </div>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </section>
  )
}
