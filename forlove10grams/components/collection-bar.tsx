'use client'

import { useEffect, useState } from 'react'

type Chip = { _id: string; name: string; bookCount: number }

export function CollectionBar({
  activeId,
  onSelect,
}: {
  activeId: string | null
  onSelect: (id: string | null, name: string | null) => void
}) {
  const [chips, setChips] = useState<Chip[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  function load() {
    fetch('/api/collections')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Chip[]) => setChips(data))
      .catch(() => setChips([]))
  }

  useEffect(load, [])

  async function create() {
    const name = newName.trim()
    if (!name) return
    setError('')
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.status === 409) {
      setError('已有同名收藏夾')
      return
    }
    if (res.ok) {
      setNewName('')
      setAdding(false)
      load()
    }
  }

  const base =
    'rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onSelect(null, null)}
        className={`${base} ${activeId === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
      >
        全部
      </button>
      {chips.map((c) => (
        <button
          key={c._id}
          onClick={() => onSelect(c._id, c.name)}
          className={`${base} ${activeId === c._id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          {c.name}
          {c.bookCount > 0 && <span className="ml-1 opacity-70">{c.bookCount}</span>}
        </button>
      ))}
      {adding ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            placeholder="收藏夾名稱"
            className="rounded-full border border-foreground/20 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button onClick={create} className="text-xs text-primary">建立</button>
        </span>
      ) : (
        <button onClick={() => setAdding(true)} className={`${base} border border-dashed border-foreground/25 text-muted-foreground hover:text-foreground`}>
          + 新增
        </button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
