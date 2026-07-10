'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddPageButton({ bookId }: { bookId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'carousel' | 'video' | 'audio' | null>(null)

  async function addPage(type: 'carousel' | 'video' | 'audio') {
    setLoading(type)
    try {
      await fetch(`/api/books/${bookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const labels: Record<'carousel' | 'video' | 'audio', string> = {
    carousel: '+ 輪播',
    video: '+ 影片',
    audio: '+ 錄音',
  }

  return (
    <div className="flex gap-2">
      {(['carousel', 'video', 'audio'] as const).map((type) => (
        <button
          key={type}
          onClick={() => addPage(type)}
          disabled={loading !== null}
          className="flex-1 rounded-md border border-foreground/20 py-1.5 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40 transition-colors"
        >
          {loading === type ? '新增中…' : labels[type]}
        </button>
      ))}
    </div>
  )
}
