'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  defaultPlaceholder: string
  callbackUrl: string
}

export function HajimedeClient({ defaultPlaceholder, callbackUrl }: Props) {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/user/nickname', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })
      if (!res.ok) throw new Error('Failed to save nickname')
      router.push(callbackUrl)
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="nickname" className="text-sm text-foreground/60">
          我可以怎麼稱呼你？
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={defaultPlaceholder}
          disabled={isSubmitting}
          className="rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
        <p className="text-xs text-foreground/40">
          可以先維持空白，隨時歡迎你修改！
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-end rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {isSubmitting ? '...' : '繼續 →'}
      </button>
    </form>
  )
}
