'use client'

import { useState } from 'react'
import { useShareStatus } from '@/lib/contexts/share-status-context'

type Status = 'idle' | 'loading' | 'copied' | 'error'

export function ShareButton({ bookId }: { bookId: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const { isLoaded, refresh } = useShareStatus()

  async function handleShare() {
    setStatus('loading')
    try {
      const res = await fetch(`/api/books/${bookId}/share`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const { shareUrl } = await res.json()
      refresh?.()
      await navigator.clipboard.writeText(shareUrl)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
    setTimeout(() => setStatus('idle'), 2500)
  }

  const label =
    status === 'loading' ? '分享中…'
    : status === 'copied' ? '✓ 已複製連結'
    : status === 'error' ? '分享失敗'
    : '分享 & 複製讀者連結'

  const mobileLabel =
    status === 'loading' ? '…'
    : status === 'copied' ? '✓'
    : status === 'error' ? '!'
    : '分享'

  return (
    <button
      onClick={handleShare}
      disabled={!isLoaded || status === 'loading'}
      title={label}
      className="btn-outline-sm"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      {status !== 'idle' && <span className="sm:hidden">{mobileLabel}</span>}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
