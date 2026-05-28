'use client'

import { useEffect, useState, useCallback } from 'react'

interface Reader {
  userId: string
  displayName: string
  joinedAt: string
}

export function ReaderList({
  bookId,
  shareStatus,
}: {
  bookId: string
  shareStatus: string
}) {
  const [readers, setReaders] = useState<Reader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchReaders = useCallback(async () => {
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/readers`)
      if (!res.ok) throw new Error()
      setReaders(await res.json())
    } catch {
      setError('載入失敗，請重新整理')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    if (shareStatus !== 'shared') return
    fetchReaders()
  }, [shareStatus, fetchReaders])

  if (shareStatus !== 'shared') return null

  async function handleRemove(userId: string) {
    setRemoving(userId)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/readers/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      setReaders((prev) => prev.filter((r) => r.userId !== userId))
    } catch {
      setError('移除失敗')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">讀者名單</h3>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-foreground/50">載入中…</p>
      ) : readers.length === 0 ? (
        <p className="text-sm text-foreground/50">還沒有讀者</p>
      ) : (
        <ul className="space-y-2">
          {readers.map((r) => (
            <li key={r.userId} className="flex items-center justify-between gap-2">
              <div>
                <span className="text-sm text-foreground">{r.displayName}</span>
                <span className="ml-2 text-xs text-foreground/50">
                  {new Date(r.joinedAt).toLocaleDateString('zh-TW')}
                </span>
              </div>
              <button
                onClick={() => handleRemove(r.userId)}
                disabled={removing === r.userId}
                className="btn-danger-xs"
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
