'use client'

import { useEffect, useState } from 'react'

type PickerItem = { _id: string; name: string; containsBook: boolean }

export default function CollectionPickerModal({
  bookId,
  onClose,
}: {
  bookId: string
  onClose: () => void
}) {
  const [items, setItems] = useState<PickerItem[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    fetch(`/api/collections?bookId=${bookId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ _id: string; name: string; containsBook?: boolean }>) =>
        setItems(data.map((c) => ({ _id: c._id, name: c.name, containsBook: !!c.containsBook })))
      )
      .catch(() => setItems([]))
  }, [bookId])

  async function toggle(item: PickerItem) {
    setSaving(true)
    setError('')
    const nextContains = !item.containsBook
    setItems((prev) =>
      prev!.map((c) => (c._id === item._id ? { ...c, containsBook: nextContains } : c))
    )
    try {
      const res = await fetch(`/api/collections/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextContains ? { addBookId: bookId } : { removeBookId: bookId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItems((prev) =>
        prev!.map((c) => (c._id === item._id ? { ...c, containsBook: item.containsBook } : c))
      )
      setError('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function createAndAdd() {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setError('')
    try {
      const createRes = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (createRes.status === 409) {
        setError('已有同名收藏夾')
        return
      }
      if (!createRes.ok) throw new Error()
      const created: { _id: string; name: string } = await createRes.json()
      await fetch(`/api/collections/${created._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addBookId: bookId }),
      })
      setItems((prev) => [{ _id: created._id, name: created.name, containsBook: true }, ...(prev ?? [])])
      setNewName('')
    } catch {
      setError('建立失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">加入收藏夾</h2>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground/60 text-lg leading-none" aria-label="關閉">
            ✕
          </button>
        </div>

        {items === null ? (
          <p className="py-4 text-center text-sm text-foreground/50">載入中…</p>
        ) : (
          <ul className="mb-4 max-h-60 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item._id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/5">
                  <input
                    type="checkbox"
                    checked={item.containsBook}
                    disabled={saving}
                    onChange={() => toggle(item)}
                  />
                  <span className="truncate">{item.name}</span>
                </label>
              </li>
            ))}
            {items.length === 0 && <li className="px-2 py-3 text-center text-xs text-foreground/40">還沒有收藏夾</li>}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
            placeholder="+ 新收藏夾"
            className="flex-1 rounded-md border border-foreground/15 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button onClick={createAndAdd} disabled={saving || !newName.trim()} className="btn-outline-xs">
            建立
          </button>
        </div>
        {saving && <p className="mt-2 text-center text-xs text-foreground/50">儲存中…</p>}
        {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}
