import type { MouseEvent } from 'react'

export function createRipple(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2

  const span = document.createElement('span')
  span.className = 'ripple-effect'
  span.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`

  el.appendChild(span)
  span.addEventListener('animationend', () => span.remove(), { once: true })
}
