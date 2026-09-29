'use client'

import { useState } from 'react'

interface BackgroundPlaylistState {
  url: string
  playlistId: string
}

export function BackgroundPlaylistManager({
  bookId,
  initialPlaylist,
}: {
  bookId: string
  initialPlaylist: BackgroundPlaylistState | null
}) {
  const [playlist, setPlaylist] = useState<BackgroundPlaylistState | null>(initialPlaylist)
  const [urlInput, setUrlInput] = useState(initialPlaylist?.url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/playlist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '儲存失敗')
      setPlaylist(data.backgroundPlaylist)
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/playlist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: null }),
      })
      if (!res.ok) throw new Error('移除失敗')
      setPlaylist(null)
      setUrlInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">背景歌單</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="貼上 YouTube 播放清單連結"
          className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
        />
        <button onClick={handleSave} disabled={saving} className="btn-outline-xs">
          {saving ? '儲存中…' : '儲存'}
        </button>
        {playlist && (
          <button onClick={handleRemove} disabled={saving} className="btn-danger-xs">
            移除
          </button>
        )}
      </div>

      {playlist && (
        <p className="text-xs text-foreground/50">目前歌單 ID：{playlist.playlistId}</p>
      )}
    </div>
  )
}
