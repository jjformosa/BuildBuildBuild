'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import logo from '@/public/logo.png'

gsap.registerPlugin(useGSAP, SplitText)

type Props = {
  defaultPlaceholder: string
  callbackUrl: string
}

export function HajimedeAnimator({ defaultPlaceholder, callbackUrl }: Props) {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const titleSplit = SplitText.create('.anim-title', { type: 'chars' })

    const tl = gsap.timeline({ delay: 0.3 })

    tl.from('.anim-logo', {
      scale: 0.55,
      opacity: 0,
      y: 180,
      duration: 0.85,
      ease: 'back.out(1.6)',
    })

    tl.from(titleSplit.chars, {
      opacity: 0,
      y: 48,
      duration: 0.55,
      stagger: 0.07,
      ease: 'power3.out',
    }, '-=0.2')

    tl.to('.anim-dust-wipe', {
      xPercent: 110,
      yPercent: -110,
      duration: 0.85,
      ease: 'power2.inOut',
    }, '-=0.2')
  }, { scope: containerRef })

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
    <div ref={containerRef} className="w-full max-w-sm px-6 flex flex-col gap-8">
      <div className="text-center flex flex-col items-center gap-4">
        <Image
          className="anim-logo"
          src={logo}
          alt="For Love 10 Grams"
          width={72}
          height={72}
        />
        <h1 className="anim-title text-2xl font-semibold text-foreground">
          嗨，歡迎你/妳
        </h1>
      </div>

      {/* 整個 form 是一個擦出區塊：subtitle、input、hint、button 一起入場 */}
      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden flex flex-col gap-6 p-1 -m-1"
      >
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

        {/* 灰塵遮罩：左下 (0,0) → 右上 (110%, -110%)，overflow:hidden 讓內容從左下角開始揭出 */}
        <div
          className="anim-dust-wipe pointer-events-none absolute -inset-0.5 bg-background"
          aria-hidden="true"
        />
      </form>
    </div>
  )
}
