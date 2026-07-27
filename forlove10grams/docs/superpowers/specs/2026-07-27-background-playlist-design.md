# 背景歌單 — Design Spec

**Date:** 2026-07-27
**Branch:** refactor-2026-with-claude

---

## Goals

讓 Creator / Editor / admin 為一本書設定一個 YouTube 播放清單作為背景音樂，讀者閱讀時自動播放；可選擇性地為特定頁面指定歌單中的某一首曲目，滑到該頁時跳轉播放。

### 核心行為

1. 書本層級設定一個 YouTube playlist 連結（非必填，每本書最多一個）。
2. 頁面層級可選擇性指定「歌單第幾首」（index，0-based）。
3. 沒有指定曲目的頁面：換頁時繼續播放目前曲目，該曲目自然播完後由 YouTube 自動接下一首。
4. 有指定曲目的頁面：滑到該頁時跳轉播放指定曲目；同一個閱讀 session 內第二次以後路過同一頁不重複跳轉。
5. 歌單播完自動從頭開始（loop）。

### 本次不在範圍

- Spotify / 自訂音檔清單（只支援 YouTube playlist）
- 歌單軌道標題選擇器（不接 YouTube Data API，指定曲目純用數字 index）
- 跨 reload / 跨 session 的播放進度或「已跳轉」狀態持久化
- 新增全站 admin 角色機制（沿用既有 `role==='admin'`）
- `/books/[bookId]/edit` 頁面本身的存取權限調整（該頁目前僅 `isOwner || isEditor` 可進入，non-owner/non-editor 的 admin 帳號進不去這個頁面，屬既有行為，不在本次調整）

---

## 權限

沿用既有 `canEditBook(userId, book, role)`（`lib/access.ts`）：

```typescript
export function canEditBook(userId: string, book: IBook, role?: string): boolean {
  if (role === 'admin') return true
  return isManager(userId, book) // book.createdBy === userId || book.editorId === userId
}
```

新增的 API route（歌單設定）與延伸的既有 route（頁面指定曲目）都套用這個 helper，不新增權限邏輯。

---

## 資料模型

### `Book`（`lib/models/book.ts`）

新增欄位：

```typescript
export interface IBackgroundPlaylist {
  url: string          // 原始貼上的網址，供編輯頁顯示/重新編輯
  playlistId: string   // 解析出的 YouTube list= 參數
}

export interface IBook extends Document {
  // ...既有欄位
  backgroundPlaylist?: IBackgroundPlaylist
}
```

```typescript
const BackgroundPlaylistSchema = new Schema<IBackgroundPlaylist>(
  {
    url: { type: String, required: true },
    playlistId: { type: String, required: true },
  },
  { _id: false }
)

// BookSchema 內新增
backgroundPlaylist: { type: BackgroundPlaylistSchema, default: undefined },
```

### `Page`（`lib/models/page.ts`）

新增欄位：

```typescript
export interface IPage extends Document {
  // ...既有欄位
  playlistTrackIndex?: number   // 歌單中第幾首（0-based）；未設定 = 不指定曲目
}
```

```typescript
// PageSchema 內新增
playlistTrackIndex: { type: Number, min: 0 },
```

---

## API

### `PATCH /api/books/[bookId]/playlist`（新增）

- Auth：`canEditBook(userId, book, role)`，比照 `share` route 的 `requireManager` 模式。
- Body：

```typescript
const PatchPlaylistBody = z.object({
  url: z.string().nullable(), // null 或空字串 = 移除歌單
})
```

- 邏輯：
  - `url` 為 `null` 或空字串 → `book.backgroundPlaylist = undefined`，儲存。
  - 否則，解析 `list=` 參數（支援 `youtube.com/playlist?list=...` 與 `youtube.com/watch?v=...&list=...` 兩種格式）。解析失敗回傳 `400`。
  - 解析成功 → `book.backgroundPlaylist = { url, playlistId }`，儲存。
- Response：更新後的 `book.backgroundPlaylist`（或 `null`）。

解析邏輯（供 route 使用）：

```typescript
function parseYouTubePlaylistId(url: string): string | null {
  try {
    const u = new URL(url)
    const list = u.searchParams.get('list')
    if (list && /^[\w-]+$/.test(list)) return list
    return null
  } catch {
    return null
  }
}
```

### `PATCH /api/books/[bookId]/pages/[pageId]`（延伸既有 route）

`PatchPageBody` zod schema 新增一個欄位：

```typescript
const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  happenedAt: z.string().nullable().optional(),
  durationSec: z.number().optional(),
  playlistTrackIndex: z.number().int().min(0).nullable().optional(), // 新增
})
```

`null` 表示清除指定曲目（回到「不指定」狀態）。既有的 auth 檢查（`canEditBook`）不變。

### `GET /api/books/[bookId]`、edit page、read page

- Edit page（`app/books/[bookId]/edit/page.tsx`）需要把 `book.backgroundPlaylist` 傳給 `BackgroundPlaylistManager`，並把每頁的 `playlistTrackIndex` 傳給 `BookEditorClient`。
- Read page（`app/read/[bookId]/page.tsx` → `ReadPageClient`）需要把 `book.backgroundPlaylist`（僅 `playlistId` 即可，不需暴露原始 `url`）與每頁的 `playlistTrackIndex` 傳給 `ReadPageClient` → `BackgroundPlaylistPlayer`。

---

## 編輯者 UI

### 書本層級：`BackgroundPlaylistManager`（新元件）

位置：`app/books/[bookId]/edit/page.tsx` 底部 section，與 `ShareLinkManager`、`ReaderList` 同排，權限比照 `(isOwner || isEditor)`：

```tsx
{(isOwner || isEditor) && (
  <BackgroundPlaylistManager
    bookId={bookId}
    initialPlaylist={book.backgroundPlaylist ?? null}
  />
)}
```

UI：

- 未設定時：輸入框（placeholder：貼上 YouTube 播放清單連結）+ 儲存按鈕。
- 已設定時：顯示目前連結（純文字或連結，不需嵌入預覽）+「移除」按鈕；也可直接編輯輸入框內容重新儲存覆蓋。
- 儲存中 / 錯誤狀態比照 `ShareLinkManager` 現有的 UI 語彙（例如「儲存中…」文字、無效連結時行內錯誤訊息）。
- 呼叫 `PATCH /api/books/[bookId]/playlist`。

### 頁面層級：`book-editor-client.tsx` 頁面編輯面板

在 `happenedAt` 欄位（約 line 460 附近）旁新增一個數字輸入框：

```tsx
{backgroundPlaylist && (
  <div>
    <label className="...">指定曲目（歌單第幾首，從 0 開始，留空 = 不指定）</label>
    <input
      type="number"
      min={0}
      value={selectedPage.playlistTrackIndex ?? ''}
      onChange={(e) => handlePlaylistTrackIndexChange(e.target.value)}
      className="..."
    />
  </div>
)}
```

- 只有當 `book.backgroundPlaylist` 存在時才顯示這個欄位（`BookEditorClient` 需要新增 `backgroundPlaylist: IBackgroundPlaylist | null` prop）。
- `handlePlaylistTrackIndexChange` 比照現有 `handleHappenedAtChange`（line 248）的 debounce-less 直接 PATCH 模式：空字串 → `null`（清除指定曲目），否則轉成 `number` 送出。
- `PageData` type（`components/book-editor-client.tsx` line 42 附近）新增 `playlistTrackIndex?: number | null`。

---

## 讀者端播放器架構

### `BackgroundPlaylistPlayer`（新元件）

掛載在 `ReadPageClient` 內，只有當 `backgroundPlaylist` 存在時才渲染：

```tsx
{backgroundPlaylist && (
  <BackgroundPlaylistPlayer
    playlistId={backgroundPlaylist.playlistId}
    activePageId={activePageId}
    pages={pages.map((p) => ({ _id: p._id, playlistTrackIndex: p.playlistTrackIndex ?? null }))}
  />
)}
```

### YouTube IFrame Player 初始化

- 動態注入 `<script src="https://www.youtube.com/iframe_api">`（若尚未載入），透過 `window.onYouTubeIframeAPIReady` 回呼取得 `window.YT.Player`。
- Player container 用「視覺隱藏但非 `display:none`」的方式掛載：

```tsx
<div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
  <div id="bg-playlist-player" />
</div>
```

  `display:none` 在部分瀏覽器會讓 iframe 進入 suspended 狀態，導致播放 / API 呼叫失效，因此改用零尺寸 + `opacity:0` 的方式維持 iframe 實際渲染。

- `playerVars`：

```typescript
{
  listType: 'playlist',
  list: playlistId,
  loop: 1,          // 歌單播完自動從頭開始，交給 YouTube 內建處理
  autoplay: 0,
  controls: 0,
  disablekb: 1,
}
```

### 首次啟動（瀏覽器自動播放限制）

瀏覽器會封鎖「未經使用者手勢就播放有聲內容」，但這個使用者手勢的授權屬於整個頁面（top-level document），不需要點在 YouTube iframe 本體上，只要我們的程式碼在點擊事件處理函式裡「同步」呼叫 `player.playVideo()` 即可。

實作：

- Player `onReady` 後，在 `document` 上掛一個 capture-phase、`{ once: true }` 的 `pointerdown` 監聽。
- 第一次觸發時：
  - 檢查當下 `activePageId` 對應的頁面是否有 `playlistTrackIndex`；有的話 `player.playVideoAt(index)` 並將該頁加入 `jumpedPageIds`；沒有的話直接 `player.playVideo()`（從歌單目前 cue 到的位置，通常是第 0 首開始）。
- 監聽器 `{ once: true }`，觸發後自動移除，不重複綁定。

### 換頁播放邏輯（核心狀態機）

- 內部維護 `jumpedPageIds: Set<string>`（component state，session-only，跟 `ReadPageClient` 既有的 `seenIds` 一樣：reload 就重置，不做持久化）。
- `useEffect` 監聽 `activePageId` 變化：

```typescript
useEffect(() => {
  if (!playerRef.current || !activePageId) return
  const page = pages.find((p) => p._id === activePageId)
  if (page?.playlistTrackIndex != null && !jumpedPageIds.has(activePageId)) {
    playerRef.current.playVideoAt(page.playlistTrackIndex)
    setJumpedPageIds((prev) => new Set(prev).add(activePageId))
  }
  // 無指定曲目，或已經跳過一次 → 不做任何事，讓目前曲目自然繼續 / 自然播完後交給 YouTube 自動接下一首
}, [activePageId])
```

- 這段邏輯只在「player 已經開始播放過」之後才有意義；若使用者還沒點擊觸發過第一次播放，`playVideoAt` 呼叫仍會設定好目標，等待手勢觸發時的邏輯以此為準（見上一節「首次啟動」）。

---

## FAB 控制 UI

- 畫面角落（建議右下角）一個收合的圓形 icon（例如音符符號），預設完全收合，不顯示任何影片畫面。
- 點擊展開一個小面板，兩個按鈕：
  - ▶ / ⏸ 播放·暫停切換（呼叫 `playVideo()` / `pauseVideo()`）
  - 🔇 / 🔊 靜音切換（呼叫 `mute()` / `unMute()`）
  - 不做獨立的「停止」按鈕。
- 面板狀態（播放中/暫停、靜音/非靜音）以 player 的 `onStateChange` 事件為準做同步，避免手動 state 與實際播放狀態不一致。

---

## File Map

### 新增

- `forlove10grams/app/api/books/[bookId]/playlist/route.ts` — PATCH 歌單設定
- `forlove10grams/components/background-playlist-manager.tsx` — 編輯頁書本層級歌單設定 UI
- `forlove10grams/components/background-playlist-player.tsx` — 讀者端 YouTube IFrame Player + 換頁播放邏輯
- `forlove10grams/lib/youtube-playlist.ts` — `parseYouTubePlaylistId` 等共用解析函式

### 修改

- `forlove10grams/lib/models/book.ts` — 新增 `backgroundPlaylist` 欄位
- `forlove10grams/lib/models/page.ts` — 新增 `playlistTrackIndex` 欄位
- `forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts` — `PatchPageBody` 新增 `playlistTrackIndex`
- `forlove10grams/app/books/[bookId]/edit/page.tsx` — 渲染 `BackgroundPlaylistManager`；把 `playlistTrackIndex` 傳給 `BookEditorClient`
- `forlove10grams/components/book-editor-client.tsx` — `PageData` 新增 `playlistTrackIndex`；頁面編輯面板新增指定曲目輸入框；新增 `handlePlaylistTrackIndexChange`
- `forlove10grams/app/read/[bookId]/page.tsx` — 把 `book.backgroundPlaylist`（僅 `playlistId`）與每頁 `playlistTrackIndex` 傳給 `ReadPageClient`
- `forlove10grams/components/read-page-client.tsx` — `ReadPageData` 新增 `playlistTrackIndex`；渲染 `BackgroundPlaylistPlayer`

---

## 明確不做的事

- Spotify / 自訂音檔清單支援
- 歌單軌道標題選擇器（YouTube Data API 整合）
- 跨 reload 的播放進度或「已跳轉」狀態持久化
- 全站 admin 角色機制的新增或調整（沿用既有 `role==='admin'`）
- `/books/[bookId]/edit` 頁面存取權限的調整
