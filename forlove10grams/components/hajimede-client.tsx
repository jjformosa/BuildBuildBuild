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
        <label htmlFor="nickname" className="text-sm text-[#2C1810]/60">
          我可以怎麼稱呼你？
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={defaultPlaceholder}
          disabled={isSubmitting}
          className="rounded-lg border border-[#2C1810]/20 bg-white px-4 py-3 text-[#2C1810] placeholder:text-[#2C1810]/30 focus:border-[#2C1810]/40 focus:outline-none focus:ring-1 focus:ring-[#2C1810]/20"
        />
        <p className="text-xs text-[#2C1810]/40">
          空白也沒關係，之後只要知道網址就可以再來修改
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-end rounded-lg bg-[#2C1810] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {isSubmitting ? '...' : '繼續 →'}
      </button>
    </form>
  )
}
