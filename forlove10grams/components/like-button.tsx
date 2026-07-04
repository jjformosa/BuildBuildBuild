'use client'

import { useState } from 'react'

function getGramLevel(count: number) {
  if (count >= 10) return 4
  if (count >= 5) return 3
  if (count >= 3) return 2
  if (count >= 1) return 1
  return 0
}

export function LikeButton({
  bookId,
  initialHasLiked,
  initialLikeCount,
}: {
  bookId: string
  initialHasLiked: boolean
  initialLikeCount: number
}) {
  const [liked, setLiked] = useState(initialHasLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [pending, setPending] = useState(false)

  const toggle = async () => {
    if (pending) return
    const next = !liked
    const nextCount = Math.max(0, likeCount + (next ? 1 : -1))
    setLiked(next)
    setLikeCount(nextCount)
    setPending(true)
    try {
      const res = await fetch(`/api/books/${bookId}/like`, { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      const data: { liked: boolean; likeCount: number } = await res.json()
      setLiked(data.liked)
      setLikeCount(data.likeCount)
    } catch {
      setLiked(!next)
      setLikeCount(likeCount)
    } finally {
      setPending(false)
    }
  }

  const gramLevel = getGramLevel(likeCount)
  const needleAngle = [-42, -21, 0, 21, 42][gramLevel]
  const gramLabel = likeCount >= 10 ? '10g+' : `${likeCount}g`

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      className="group flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-6 py-5 text-primary shadow-sm transition-all duration-200 hover:border-primary/35 hover:bg-card disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
    >
      <span className="relative block h-[118px] w-[132px]" aria-hidden>
        <svg viewBox="0 0 132 118" className="h-full w-full overflow-visible">
          <path
            d="M20 22h92"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M32 26h68l-6 12H38Z"
            fill="#fffaf0"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M66 38v10"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M35 104h62a8 8 0 0 0 8-8V70a31 31 0 0 0-31-31H58a31 31 0 0 0-31 31v26a8 8 0 0 0 8 8Z"
            fill="currentColor"
            opacity="0.12"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            d="M43 79a23 23 0 0 1 46 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {[
            ['M43 79l-8 2', '0', 35, 91],
            ['M50 64l-6-6', '1', 44, 56],
            ['M66 56v-9', '3', 66, 43],
            ['M82 64l6-6', '5', 88, 56],
            ['M89 79l8 2', '10+', 98, 91],
          ].map(([path, mark, x, y]) => (
            <g key={path}>
              <path
                d={String(path)}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.72"
              />
              <text
                x={Number(x)}
                y={Number(y)}
                textAnchor="middle"
                className="fill-foreground/70 text-[7px] font-bold"
              >
                {mark}
              </text>
            </g>
          ))}
          <path
            d="M66 79 66 59"
            fill="none"
            stroke="#c4788a"
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              transformBox: 'fill-box',
              transformOrigin: '50% 100%',
              transform: `rotate(${needleAngle}deg)`,
              transition: 'transform 520ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
          <circle cx="66" cy="79" r="6" fill="#fffaf0" stroke="currentColor" strokeWidth="3" />
          <path
            d="M66 97c-8-6-13-10-13-16a7 7 0 0 1 13-4 7 7 0 0 1 13 4c0 6-5 10-13 16Z"
            fill={liked ? '#c4788a' : 'none'}
            stroke={liked ? '#c4788a' : 'currentColor'}
            strokeWidth="3"
            className="transition-all duration-200"
          />
          <text x="66" y="113" textAnchor="middle" className="fill-primary text-[12px] font-bold">
            {gramLabel}
          </text>
        </svg>
        {liked && (
          <span className="absolute left-1/2 top-[22px] h-8 w-8 -translate-x-1/2 rounded-full border border-gold/50 animate-[ping_0.7s_ease-out_1]" />
        )}
      </span>
      <span className="text-sm font-semibold tracking-wide text-foreground">
        {liked ? '已加上一克心意' : '把愛加一克'}
      </span>
      <span className="max-w-44 text-center text-xs leading-relaxed text-muted-foreground">
        {liked
          ? `這本書已累積 ${gramLabel} 心意`
          : '讀完後，放上你的 1g'}
      </span>
    </button>
  )
}
