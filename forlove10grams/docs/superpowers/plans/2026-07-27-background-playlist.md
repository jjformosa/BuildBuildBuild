# 背景歌單 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Creator/Editor/admin 為一本書設定 YouTube 背景播放清單，讀者閱讀時自動播放；可選擇性為特定頁面指定歌單中的曲目 index，滑到該頁時跳轉播放一次。

**Architecture:** `Book.backgroundPlaylist`（`{url, playlistId}`）與 `Page.playlistTrackIndex` 兩個新資料欄位；一個新的 PATCH API route 設定歌單、延伸既有的頁面 PATCH/GET route 帶入 `playlistTrackIndex`；編輯頁新增 `BackgroundPlaylistManager`（書本層級）與一個數字輸入框（頁面層級，插入 `book-editor-client.tsx` 既有面板）；讀者端新增 `BackgroundPlaylistPlayer`，用 YouTube IFrame Player API 隱藏播放，依 `activePageId` 變化驅動跳轉邏輯，角落 FAB 提供播放/暫停與靜音。

**Tech Stack:** Next.js App Router、Mongoose、Zod、YouTube IFrame Player API（`https://www.youtube.com/iframe_api`，無需 API key）。

**關於測試方式：** 這個專案目前沒有任何自動化測試框架（`package.json` 沒有 test script，repo 裡沒有任何 `*.test.ts(x)` 檔案）。為了不引入一整套跟這次功能無關的測試基礎建設，本計畫的每個 task 用「手動驗證」取代自動化測試：`npx tsc --noEmit` 做型別檢查、`npm run dev` 起本機伺服器後用瀏覽器操作 UI，或在瀏覽器 devtools console 用 `fetch(...)`（沿用目前登入的 session cookie）直接打 API route 驗證。這跟專案既有的驗證方式一致。

---

## Task 1: 資料模型 — Book.backgroundPlaylist + Page.playlistTrackIndex

**Files:**
- Modify: `forlove10grams/lib/models/book.ts`
- Modify: `forlove10grams/lib/models/page.ts`

- [ ] **Step 1: 在 `lib/models/book.ts` 新增 `backgroundPlaylist` 欄位**

把檔案開頭的 import 與型別區塊：

```typescript
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export type ShareStatus = 'private' | 'shared' | 'public'

export interface IBook extends Document {
  title: string
  description?: string
  coverImage?: string
  createdBy: Types.ObjectId
  editorId?: Types.ObjectId
  editorLetter?: string
  pageOrder: Types.ObjectId[]
  shareStatus: ShareStatus
  tags: string[]
}
```

改成：

```typescript
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export type ShareStatus = 'private' | 'shared' | 'public'

export interface IBackgroundPlaylist {
  url: string
  playlistId: string
}

export interface IBook extends Document {
  title: string
  description?: string
  coverImage?: string
  createdBy: Types.ObjectId
  editorId?: Types.ObjectId
  editorLetter?: string
  pageOrder: Types.ObjectId[]
  shareStatus: ShareStatus
  tags: string[]
  backgroundPlaylist?: IBackgroundPlaylist
}
```

再把 `BookSchema` 定義：

```typescript
const BookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true },
    description: String,
    coverImage: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User' },
    editorLetter: { type: String },
    pageOrder: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
    shareStatus: {
      type: String,
      enum: ['private', 'shared', 'public'],
      default: 'private',
    },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
)
```

改成：

```typescript
const BackgroundPlaylistSchema = new Schema<IBackgroundPlaylist>(
  {
    url: { type: String, required: true },
    playlistId: { type: String, required: true },
  },
  { _id: false }
)

const BookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true },
    description: String,
    coverImage: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User' },
    editorLetter: { type: String },
    pageOrder: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
    shareStatus: {
      type: String,
      enum: ['private', 'shared', 'public'],
      default: 'private',
    },
    tags: { type: [String], default: [] },
    backgroundPlaylist: { type: BackgroundPlaylistSchema, default: undefined },
  },
  { timestamps: true }
)
```

- [ ] **Step 2: 在 `lib/models/page.ts` 新增 `playlistTrackIndex` 欄位**

把 `IPage` 介面：

```typescript
export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video' | 'audio'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
  happenedAt?: Date
  durationSec?: number
  transcriptionStatus?: 'pending' | 'done' | 'error'
}
```

改成：

```typescript
export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video' | 'audio'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
  happenedAt?: Date
  durationSec?: number
  transcriptionStatus?: 'pending' | 'done' | 'error'
  playlistTrackIndex?: number
}
```

再把 `PageSchema` 定義裡的欄位區塊：

```typescript
    transcriptionStatus: {
      type: String,
      enum: ['pending', 'done', 'error'],
    },
  },
  { timestamps: true }
)
```

改成：

```typescript
    transcriptionStatus: {
      type: String,
      enum: ['pending', 'done', 'error'],
    },
    playlistTrackIndex: { type: Number, min: 0 },
  },
  { timestamps: true }
)
```

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤輸出（exit code 0）。

- [ ] **Step 4: Commit**

```bash
git add lib/models/book.ts lib/models/page.ts
git commit -m "feat: add backgroundPlaylist and playlistTrackIndex fields to models"
```

---

## Task 2: YouTube 播放清單網址解析工具

**Files:**
- Create: `forlove10grams/lib/youtube-playlist.ts`

- [ ] **Step 1: 建立解析函式**

```typescript
export function parseYouTubePlaylistId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const list = parsed.searchParams.get('list')
  if (!list || !/^[\w-]+$/.test(list)) return null
  return list
}
```

支援兩種輸入格式：
- `https://www.youtube.com/playlist?list=PLxxxxxxxx`
- `https://www.youtube.com/watch?v=xxxxxxxx&list=PLxxxxxxxx`

不合法網址（無法 parse、沒有 `list` 參數、`list` 參數含有非 `\w-` 字元）一律回傳 `null`。

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤（此時函式尚未被任何地方 import，屬正常未使用狀態，不會報錯）。

- [ ] **Step 3: Commit**

```bash
git add lib/youtube-playlist.ts
git commit -m "feat: add YouTube playlist URL parser"
```

*（這個函式的實際行為驗證會在 Task 3 透過真正呼叫 API route 完成 — 專案沒有測試框架，用整合層級驗證取代單元測試。）*

---

## Task 3: PATCH /api/books/[bookId]/playlist route

**Files:**
- Create: `forlove10grams/app/api/books/[bookId]/playlist/route.ts`

- [ ] **Step 1: 建立 route**

```typescript
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import { canEditBook } from '@/lib/access'
import { parseYouTubePlaylistId } from '@/lib/youtube-playlist'

const PatchPlaylistBody = z.object({
  url: z.string().nullable(),
})

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/playlist'>
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await ctx.params
  const body = await req.json()
  const parsed = PatchPlaylistBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (!canEditBook(session.user.id!, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { url } = parsed.data
  if (!url) {
    book.backgroundPlaylist = undefined
    await book.save()
    return Response.json({ backgroundPlaylist: null })
  }

  const playlistId = parseYouTubePlaylistId(url)
  if (!playlistId) {
    return Response.json({ error: '無法解析播放清單連結' }, { status: 400 })
  }

  book.backgroundPlaylist = { url, playlistId }
  await book.save()

  return Response.json({ backgroundPlaylist: book.backgroundPlaylist })
}
```

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 3: 手動驗證（瀏覽器 devtools console）**

Run: `npm run dev`

用瀏覽器登入（你的 admin 帳號），打開任一本你擁有的書的編輯頁（`/books/<bookId>/edit`），開 devtools console，執行（把 `<bookId>` 換成網址列上實際的 bookId）：

```js
fetch(`/api/books/<bookId>/playlist`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://www.youtube.com/playlist?list=PLtest123ABC' }),
}).then(r => r.json()).then(console.log)
```

Expected: `{ backgroundPlaylist: { url: 'https://www.youtube.com/playlist?list=PLtest123ABC', playlistId: 'PLtest123ABC' } }`

再測試無效網址：

```js
fetch(`/api/books/<bookId>/playlist`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/not-a-playlist' }),
}).then(r => r.json()).then(console.log)
```

Expected: `{ error: '無法解析播放清單連結' }`（HTTP 400）

再測試移除：

```js
fetch(`/api/books/<bookId>/playlist`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: null }),
}).then(r => r.json()).then(console.log)
```

Expected: `{ backgroundPlaylist: null }`

- [ ] **Step 4: Commit**

```bash
git add "app/api/books/[bookId]/playlist/route.ts"
git commit -m "feat: add PATCH /api/books/[bookId]/playlist route"
```

---

## Task 4: BackgroundPlaylistManager 元件（書本層級 UI）

**Files:**
- Create: `forlove10grams/components/background-playlist-manager.tsx`

- [ ] **Step 1: 建立元件**

```tsx
'use client'

import { useState } from 'react'

interface BackgroundPlaylistState {
  url: string
  playlistId: string
}

export function BackgroundPlaylistManager({
  bookId,
  initialPlaylist,
}: {
  bookId: string
  initialPlaylist: BackgroundPlaylistState | null
}) {
  const [playlist, setPlaylist] = useState<BackgroundPlaylistState | null>(initialPlaylist)
  const [urlInput, setUrlInput] = useState(initialPlaylist?.url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/playlist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '儲存失敗')
      setPlaylist(data.backgroundPlaylist)
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/playlist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: null }),
      })
      if (!res.ok) throw new Error('移除失敗')
      setPlaylist(null)
      setUrlInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">背景歌單</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="貼上 YouTube 播放清單連結"
          className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
        />
        <button onClick={handleSave} disabled={saving} className="btn-outline-xs">
          {saving ? '儲存中…' : '儲存'}
        </button>
        {playlist && (
          <button onClick={handleRemove} disabled={saving} className="btn-danger-xs">
            移除
          </button>
        )}
      </div>

      {playlist && (
        <p className="text-xs text-foreground/50">目前歌單 ID：{playlist.playlistId}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 3: Commit**

```bash
git add components/background-playlist-manager.tsx
git commit -m "feat: add BackgroundPlaylistManager component"
```

*（實際渲染與互動驗證在 Task 5 完成元件掛載後進行。）*

---

## Task 5: 把 BackgroundPlaylistManager 掛進編輯頁

**Files:**
- Modify: `forlove10grams/app/books/[bookId]/edit/page.tsx`

- [ ] **Step 1: 加入 import**

把檔案開頭的 import 區塊：

```typescript
import { ReaderList } from '@/components/reader-list'
import { isQuickCaptureMode, type QuickCaptureMode } from '@/lib/quick-capture'
```

改成：

```typescript
import { ReaderList } from '@/components/reader-list'
import { BackgroundPlaylistManager } from '@/components/background-playlist-manager'
import { isQuickCaptureMode, type QuickCaptureMode } from '@/lib/quick-capture'
```

- [ ] **Step 2: 在底部 section 加入元件**

把：

```tsx
      <section className="flex-none border-t border-foreground/10 bg-background px-4 sm:px-6 py-4 space-y-6">
        {(isOwner || isEditor) && <ShareLinkManager bookId={bookId} />}
        {(isOwner || isEditor) && (
          <ReaderList bookId={bookId} shareStatus={book.shareStatus} />
        )}
      </section>
```

改成：

```tsx
      <section className="flex-none border-t border-foreground/10 bg-background px-4 sm:px-6 py-4 space-y-6">
        {(isOwner || isEditor) && <ShareLinkManager bookId={bookId} />}
        {(isOwner || isEditor) && (
          <ReaderList bookId={bookId} shareStatus={book.shareStatus} />
        )}
        {(isOwner || isEditor) && (
          <BackgroundPlaylistManager
            bookId={bookId}
            initialPlaylist={
              book.backgroundPlaylist
                ? { url: book.backgroundPlaylist.url, playlistId: book.backgroundPlaylist.playlistId }
                : null
            }
          />
        )}
      </section>
```

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 4: 手動驗證（瀏覽器）**

Run: `npm run dev`

1. 登入後打開任一本你擁有（或身為 editor）的書的編輯頁，捲到底部，應該看到「背景歌單」區塊。
2. 貼上一個真實的 YouTube 播放清單連結（例如任一公開播放清單的網址），點「儲存」。應該看到「目前歌單 ID：xxxx」顯示出來。
3. 重新整理頁面（真正的 full page reload），確認歌單 ID 仍然顯示（代表資料有正確存進 DB 並在 server component 重新讀出）。
4. 貼上一個無效網址（例如 `https://example.com`），點「儲存」，應該看到紅字錯誤訊息「無法解析播放清單連結」。
5. 點「移除」，確認畫面回到只剩輸入框的狀態；重新整理頁面確認歌單已清除。

- [ ] **Step 5: Commit**

```bash
git add "app/books/[bookId]/edit/page.tsx"
git commit -m "feat: wire BackgroundPlaylistManager into edit page"
```

---

## Task 6: 延伸頁面 API — playlistTrackIndex

**Files:**
- Modify: `forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts`
- Modify: `forlove10grams/app/api/books/[bookId]/pages/route.ts`

- [ ] **Step 1: 延伸 `PatchPageBody` schema**

在 `app/api/books/[bookId]/pages/[pageId]/route.ts`，把：

```typescript
const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  happenedAt: z.string().nullable().optional(),
  durationSec: z.number().optional(),
})
```

改成：

```typescript
const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  happenedAt: z.string().nullable().optional(),
  durationSec: z.number().optional(),
  playlistTrackIndex: z.number().int().min(0).nullable().optional(),
})
```

PATCH handler 本體不需要改（`Object.assign(page, parsed.data)` 已經會處理新欄位，`null` 表示清除指定曲目）。

- [ ] **Step 2: 延伸無限捲動用的 pages 列表 GET route**

在 `app/api/books/[bookId]/pages/route.ts`，把 GET handler 裡的回應 mapping：

```typescript
    .map((p) => ({
      _id: p!._id.toString(),
      type: p!.type,
      content: p!.content ?? '',
      mediaUrls: p!.type === 'video' ? p!.mediaUrls : p!.mediaUrls.map(signImageUrl),
      transcodingStatus: p!.transcodingStatus ?? null,
      durationSec: p!.durationSec ?? null,
      transcriptionStatus: p!.transcriptionStatus ?? null,
    }))
```

改成：

```typescript
    .map((p) => ({
      _id: p!._id.toString(),
      type: p!.type,
      content: p!.content ?? '',
      mediaUrls: p!.type === 'video' ? p!.mediaUrls : p!.mediaUrls.map(signImageUrl),
      transcodingStatus: p!.transcodingStatus ?? null,
      durationSec: p!.durationSec ?? null,
      transcriptionStatus: p!.transcriptionStatus ?? null,
      playlistTrackIndex: p!.playlistTrackIndex ?? null,
    }))
```

這一步很重要：讀者頁用 infinite scroll 分批載入頁面（每批 5 筆），如果這裡不帶 `playlistTrackIndex`，滾動載入進來的頁面就會遺失指定曲目的資訊。

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 4: 手動驗證**

Run: `npm run dev`（若尚未啟動）

在任一本書的讀者頁（`/read/<bookId>`），開 devtools console 執行：

```js
fetch(`/api/books/<bookId>/pages?limit=5`).then(r => r.json()).then(console.log)
```

Expected: 回傳陣列中每個物件都有 `playlistTrackIndex` key（目前應該都是 `null`，因為還沒有任何頁面設定過）。

- [ ] **Step 5: Commit**

```bash
git add "app/api/books/[bookId]/pages/[pageId]/route.ts" "app/api/books/[bookId]/pages/route.ts"
git commit -m "feat: extend page APIs with playlistTrackIndex"
```

---

## Task 7: 編輯頁 — 頁面層級「指定曲目」輸入框

**Files:**
- Modify: `forlove10grams/components/book-editor-client.tsx`
- Modify: `forlove10grams/app/books/[bookId]/edit/page.tsx`

- [ ] **Step 1: 延伸 `PageData` type**

在 `components/book-editor-client.tsx`，把：

```typescript
export type PageData = {
  _id: string
  type: 'carousel' | 'video' | 'audio'
  content?: string
  mediaUrls: string[]
  happenedAt?: string | null
  durationSec?: number | null
}
```

改成：

```typescript
export type PageData = {
  _id: string
  type: 'carousel' | 'video' | 'audio'
  content?: string
  mediaUrls: string[]
  happenedAt?: string | null
  durationSec?: number | null
  playlistTrackIndex?: number | null
}
```

- [ ] **Step 2: 元件新增 `backgroundPlaylist` prop**

把元件簽名：

```typescript
export function BookEditorClient({
  bookId,
  initialPages,
  initialTags,
  quickMode,
}: {
  bookId: string
  initialPages: PageData[]
  initialTags: string[]
  quickMode?: QuickCaptureMode | null
}) {
```

改成：

```typescript
export function BookEditorClient({
  bookId,
  initialPages,
  initialTags,
  quickMode,
  backgroundPlaylist,
}: {
  bookId: string
  initialPages: PageData[]
  initialTags: string[]
  quickMode?: QuickCaptureMode | null
  backgroundPlaylist: { playlistId: string } | null
}) {
```

- [ ] **Step 3: 新增 change handler**

在 `handleHappenedAtChange` 函式定義之後（緊接著）加入：

```typescript
  function handlePlaylistTrackIndexChange(value: string) {
    const currentId = selectedId
    if (!currentId) return
    const playlistTrackIndex = value === '' ? null : Number(value)
    setPages((prev) => prev.map((p) => (p._id === currentId ? { ...p, playlistTrackIndex } : p)))
    fetch(`/api/books/${bookId}/pages/${currentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistTrackIndex }),
    })
  }
```

- [ ] **Step 4: 加入輸入框 UI**

把頁面編輯面板的 header 區塊：

```tsx
                <input
                  type="date"
                  value={selectedPage.happenedAt ?? ''}
                  onChange={(e) => handleHappenedAtChange(e.target.value)}
                  className="rounded border border-foreground/15 bg-transparent px-1.5 py-0.5 text-xs text-foreground/60"
                />
                {selectedPage.happenedAt && (
                  <button
                    onClick={() => handleHappenedAtChange('')}
                    className="text-xs text-foreground/30 hover:text-foreground/60"
                    title="清除日期"
                  >
                    ✕
                  </button>
                )}
              </div>
```

改成：

```tsx
                <input
                  type="date"
                  value={selectedPage.happenedAt ?? ''}
                  onChange={(e) => handleHappenedAtChange(e.target.value)}
                  className="rounded border border-foreground/15 bg-transparent px-1.5 py-0.5 text-xs text-foreground/60"
                />
                {selectedPage.happenedAt && (
                  <button
                    onClick={() => handleHappenedAtChange('')}
                    className="text-xs text-foreground/30 hover:text-foreground/60"
                    title="清除日期"
                  >
                    ✕
                  </button>
                )}
                {backgroundPlaylist && (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={selectedPage.playlistTrackIndex ?? ''}
                      onChange={(e) => handlePlaylistTrackIndexChange(e.target.value)}
                      placeholder="指定曲目 index"
                      title="歌單中第幾首（從 0 開始），留空 = 不指定"
                      className="w-28 rounded border border-foreground/15 bg-transparent px-1.5 py-0.5 text-xs text-foreground/60"
                    />
                    {selectedPage.playlistTrackIndex != null && (
                      <button
                        onClick={() => handlePlaylistTrackIndexChange('')}
                        className="text-xs text-foreground/30 hover:text-foreground/60"
                        title="清除指定曲目"
                      >
                        ✕
                      </button>
                    )}
                  </>
                )}
              </div>
```

- [ ] **Step 5: `handleAddPage` 的新頁面物件補上欄位**

把：

```typescript
        const newPage: PageData = {
          _id: raw._id,
          type: raw.type,
          content: raw.content,
          mediaUrls: raw.mediaUrls ?? [],
          happenedAt: raw.happenedAt ?? null,
          durationSec: raw.durationSec ?? null,
        }
```

改成：

```typescript
        const newPage: PageData = {
          _id: raw._id,
          type: raw.type,
          content: raw.content,
          mediaUrls: raw.mediaUrls ?? [],
          happenedAt: raw.happenedAt ?? null,
          durationSec: raw.durationSec ?? null,
          playlistTrackIndex: raw.playlistTrackIndex ?? null,
        }
```

- [ ] **Step 6: 編輯頁 server component 傳入資料**

在 `app/books/[bookId]/edit/page.tsx`，把 pages mapping：

```typescript
  const pages: PageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content,
    mediaUrls: p.type === 'video' ? p.mediaUrls : p.mediaUrls.map(signImageUrl),
    happenedAt: p.happenedAt ? p.happenedAt.toISOString().slice(0, 10) : null,
    durationSec: p.durationSec ?? null,
  }))
```

改成：

```typescript
  const pages: PageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content,
    mediaUrls: p.type === 'video' ? p.mediaUrls : p.mediaUrls.map(signImageUrl),
    happenedAt: p.happenedAt ? p.happenedAt.toISOString().slice(0, 10) : null,
    durationSec: p.durationSec ?? null,
    playlistTrackIndex: p.playlistTrackIndex ?? null,
  }))
```

再把 `<BookEditorClient>` 的呼叫：

```tsx
      <BookEditorClient
        bookId={bookId}
        initialPages={pages}
        initialTags={book.tags ?? []}
        quickMode={quickMode}
      />
```

改成：

```tsx
      <BookEditorClient
        bookId={bookId}
        initialPages={pages}
        initialTags={book.tags ?? []}
        quickMode={quickMode}
        backgroundPlaylist={
          book.backgroundPlaylist ? { playlistId: book.backgroundPlaylist.playlistId } : null
        }
      />
```

- [ ] **Step 7: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 8: 手動驗證（瀏覽器）**

Run: `npm run dev`（若尚未啟動）

1. 打開一本「已設定背景歌單」的書的編輯頁（延續 Task 5 的驗證，該書應該已有歌單）。
2. 選一個頁面，應該看到 header 上多了一個「指定曲目 index」的數字輸入框。
3. 輸入 `1`，等它自動儲存（跟 `happenedAt` 一樣是失焦即送出，沒有 debounce），重新整理頁面，確認欄位值還是 `1`。
4. 清空欄位（點 ✕ 或刪掉數字），重新整理頁面，確認欄位變回空白。
5. 打開一本「沒有設定背景歌單」的書的編輯頁，確認完全看不到這個輸入框（`backgroundPlaylist` 為 `null` 時不渲染）。

- [ ] **Step 9: Commit**

```bash
git add components/book-editor-client.tsx "app/books/[bookId]/edit/page.tsx"
git commit -m "feat: add per-page playlist track index editor UI"
```

---

## Task 8: 讀者端資料串接（page.tsx → ReadPageClient）

**Files:**
- Modify: `forlove10grams/app/read/[bookId]/page.tsx`
- Modify: `forlove10grams/components/read-page-client.tsx`

- [ ] **Step 1: 延伸 `ReadPageData` type**

在 `components/read-page-client.tsx`，把：

```typescript
export type ReadPageData = {
  _id: string
  type: 'carousel' | 'video' | 'audio'
  content: string
  mediaUrls: string[]
  transcodingStatus?: 'pending' | 'processing' | 'ready' | 'error' | null
  durationSec?: number | null
}
```

改成：

```typescript
export type ReadPageData = {
  _id: string
  type: 'carousel' | 'video' | 'audio'
  content: string
  mediaUrls: string[]
  transcodingStatus?: 'pending' | 'processing' | 'ready' | 'error' | null
  durationSec?: number | null
  playlistTrackIndex?: number | null
}
```

- [ ] **Step 2: `ReadPageClient` 新增 `backgroundPlaylist` prop**

把 `Props` type：

```typescript
type Props = {
  bookId: string
  bookTitle: string
  initialPages: ReadPageData[]
  totalCount: number
  viewerNickname: string | null
  viewerMyNickname: string | null
  hasLiked: boolean
  likeCount: number
  isEditor?: boolean
  editorLetter?: string | null
  creatorName?: string | null
  canMessage?: boolean
  initialMessage?: string | null
  messageCreatorName?: string
  messageEditorName?: string | null
}
```

改成：

```typescript
type Props = {
  bookId: string
  bookTitle: string
  initialPages: ReadPageData[]
  totalCount: number
  viewerNickname: string | null
  viewerMyNickname: string | null
  hasLiked: boolean
  likeCount: number
  isEditor?: boolean
  editorLetter?: string | null
  creatorName?: string | null
  canMessage?: boolean
  initialMessage?: string | null
  messageCreatorName?: string
  messageEditorName?: string | null
  backgroundPlaylist?: { playlistId: string } | null
}
```

把函式簽名的解構參數：

```typescript
export function ReadPageClient({
  bookId, bookTitle, initialPages, totalCount,
  viewerNickname, viewerMyNickname, hasLiked, likeCount, isEditor, editorLetter, creatorName,
  canMessage, initialMessage, messageCreatorName, messageEditorName,
}: Props) {
```

改成：

```typescript
export function ReadPageClient({
  bookId, bookTitle, initialPages, totalCount,
  viewerNickname, viewerMyNickname, hasLiked, likeCount, isEditor, editorLetter, creatorName,
  canMessage, initialMessage, messageCreatorName, messageEditorName, backgroundPlaylist,
}: Props) {
```

*（`BackgroundPlaylistPlayer` 的實際掛載延到 Task 9 完成元件本體後再做，這個 task 先確保型別與 prop 一路傳到底。）*

- [ ] **Step 3: `app/read/[bookId]/page.tsx` 傳入資料**

把 `initialPages` mapping：

```typescript
  const initialPages: ReadPageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content ?? '',
    mediaUrls: p.type === 'video' ? p.mediaUrls : p.mediaUrls.map(signImageUrl),
    transcodingStatus: p.transcodingStatus ?? null,
    durationSec: p.durationSec ?? null,
  }))
```

改成：

```typescript
  const initialPages: ReadPageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content ?? '',
    mediaUrls: p.type === 'video' ? p.mediaUrls : p.mediaUrls.map(signImageUrl),
    transcodingStatus: p.transcodingStatus ?? null,
    durationSec: p.durationSec ?? null,
    playlistTrackIndex: p.playlistTrackIndex ?? null,
  }))
```

把 `<ReadPageClient>` 呼叫：

```tsx
    <ReadPageClient
      bookId={bookId}
      bookTitle={book.title}
      initialPages={initialPages}
      totalCount={totalCount}
      viewerNickname={viewerNickname}
      viewerMyNickname={viewerMyNickname}
      hasLiked={hasLiked}
      likeCount={likeCount}
      isEditor={isEditor}
      editorLetter={book.editorLetter ?? null}
      creatorName={creatorName}
      canMessage={canMessage}
      initialMessage={initialMessage}
      messageCreatorName={messageCreatorName}
      messageEditorName={messageEditorName}
    />
```

改成：

```tsx
    <ReadPageClient
      bookId={bookId}
      bookTitle={book.title}
      initialPages={initialPages}
      totalCount={totalCount}
      viewerNickname={viewerNickname}
      viewerMyNickname={viewerMyNickname}
      hasLiked={hasLiked}
      likeCount={likeCount}
      isEditor={isEditor}
      editorLetter={book.editorLetter ?? null}
      creatorName={creatorName}
      canMessage={canMessage}
      initialMessage={initialMessage}
      messageCreatorName={messageCreatorName}
      messageEditorName={messageEditorName}
      backgroundPlaylist={
        book.backgroundPlaylist ? { playlistId: book.backgroundPlaylist.playlistId } : null
      }
    />
```

- [ ] **Step 4: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 5: 手動驗證**

Run: `npm run dev`（若尚未啟動）

在 Task 7 設定過「頁面 1 → 指定曲目 index 1」的那本書的讀者頁（`/read/<bookId>`），開 devtools console：

```js
fetch(`/api/books/<bookId>/pages?limit=5`).then(r => r.json()).then(console.log)
```

Expected: 該頁面物件的 `playlistTrackIndex` 為 `1`，其他頁面為 `null`。這確認了資料從 DB → API → （之後的）player 元件的管線完整無誤。

- [ ] **Step 6: Commit**

```bash
git add "app/read/[bookId]/page.tsx" components/read-page-client.tsx
git commit -m "feat: pass backgroundPlaylist and playlistTrackIndex to read page client"
```

---

## Task 9: BackgroundPlaylistPlayer — YouTube script 載入與 player 初始化

**Files:**
- Create: `forlove10grams/components/background-playlist-player.tsx`
- Modify: `forlove10grams/components/read-page-client.tsx`

- [ ] **Step 1: 建立元件（初始化階段，尚無播放邏輯）**

```tsx
'use client'

import { useEffect, useRef } from 'react'

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  playVideoAt(index: number): void
  mute(): void
  unMute(): void
  isMuted(): boolean
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        opts: {
          playerVars: Record<string, string | number>
          events: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number }) => void
          }
        }
      ) => YTPlayer
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiLoadPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(script)
  })
  return apiLoadPromise
}

export type BackgroundPlaylistPage = {
  _id: string
  playlistTrackIndex?: number | null
}

export function BackgroundPlaylistPlayer({
  playlistId,
}: {
  playlistId: string
  activePageId: string | null
  pages: BackgroundPlaylistPage[]
}) {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerIdRef = useRef(`bg-playlist-player-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false

    loadYouTubeIframeApi().then(() => {
      if (cancelled) return
      playerRef.current = new window.YT!.Player(containerIdRef.current, {
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          loop: 1,
          autoplay: 0,
          controls: 0,
          disablekb: 1,
        },
        events: {},
      })
    })

    return () => {
      cancelled = true
    }
  }, [playlistId])

  return (
    <div
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <div id={containerIdRef.current} />
    </div>
  )
}
```

*（注意：`activePageId` 與 `pages` prop 先加進型別簽名，讓 Task 10 接手時不需要再改函式簽名；本 task 內容尚未使用它們，先用 `_` 前綴或直接留著給下個 task 使用都可以 — 這裡選擇直接保留參數但先不使用，ESLint 若對未使用參數報警告，下個 task 馬上就會用到，不影響 `tsc --noEmit`。）*

- [ ] **Step 2: 掛載到 `ReadPageClient`**

在 `components/read-page-client.tsx`，加入 import：

```typescript
import { BackgroundPlaylistPlayer } from '@/components/background-playlist-player'
```

在 `return (` 的最外層 `<div className="flex h-dvh bg-background">` 內、`<Toc` 之前，加入：

```tsx
      {backgroundPlaylist && (
        <BackgroundPlaylistPlayer
          playlistId={backgroundPlaylist.playlistId}
          activePageId={activePageId}
          pages={pages.map((p) => ({ _id: p._id, playlistTrackIndex: p.playlistTrackIndex ?? null }))}
        />
      )}
```

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 4: 手動驗證（瀏覽器）**

Run: `npm run dev`（若尚未啟動）

打開一本已設定背景歌單的書的讀者頁（`/read/<bookId>`），開 devtools：

1. Elements 面板搜尋 `bg-playlist-player-`，應該看到一個 1x1、`opacity: 0` 的 div，裡面有 YouTube 注入的 iframe。
2. Network 面板應該看到對 `youtube.com` 的請求（iframe_api script + player iframe）。
3. Console 不應該有紅色錯誤。

此階段還不會真的播放聲音（尚未接手勢觸發邏輯），這是正常的。

- [ ] **Step 5: Commit**

```bash
git add components/background-playlist-player.tsx components/read-page-client.tsx
git commit -m "feat: initialize YouTube IFrame player for background playlist"
```

---

## Task 10: 播放邏輯 — 首次手勢啟動 + 換頁跳轉狀態機

**Files:**
- Modify: `forlove10grams/components/background-playlist-player.tsx`

- [ ] **Step 1: 補上播放狀態機**

把元件本體：

```tsx
export function BackgroundPlaylistPlayer({
  playlistId,
}: {
  playlistId: string
  activePageId: string | null
  pages: BackgroundPlaylistPage[]
}) {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerIdRef = useRef(`bg-playlist-player-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false

    loadYouTubeIframeApi().then(() => {
      if (cancelled) return
      playerRef.current = new window.YT!.Player(containerIdRef.current, {
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          loop: 1,
          autoplay: 0,
          controls: 0,
          disablekb: 1,
        },
        events: {},
      })
    })

    return () => {
      cancelled = true
    }
  }, [playlistId])

  return (
    <div
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <div id={containerIdRef.current} />
    </div>
  )
}
```

改成：

```tsx
export function BackgroundPlaylistPlayer({
  playlistId,
  activePageId,
  pages,
}: {
  playlistId: string
  activePageId: string | null
  pages: BackgroundPlaylistPage[]
}) {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerIdRef = useRef(`bg-playlist-player-${Math.random().toString(36).slice(2)}`)
  const readyRef = useRef(false)
  const startedRef = useRef(false)
  const jumpedPageIdsRef = useRef<Set<string>>(new Set())
  const activePageIdRef = useRef(activePageId)
  const pagesRef = useRef(pages)

  activePageIdRef.current = activePageId
  pagesRef.current = pages

  useEffect(() => {
    let cancelled = false

    loadYouTubeIframeApi().then(() => {
      if (cancelled) return
      playerRef.current = new window.YT!.Player(containerIdRef.current, {
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          loop: 1,
          autoplay: 0,
          controls: 0,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            readyRef.current = true
          },
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [playlistId])

  // 首次使用者手勢：任何地方點擊/觸控都算，觸發後立即移除監聽
  useEffect(() => {
    function handleFirstGesture() {
      if (startedRef.current || !readyRef.current || !playerRef.current) return
      startedRef.current = true

      const page = pagesRef.current.find((p) => p._id === activePageIdRef.current)
      if (page?.playlistTrackIndex != null) {
        playerRef.current.playVideoAt(page.playlistTrackIndex)
        jumpedPageIdsRef.current.add(page._id)
      } else {
        playerRef.current.playVideo()
      }
    }

    document.addEventListener('pointerdown', handleFirstGesture, { capture: true, once: true })
    return () => document.removeEventListener('pointerdown', handleFirstGesture, { capture: true })
  }, [])

  // 換頁：有指定曲目且該頁尚未跳轉過 → 跳轉一次；否則不動作，讓目前曲目自然繼續/自然播完後由 YouTube 自動接下一首
  useEffect(() => {
    if (!startedRef.current || !playerRef.current || !activePageId) return
    const page = pages.find((p) => p._id === activePageId)
    if (page?.playlistTrackIndex != null && !jumpedPageIdsRef.current.has(activePageId)) {
      playerRef.current.playVideoAt(page.playlistTrackIndex)
      jumpedPageIdsRef.current.add(activePageId)
    }
  }, [activePageId, pages])

  return (
    <div
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <div id={containerIdRef.current} />
    </div>
  )
}
```

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 3: 手動驗證（瀏覽器，需要真的聽聲音）**

準備測試資料（延續前面 task 的書）：至少要有一本書設定了背景歌單，且至少第 1 頁與第 3 頁（舉例）各自指定了不同的曲目 index（例如 index 0 和 index 2）。

1. 打開讀者頁 `/read/<bookId>`，此時應該還沒有聲音。
2. 在畫面上任意處點一下（不用點在特定元素上）。應該聽到 YouTube 播放清單開始播放（若第 1 頁有指定 index 0，應該直接播該首；若第 1 頁沒指定，會從歌單目前 cue 到的位置開始）。
3. 往下捲動到有指定曲目的頁面（例如第 3 頁，指定 index 2），確認曲目立刻跳轉切換成第 3 首。
4. 往上捲回第 1 頁，再往下捲回第 3 頁，確認**不會**再跳轉一次（應該繼續播放原本進度，不會被打斷重播）。
5. 往下捲到沒有指定曲目的頁面，確認曲目繼續播放不受影響。
6. 讓目前曲目自然播完（或用 devtools 呼叫 `playerRef` 對應的內部狀態手動測試較困難，這裡以觀察真的等一首歌播完為準，或找一個很短的測試 playlist），確認自動接下一首（YouTube 內建行為）。

- [ ] **Step 4: Commit**

```bash
git add components/background-playlist-player.tsx
git commit -m "feat: add first-gesture autoplay and page-jump logic to background playlist player"
```

---

## Task 11: FAB 控制 UI（播放/暫停、靜音）

**Files:**
- Modify: `forlove10grams/components/background-playlist-player.tsx`

- [ ] **Step 1: 加入 FAB 狀態與 UI**

把元件內 `useEffect` 區塊之後、`return` 之前的空白處（也就是三個 `useEffect` 結束後），加入 state：

在 `const readyRef = useRef(false)` 那行之前加入：

```tsx
  const [expanded, setExpanded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
```

記得在檔案開頭把：

```typescript
import { useEffect, useRef } from 'react'
```

改成：

```typescript
import { useEffect, useRef, useState } from 'react'
```

把 player 初始化的 `onReady` 事件，補上 `onStateChange` 讓面板狀態跟真實 player 狀態同步：

```tsx
        events: {
          onReady: () => {
            readyRef.current = true
          },
        },
```

改成：

```tsx
        events: {
          onReady: (event) => {
            readyRef.current = true
            setIsMuted(event.target.isMuted())
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === 1 /* YT.PlayerState.PLAYING */)
          },
        },
```

把 `handleFirstGesture` 裡開始播放後同步一次 `isPlaying`：

```tsx
      const page = pagesRef.current.find((p) => p._id === activePageIdRef.current)
      if (page?.playlistTrackIndex != null) {
        playerRef.current.playVideoAt(page.playlistTrackIndex)
        jumpedPageIdsRef.current.add(page._id)
      } else {
        playerRef.current.playVideo()
      }
    }
```

改成：

```tsx
      const page = pagesRef.current.find((p) => p._id === activePageIdRef.current)
      if (page?.playlistTrackIndex != null) {
        playerRef.current.playVideoAt(page.playlistTrackIndex)
        jumpedPageIdsRef.current.add(page._id)
      } else {
        playerRef.current.playVideo()
      }
      setIsPlaying(true)
    }
```

- [ ] **Step 2: 加入 toggle 函式與 FAB JSX**

在最後的 `return` 之前加入：

```tsx
  function togglePlay() {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  function toggleMute() {
    if (!playerRef.current) return
    if (isMuted) {
      playerRef.current.unMute()
    } else {
      playerRef.current.mute()
    }
    setIsMuted(!isMuted)
  }
```

把 `return` 的 JSX：

```tsx
  return (
    <div
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <div id={containerIdRef.current} />
    </div>
  )
}
```

改成：

```tsx
  return (
    <>
      <div
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        aria-hidden
      >
        <div id={containerIdRef.current} />
      </div>

      <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
        {expanded && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm">
            <button
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-foreground/5 cursor-pointer"
              aria-label={isPlaying ? '暫停' : '播放'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-foreground/5 cursor-pointer"
              aria-label={isMuted ? '取消靜音' : '靜音'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-foreground/5 cursor-pointer"
          aria-label="背景音樂控制"
        >
          🎵
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有錯誤。

- [ ] **Step 4: 手動驗證（瀏覽器）**

Run: `npm run dev`（若尚未啟動）

1. 打開讀者頁，右下角應該看到一個收合的 🎵 圓形 icon，沒有任何影片畫面。
2. 點一下畫面任意處觸發播放（延續 Task 10 的行為）。
3. 點 🎵 icon，展開面板，看到 ⏸/▶ 和 🔊/🔇 兩個按鈕。
4. 點 ⏸，確認音樂真的暫停；再點（此時應顯示 ▶）恢復播放，確認音樂繼續。
5. 點 🔊，確認音樂靜音（圖示變 🔇）；再點一次取消靜音，確認恢復有聲音。
6. 再點一次 🎵 icon，確認面板收合。

- [ ] **Step 5: Commit**

```bash
git add components/background-playlist-player.tsx
git commit -m "feat: add FAB play/pause and mute controls for background playlist"
```

---

## Task 12: 端對端手動驗證

**Files:** 無新程式碼變更，純驗證。

- [ ] **Step 1: 建立完整測試情境**

1. 建一本測試書（或用既有測試書），至少 5 個頁面。
2. 在編輯頁「背景歌單」貼上一個至少有 5 首歌的 YouTube 播放清單連結，儲存。
3. 把第 2 頁指定曲目 index 設為 `1`，第 4 頁指定曲目 index 設為 `3`，其餘頁面留空。

- [ ] **Step 2: 依序驗證原始需求的 5 條行為**

Run: `npm run dev`（若尚未啟動），以讀者身分打開 `/read/<bookId>`：

1. **權限**：確認只有 owner/editor/admin 帳號能在編輯頁看到「背景歌單」與「指定曲目」欄位（用一個沒有權限的帳號打開同一本書的編輯頁，應該完全看不到編輯頁本身，或至少看不到這兩個 UI）。
2. **沒有指定曲目的頁面換頁繼續播放**：從第 1 頁點擊觸發播放後，捲到第 3 頁（沒指定），確認曲目沒有中斷或跳轉。
3. **有指定曲目的頁面跳轉**：捲到第 2 頁，確認立即跳到第 2 首（index 1）；捲到第 4 頁，確認跳到第 4 首（index 3）。
4. **同一頁第二次路過不重複跳轉**：捲回第 2 頁第二次，確認曲目不會被打斷重跳；讓歌自然播完，確認自動接下一首，且沒有被「指定曲目」邏輯打斷。
5. **播完自動從頭**：如果測試 playlist 較短，可以耐心等它整個播完一輪，確認自動從第 1 首重新開始（`loop: 1` 效果）。

- [ ] **Step 3: 記錄結果**

若有任何一項行為不符預期，回到對應的 Task（多半是 Task 10 的狀態機邏輯）修正後重新走一次本 task 的驗證清單。全部通過後即代表功能完成。
