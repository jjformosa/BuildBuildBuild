'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddPageButton({ bookId }: { bookId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'carousel' | 'video' | null>(null)

  async function addPage(type: 'carousel' | 'video') {
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

  return (
    <div className="flex gap-2">
      <button
        onClick={() => addPage('carousel')}
        disabled={loading !== null}
        className="flex-1 rounded-md border border-[#2C1810]/20 py-1.5 text-xs text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-40 transition-colors"
      >
        {loading === 'carousel' ? '新增中…' : '+ 輪播'}
      </button>
      <button
        onClick={() => addPage('video')}
        disabled={loading !== null}
        className="flex-1 rounded-md border border-[#2C1810]/20 py-1.5 text-xs text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-40 transition-colors"
      >
        {loading === 'video' ? '新增中…' : '+ 影片'}
      </button>
    </div>
  )
}
