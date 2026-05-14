'use client'

import { useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function InviteEditorButton({ bookId }: { bookId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/books/${bookId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.error)
            ? data.error.map((i: { message: string }) => i.message).join(', ')
            : (data.error ?? '邀請失敗')
        )
      }
      setStatus('success')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : '邀請失敗')
    }
  }

  function handleClose() {
    setOpen(false)
    setStatus('idle')
    setEmail('')
    setErrorMsg('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-[#2C1810]/30 px-3 py-1.5 text-sm font-medium text-[#2C1810] hover:bg-[#2C1810]/8 transition-colors"
      >
        邀請編輯者
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-[#FAF7F2] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-[#2C1810]">邀請編輯者</h2>

            {status === 'success' ? (
              <div className="space-y-4">
                <p className="text-sm text-green-700">邀請成功！對方現在可以編輯此記憶書。</p>
                <button
                  onClick={handleClose}
                  className="w-full rounded-md bg-[#2C1810] py-2 text-sm font-medium text-[#FAF7F2]"
                >
                  關閉
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="invite-email" className="mb-1 block text-sm text-[#2C1810]/70">
                    Customer 帳號 Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-md border border-[#2C1810]/20 bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#2C1810]/40 focus:outline-none focus:ring-2 focus:ring-[#2C1810]/30"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-600">{errorMsg}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-md border border-[#2C1810]/20 py-2 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="flex-1 rounded-md bg-[#2C1810] py-2 text-sm font-medium text-[#FAF7F2] disabled:opacity-50 transition-opacity"
                  >
                    {status === 'loading' ? '邀請中…' : '送出邀請'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
