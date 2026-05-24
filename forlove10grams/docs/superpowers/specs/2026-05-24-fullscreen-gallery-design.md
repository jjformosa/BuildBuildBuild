# Fullscreen Gallery — Design Spec

**Date:** 2026-05-24  
**Scope:** `read/[bookId]` 頁面的 Carousel 全屏預覽體驗改善

---

## 背景與目標

現有的 `Carousel` 使用 `yet-another-react-lightbox` 做圖片全屏預覽，但在手機上體驗不佳：
- 版面以直立為主，橫向照片不夠大
- 左右換頁箭頭及底部 dot indicator 不明顯
- 有多餘的 library chrome 難以完全移除

目標：移除 yarl，改用自訂 `FullscreenGallery` 元件，提供真正填滿畫面、控制元件清晰可見的手機全屏預覽。

`VideoPlayer` 不變，原生 `controls` 的全屏功能已足夠。

---

## 版面設計

```
┌─────────────────────────────────────┐
│                              [ ✕ ]  │  ← 右上關閉，48×48 touch target
│                                     │
│  [  ‹  ]   ┌───────────┐  [  ›  ]  │  ← 左右各 64px 保留給箭頭按鈕
│             │           │           │
│             │   IMAGE   │           │  ← object-contain，不強迫滿版
│             │           │           │
│             └───────────┘           │
│                                     │
│             ● ○ ○ ○                │  ← 底部 56px 保留給 dot indicators
└─────────────────────────────────────┘
```

- 背景：`bg-black`，`fixed inset-0 z-50`
- 圖片區：`px-16 pt-12 pb-14`，圖片用 `object-contain` 自然置中
- 橫向照片自然填滿可用寬度；直向照片兩側留空，不強制滿版
- 圖片點擊觸發（保留現有行為），不另加按鈕

---

## 元件結構

```
components/
  fullscreen-gallery.tsx   ← 新元件
  carousel.tsx             ← 移除 yarl，改掛 FullscreenGallery
  video-player.tsx         ← 不動
```

### `FullscreenGallery`

```ts
type Props = {
  urls: string[]
  initialIndex: number
  onClose: () => void
}
```

**內部狀態：**
- `currentIndex: number` — 目前顯示第幾張

**Refs：**
- `touchStartX`, `touchStartY` — swipe 偵測，不觸發 re-render

**生命週期：**
- mount：`document.body.style.overflow = 'hidden'`
- unmount：還原 overflow

**鍵盤：**
- `Escape` → onClose
- `ArrowLeft` / `ArrowRight` → 換張

**觸控：**
- `onTouchStart`：記錄起始座標
- `onTouchEnd`：計算 deltaX / deltaY
- 條件：`|deltaX| > 50 && |deltaX| > |deltaY|` → 換張（避免誤觸縱向滾動）

### UI 元素細節

| 元素 | 樣式 |
|------|------|
| 關閉按鈕 | `absolute top-3 right-3`，`w-11 h-11`，白色 ✕ 圖示，半透明黑底圓形 |
| 左箭頭 | `absolute left-2`，垂直置中，`w-11 h-11`，白色 ‹，半透明黑底圓形，第一張時隱藏 |
| 右箭頭 | `absolute right-2`，垂直置中，同上，最後一張時隱藏 |
| Dot indicators | `absolute bottom-4`，水平置中，白色，選中點 `w-2.5 h-2.5` opacity-100，其他 `w-2 h-2` opacity-40 |
| 圖片 | `object-contain w-full h-full`，`<img>` 標籤（overlay 內不需要 Next.js Image 優化） |

### `Carousel` 改動

- 移除 `import Lightbox from 'yet-another-react-lightbox'`
- 移除 `import 'yet-another-react-lightbox/styles.css'`
- `<Lightbox ...>` 替換為：
  ```tsx
  {lightboxOpen && (
    <FullscreenGallery
      urls={urls}
      initialIndex={lightboxIndex}
      onClose={() => setLightboxOpen(false)}
    />
  )}
  ```

---

## 套件異動

- **移除**：`yet-another-react-lightbox`（`package.json` + `package-lock.json`）

---

## 邊界情況

- **只有 1 張圖**：左右箭頭全部隱藏，dot indicator 也隱藏（1 個點無意義）
- **圖片載入中**：顯示淡色 pulse placeholder，載入後淡入

---

## 不在範圍內

- VideoPlayer 全屏按鈕（原生 controls 已足夠）
- Carousel 本體（Embla 輪播）的任何改動
- 圖片縮放（pinch-to-zoom）
