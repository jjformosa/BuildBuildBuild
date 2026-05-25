'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'idle' | 'loading' | 'error'

export function CreateBookButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '建立失敗')
      router.push(`/books/${data._id}/edit`)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : '建立失敗')
    }
  }

  function handleClose() {
    setOpen(false)
    setStatus('idle')
    setTitle('')
    setErrorMsg('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        + 新增記憶書
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-foreground">新增記憶書</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="book-title"
                  className="mb-1 block text-sm text-foreground/70"
                >
                  標題
                </label>
                <input
                  id="book-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="我們的回憶"
                  className="w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/30"
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-600">{errorMsg}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-md border border-foreground/20 py-2 text-sm text-foreground hover:bg-foreground/5 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-opacity"
                >
                  {status === 'loading' ? '建立中…' : '建立'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
