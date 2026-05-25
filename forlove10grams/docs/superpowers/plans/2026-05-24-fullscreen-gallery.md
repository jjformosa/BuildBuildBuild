# Fullscreen Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 以自訂 CSS fullscreen overlay 取代 `yet-another-react-lightbox`，讓 Carousel 的圖片全屏預覽在手機上佔滿整個畫面，並提供清晰的左右換頁箭頭與 dot indicators。

**Architecture:** 新增獨立元件 `FullscreenGallery`，由 `Carousel` 在使用者點擊圖片時掛載。`FullscreenGallery` 是純 client-side 的 fixed overlay，管理自身的 index 狀態、鍵盤事件與觸控 swipe。

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4, TypeScript

---

## File Map

| 動作 | 路徑 | 說明 |
|------|------|------|
| 新增 | `components/fullscreen-gallery.tsx` | 全屏 overlay 元件 |
| 修改 | `components/carousel.tsx` | 移除 yarl，改掛 FullscreenGallery |
| 修改 | `package.json` | 移除 yet-another-react-lightbox |

---

## Task 1: 新增 `FullscreenGallery` 元件

**Files:**
- Create: `forlove10grams/components/fullscreen-gallery.tsx`

- [x] **Step 1: 建立檔案，寫入完整元件**

建立 `forlove10grams/components/fullscreen-gallery.tsx`，內容如下：

```tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Props = {
  urls: string[]
  initialIndex: number
  onClose: () => void
}

export function FullscreenGallery({ urls, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const prev = useCallback(() => setCurrentIndex(i => Math.max(0, i - 1)), [])
  const next = useCallback(
    () => setCurrentIndex(i => Math.min(urls.length - 1, i + 1)),
    [urls.length]
  )

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) prev()
      else next()
    }
  }

  const multipleImages = urls.length > 1

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="關閉"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M4 4L16 16M16 4L4 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Image area — padded to reserve space for controls */}
      <div className="absolute inset-0 px-16 pt-12 pb-14 flex items-center justify-center">
        <ImageSlide key={urls[currentIndex]} src={urls[currentIndex]} />
      </div>

      {/* Prev arrow */}
      {multipleImages && currentIndex > 0 && (
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="上一張"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M13 4L7 10L13 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {multipleImages && currentIndex < urls.length - 1 && (
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="下一張"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M7 4L13 10L7 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Dot indicators */}
      {multipleImages && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`第 ${i + 1} 張`}
              className={`rounded-full transition-all ${
                i === currentIndex
                  ? 'w-2.5 h-2.5 bg-white opacity-100'
                  : 'w-2 h-2 bg-white opacity-40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ImageSlide({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/5" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
```

- [x] **Step 2: 確認 TypeScript 無報錯**

```bash
cd forlove10grams && npx tsc --noEmit 2>&1 | head -20
```

預期：無 error 輸出（或只有與本次修改無關的既有 warning）

- [x] **Step 3: Commit**

```bash
git add forlove10grams/components/fullscreen-gallery.tsx
git commit -m "feat: add FullscreenGallery component for mobile fullscreen image preview"
```

---

## Task 2: 更新 `Carousel` 元件

**Files:**
- Modify: `forlove10grams/components/carousel.tsx`

- [x] **Step 1: 移除 yarl imports，加入 FullscreenGallery**

開啟 `forlove10grams/components/carousel.tsx`。

移除第 6-7 行：
```tsx
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
```

在第 5 行（`import type { EmblaCarouselType }...` 之後）加入：
```tsx
import { FullscreenGallery } from '@/components/fullscreen-gallery'
```

- [x] **Step 2: 替換 `<Lightbox>` 為 `<FullscreenGallery>`**

找到檔案底部的：
```tsx
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={urls.map((src) => ({ src }))}
      />
```

替換為：
```tsx
      {lightboxOpen && (
        <FullscreenGallery
          urls={urls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
```

- [x] **Step 3: 確認 TypeScript 無報錯**

```bash
cd forlove10grams && npx tsc --noEmit 2>&1 | head -20
```

預期：無新增 error

- [x] **Step 4: Commit**

```bash
git add forlove10grams/components/carousel.tsx
git commit -m "feat: replace yet-another-react-lightbox with FullscreenGallery in Carousel"
```

---

## Task 3: 移除 `yet-another-react-lightbox` 套件

**Files:**
- Modify: `forlove10grams/package.json`

- [x] **Step 1: 移除套件（由使用者執行）**

> ⚠️ 此指令需要使用者在終端機手動執行（`! <command>` 語法可在 Claude Code 中直接執行）：

```bash
cd forlove10grams && npm uninstall yet-another-react-lightbox
```

預期：`package.json` 中 `yet-another-react-lightbox` 條目消失，`node_modules` 中對應資料夾被移除。

- [x] **Step 2: 確認 build 正常**

```bash
cd forlove10grams && npm run build 2>&1 | tail -20
```

預期：build 成功，無與 `yet-another-react-lightbox` 相關的 import error。

- [x] **Step 3: Commit**

```bash
git add forlove10grams/package.json forlove10grams/package-lock.json
git commit -m "chore: remove yet-another-react-lightbox dependency"
```

---

## Task 4: 人工驗證

- [x] **Step 1: 啟動 dev server（由使用者執行）**

```bash
cd forlove10grams && npm run dev
```

- [x] **Step 2: 驗證項目清單**

前往任一有 Carousel 的 `read/[bookId]` 頁面，逐項確認：

| 項目 | 預期行為 |
|------|----------|
| 點擊圖片 | 開啟黑底全屏 overlay |
| 全屏中圖片顯示 | `object-contain`，橫向照片填滿寬度，不裁切 |
| 關閉按鈕（右上角） | 點擊後 overlay 消失，頁面捲動恢復正常 |
| 左右箭頭 | 第一張時左箭頭隱藏，最後一張時右箭頭隱藏 |
| Dot indicators | 選中點較大且全亮，其餘較小半透明 |
| 點擊 dot | 跳到對應張數 |
| 手機左右滑 | 換張（垂直滑不觸發） |
| 鍵盤 Escape | 關閉 overlay |
| 鍵盤 ← / → | 換張 |
| 只有 1 張圖 | 箭頭與 dots 均不顯示 |
| 圖片載入中 | 顯示 pulse placeholder，載入後淡入 |
