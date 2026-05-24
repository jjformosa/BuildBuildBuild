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

  return (
    <button
      onClick={handleShare}
      disabled={!isLoaded || status === 'loading'}
      className="rounded-md border border-[#2C1810]/20 px-3 py-1.5 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-50 transition-colors"
    >
      {label}
    </button>
  )
}
