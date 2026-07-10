'use client'

import { useState } from 'react'

const MAX = 500

export function MessageComposer({
  bookId,
  initialMessage,
  creatorName,
  editorName,
}: {
  bookId: string
  initialMessage: string | null
  creatorName: string
  editorName: string | null
}) {
  type Mode = 'prompt' | 'editing' | 'saved'
  const [mode, setMode] = useState<Mode>(initialMessage ? 'saved' : 'prompt')
  const [saved, setSaved] = useState<string | null>(initialMessage)
  const [draft, setDraft] = useState(initialMessage ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const audience = editorName
    ? `只有 ${creatorName} 和 ${editorName} 看得到`
    : `只有 ${creatorName} 看得到`

  async function submit() {
    const body = draft.trim()
    if (!body || pending) return
    setPending(true)
    setError('')
    const prev = saved
    setSaved(body) // optimistic
    setMode('saved')
    try {
      const res = await fetch(`/api/books/${bookId}/message`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSaved(prev)
      setMode(prev ? 'saved' : 'editing')
      setError('送出失敗，請再試一次')
    } finally {
      setPending(false)
    }
  }

  async function withdraw() {
    if (!confirm('收回這句話？')) return
    setPending(true)
    setError('')
    const prev = saved
    setSaved(null)
    setDraft('')
    setMode('prompt')
    try {
      const res = await fetch(`/api/books/${bookId}/message`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      setSaved(prev)
      setDraft(prev ?? '')
      setMode('saved')
      setError('收回失敗，請再試一次')
    } finally {
      setPending(false)
    }
  }

  if (mode === 'saved' && saved) {
    return (
      <div className="mt-6 w-full text-center">
        <p className="mx-auto max-w-sm border-l-2 border-foreground/20 pl-3 text-left text-sm italic leading-relaxed text-muted-foreground">
          「{saved}」
        </p>
        <div className="mt-3 flex justify-center gap-4">
          <button onClick={() => { setDraft(saved); setMode('editing') }} className="text-xs text-primary underline underline-offset-2">
            修改
          </button>
          <button onClick={withdraw} disabled={pending} className="text-xs text-muted-foreground underline underline-offset-2">
            收回
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  if (mode === 'editing') {
    return (
      <div className="mt-6 w-full">
        <textarea
          autoFocus
          value={draft}
          maxLength={MAX}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`寫一句話…（${audience}）`}
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          rows={3}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{draft.length}/{MAX}</span>
          <button
            onClick={submit}
            disabled={pending || !draft.trim()}
            className="rounded-md bg-primary px-4 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            送出
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  // prompt
  return (
    <div className="mt-6 text-center">
      <button
        onClick={() => setMode('editing')}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        讀完了，想對 {creatorName} 說一句話嗎？（{audience}）
      </button>
    </div>
  )
}
