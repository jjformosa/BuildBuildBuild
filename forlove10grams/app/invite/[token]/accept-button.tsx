// app/invite/[token]/accept-button.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AcceptInviteButton({
  token,
  bookId,
}: {
  token: string
  bookId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '加入失敗')
      }
      router.push(`/read/${bookId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失敗')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleAccept}
        disabled={loading}
        className="rounded-md bg-[#2C1810] px-6 py-2.5 text-sm font-medium text-[#FAF7F2] disabled:opacity-50 transition-opacity"
      >
        {loading ? '加入中…' : '開始閱讀'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
