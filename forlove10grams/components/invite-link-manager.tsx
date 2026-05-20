'use client'

import { useCallback, useEffect, useState } from 'react'

interface InviteState {
  active: boolean
  invite: {
    token: string
    expiresAt: string
    revokedAt: string | null
  } | null
  inviteUrl: string | null
}

interface Reader {
  userId: string
  displayName: string
  joinedAt: string
}

export function InviteLinkManager({ bookId }: { bookId: string }) {
  const [invite, setInvite] = useState<InviteState | null>(null)
  const [readers, setReaders] = useState<Reader[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [invRes, rdRes] = await Promise.all([
        fetch(`/api/books/${bookId}/invite-link`),
        fetch(`/api/books/${bookId}/readers`),
      ])
      if (!invRes.ok || !rdRes.ok) throw new Error('載入失敗')
      const invData = await invRes.json()
      const rdData = await rdRes.json()
      const origin = window.location.origin
      setInvite({
        ...invData,
        inviteUrl: invData.invite ? `${origin}/invite/${invData.invite.token}` : null,
      })
      setReaders(rdData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleGenerate() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/invite-link`, { method: 'POST' })
      if (!res.ok) throw new Error('產生連結失敗')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '產生連結失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRevoke() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/invite-link`, { method: 'DELETE' })
      if (!res.ok) throw new Error('撤銷失敗')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤銷失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveReader(userId: string) {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/readers/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('移除失敗')
      setReaders((prev) => prev.filter((r) => r.userId !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  function copyUrl() {
    if (invite?.inviteUrl) navigator.clipboard.writeText(invite.inviteUrl)
  }

  if (loading) {
    return <p className="text-sm text-[#2C1810]/50">載入中…</p>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[#2C1810]">邀請連結</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {invite?.active && invite.inviteUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={invite.inviteUrl}
              className="flex-1 truncate rounded border border-[#2C1810]/20 bg-white px-2 py-1 text-xs text-[#2C1810]"
            />
            <button
              onClick={copyUrl}
              className="rounded border border-[#2C1810]/20 px-2 py-1 text-xs text-[#2C1810] hover:bg-[#2C1810]/5"
            >
              複製
            </button>
          </div>
          <p className="text-xs text-[#2C1810]/50">
            到期時間：{new Date(invite.invite!.expiresAt).toLocaleDateString('zh-TW')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={actionLoading}
              className="rounded border border-[#2C1810]/30 px-2 py-1 text-xs text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-50"
            >
              延長 7 天
            </button>
            <button
              onClick={handleRevoke}
              disabled={actionLoading}
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              撤銷
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {invite?.invite && !invite.active && (
            <p className="text-xs text-[#2C1810]/50">
              {invite.invite.revokedAt ? '連結已撤銷' : '連結已到期'}
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={actionLoading}
            className="rounded-md bg-[#2C1810] px-3 py-1.5 text-xs font-medium text-[#FAF7F2] disabled:opacity-50"
          >
            {actionLoading ? '產生中…' : '產生邀請連結'}
          </button>
        </div>
      )}

      {readers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[#2C1810]">讀者</h3>
          <ul className="space-y-1">
            {readers.map((r) => (
              <li key={r.userId} className="flex items-center justify-between">
                <span className="text-xs text-[#2C1810]">{r.displayName}</span>
                <button
                  onClick={() => handleRemoveReader(r.userId)}
                  disabled={actionLoading}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
