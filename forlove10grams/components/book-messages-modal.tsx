'use client'

import { useEffect, useState } from 'react'

type Message = { _id: string; fromName: string; body: string; updatedAt: string; unread: boolean }

export default function BookMessagesModal({
  bookId,
  role,
  onClose,
  onRead,
}: {
  bookId: string
  role: 'owner' | 'editor'
  onClose: () => void
  onRead: () => void
}) {
  const [messages, setMessages] = useState<Message[] | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/books/${bookId}/messages`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Message[]) => {
        if (cancelled) return
        setMessages(data)
        // Mark read on open, then notify the caller to clear its unread dot.
        fetch(`/api/books/${bookId}/messages/read`, { method: 'PATCH' })
          .then(() => onRead())
          .catch(() => {})
      })
      .catch(() => setMessages([]))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  async function remove(id: string) {
    if (!confirm('刪除這則訊息？')) return
    const res = await fetch(`/api/books/${bookId}/messages/${id}`, { method: 'DELETE' })
    if (res.ok) setMessages((prev) => prev!.filter((m) => m._id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">讀者的話</h2>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground/60 text-lg leading-none" aria-label="關閉">
            ✕
          </button>
        </div>

        {messages === null ? (
          <p className="py-6 text-center text-sm text-foreground/50">載入中…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground/50">還沒有讀者留言。</p>
        ) : (
          <ul className="max-h-96 space-y-3 overflow-y-auto">
            {messages.map((m) => (
              <li key={m._id} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {m.unread && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose align-middle" />}
                    {m.fromName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.updatedAt).toLocaleDateString('zh-TW')}
                  </span>
                </div>
                <p className="mt-1.5 border-l-2 border-foreground/15 pl-2.5 text-sm italic leading-relaxed text-foreground/80">
                  「{m.body}」
                </p>
                {role === 'owner' && (
                  <div className="mt-2 text-right">
                    <button onClick={() => remove(m._id)} className="text-xs text-muted-foreground hover:text-destructive">
                      刪除
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
