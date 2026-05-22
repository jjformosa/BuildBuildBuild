'use client'

import { useCallback, useEffect, useState } from 'react'
import { useShareStatus } from '@/lib/contexts/share-status-context'

interface ShareState {
  active: boolean
  shareUrl: string | null
  createdAt: string | null
}

export function ShareLinkManager({ bookId }: { bookId: string }) {
  const [share, setShare] = useState<ShareState | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { setLoaded, registerRefresh } = useShareStatus()

  const fetchShare = useCallback(async () => {
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/share`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setShare({
        active: data.active,
        shareUrl: data.shareUrl ?? null,
        createdAt: data.createdAt ?? null,
      })
    } catch {
      setError('載入失敗，請重新整理')
      setShare({ active: false, shareUrl: null, createdAt: null })
    } finally {
      setLoaded()
    }
  }, [bookId, setLoaded])

  useEffect(() => { fetchShare() }, [fetchShare])
  useEffect(() => { registerRefresh(fetchShare) }, [registerRefresh, fetchShare])

  async function handleRevoke() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/share`, { method: 'DELETE' })
      if (!res.ok) throw new Error('撤銷失敗')
      setShare({ active: false, shareUrl: null, createdAt: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤銷失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function copyUrl() {
    if (!share?.shareUrl) return
    try {
      await navigator.clipboard.writeText(share.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('複製失敗，請手動複製連結')
    }
  }

  if (share === null) {
    return <p className="text-sm text-[#2C1810]/50">載入中…</p>
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#2C1810]">分享連結</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {share.active && share.shareUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={share.shareUrl}
              className="flex-1 truncate rounded border border-[#2C1810]/20 bg-white px-2 py-1 text-xs text-[#2C1810]"
            />
            <button
              onClick={copyUrl}
              className="rounded border border-[#2C1810]/20 px-2 py-1 text-xs text-[#2C1810] hover:bg-[#2C1810]/5"
            >
              {copied ? '✓ 已複製' : '複製'}
            </button>
          </div>
          {share.createdAt && (
            <p className="text-xs text-[#2C1810]/50">
              建立於 {new Date(share.createdAt).toLocaleDateString('zh-TW')}
            </p>
          )}
          <button
            onClick={handleRevoke}
            disabled={actionLoading}
            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            撤銷連結
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#2C1810]/50">目前沒有分享連結</p>
      )}
    </div>
  )
}
