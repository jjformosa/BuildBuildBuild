'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Item = {
  _id: string
  title: string
  coverImage: string | null
  shareStatus: string
  role: 'owner' | 'editor' | 'reader'
}

export function CollectionView({
  collectionId,
  collectionName,
  onDeleted,
}: {
  collectionId: string
  collectionName: string
  onDeleted: () => void
}) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [name, setName] = useState(collectionName)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(collectionName)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setItems(null)
    setName(collectionName)
    setRenameValue(collectionName)
    fetch(`/api/collections/${collectionId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Item[]) => setItems(data))
      .catch(() => setItems([]))
  }, [collectionId, collectionName])

  async function persistOrder(next: Item[]) {
    setItems(next)
    await fetch(`/api/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookIds: next.map((i) => i._id) }),
    })
  }

  function move(index: number, dir: -1 | 1) {
    if (!items) return
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    persistOrder(next)
  }

  async function rename() {
    const value = renameValue.trim()
    if (!value) return
    setBusy(true)
    const res = await fetch(`/api/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    })
    setBusy(false)
    if (res.ok) {
      setName(value)
      setRenaming(false)
    }
  }

  async function remove() {
    if (!confirm(`刪除收藏夾「${name}」？（不會刪除裡面的書）`)) return
    setBusy(true)
    const res = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) onDeleted()
  }

  function hrefFor(item: Item): string {
    return item.role === 'reader' ? `/read/${item._id}` : `/books/${item._id}/edit`
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {renaming ? (
          <span className="flex items-center gap-2">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && rename()}
              className="rounded-md border border-foreground/20 px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button onClick={rename} disabled={busy} className="text-xs text-primary">儲存</button>
            <button onClick={() => setRenaming(false)} className="text-xs text-muted-foreground">取消</button>
          </span>
        ) : (
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">{name}</h2>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setRenaming(true)} className="btn-outline-xs">重新命名</button>
          <button onClick={remove} disabled={busy} className="btn-danger-xs">刪除收藏夾</button>
        </div>
      </div>

      {items === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">載入中…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">這個收藏夾還沒有書，或你已無權存取夾內的書。</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li key={item._id} className="flex items-center gap-2">
              <div className="flex flex-none flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-muted-foreground disabled:opacity-30" aria-label="上移">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-xs text-muted-foreground disabled:opacity-30" aria-label="下移">▼</button>
              </div>
              <Link
                href={hrefFor(item)}
                className="group flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-all hover:border-primary/30"
              >
                <div className="relative h-12 w-12 flex-none overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-rose/10">
                  {item.coverImage ? (
                    <Image src={item.coverImage} alt="" fill className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary/35">
                      {item.title.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
