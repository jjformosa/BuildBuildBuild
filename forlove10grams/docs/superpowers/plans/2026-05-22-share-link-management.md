# Share Link Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `book.published` (boolean) with `book.shareStatus` (enum), add GET/DELETE to the share API, and build a `ShareLinkManager` component in the edit page so creators can view and revoke their active share link.

**Architecture:** The Book model gains a `shareStatus: 'private' | 'shared' | 'public'` field that replaces `published`. A new `ShareStatusContext` connects `ShareButton` (header, disabled until loaded) and `ShareLinkManager` (bottom section, fetches on mount). All access-control guards that checked `book.published` are updated to check `book.shareStatus === 'shared' || book.shareStatus === 'public'`.

**Tech Stack:** Next.js App Router (Server + Client Components), Mongoose, React Context, Tailwind CSS

---

## File Map

**Create:**
- `lib/contexts/share-status-context.tsx` — React context + provider for loading state
- `components/share-link-manager.tsx` — new client component for share link display/revoke
- `forlove10grams/scripts/migrate-published.cjs` — one-off DB migration script

**Modify:**
- `lib/models/book.ts` — `published: Boolean` → `shareStatus: String`
- `app/api/books/[bookId]/share/route.ts` — add GET + DELETE; update POST
- `app/api/books/route.ts` — filter + select + response for shareStatus
- `app/api/books/[bookId]/pages/route.ts` — access control
- `app/api/books/[bookId]/like/route.ts` — access control
- `app/api/progress/route.ts` — access control
- `app/api/share/[token]/route.ts` — access control
- `app/share/[token]/page.tsx` — access control
- `app/read/[bookId]/page.tsx` — access control
- `app/dashboard/page.tsx` — `toBook` function
- `components/dashboard-books-client.tsx` — `DashboardBook` type + badge
- `components/share-button.tsx` — text + disabled via context
- `app/books/[bookId]/edit/page.tsx` — add provider + ShareLinkManager

---

## Task 1: Update Book model schema

**Files:**
- Modify: `lib/models/book.ts`

- [ ] **Replace the Book model file** with the following content:

```typescript
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export type ShareStatus = 'private' | 'shared' | 'public'

export interface IBook extends Document {
  title: string
  description?: string
  coverImage?: string
  createdBy: Types.ObjectId
  editorId?: Types.ObjectId
  pageOrder: Types.ObjectId[]
  shareStatus: ShareStatus
  tags: string[]
}

const BookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true },
    description: String,
    coverImage: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User' },
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

BookSchema.index({ createdBy: 1 })
BookSchema.index({ editorId: 1 })

const Book: Model<IBook> =
  mongoose.models.Book ?? mongoose.model<IBook>('Book', BookSchema)

export default Book
```

- [ ] **Commit:**

```bash
git add forlove10grams/lib/models/book.ts
git commit -m "feat: replace book.published with book.shareStatus enum"
```

---

## Task 2: Write and run migration script

**Files:**
- Create: `forlove10grams/scripts/migrate-published.cjs`

- [ ] **Create the migration script:**

```javascript
// forlove10grams/scripts/migrate-published.cjs
const mongoose = require('mongoose')

async function migrate() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI env var is required')

  await mongoose.connect(uri)

  const col = mongoose.connection.collection('books')

  const shared = await col.updateMany(
    { published: true, shareStatus: { $exists: false } },
    { $set: { shareStatus: 'shared' }, $unset: { published: '' } }
  )
  const priv = await col.updateMany(
    { published: { $ne: true }, shareStatus: { $exists: false } },
    { $set: { shareStatus: 'private' }, $unset: { published: '' } }
  )

  console.log(`Migrated: ${shared.modifiedCount} → shared, ${priv.modifiedCount} → private`)
  await mongoose.disconnect()
}

migrate().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Run the migration** (set MONGODB_URI to your dev DB connection string):

```bash
MONGODB_URI=<your-connection-string> node forlove10grams/scripts/migrate-published.cjs
```

Expected output:
```
Migrated: N → shared, M → private
```

- [ ] **Commit:**

```bash
git add forlove10grams/scripts/migrate-published.cjs
git commit -m "chore: add migration script for published → shareStatus"
```

---

## Task 3: Update share API route

**Files:**
- Modify: `app/api/books/[bookId]/share/route.ts`

- [ ] **Replace the entire file** with the following:

```typescript
import type { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Share from '@/lib/models/share'

async function requireOwner(bookId: string, userId: string) {
  const book = await Book.findById(bookId)
  if (!book) return { book: null, err: Response.json({ error: 'Not found' }, { status: 404 }) }
  if (book.createdBy.toString() !== userId) return { book: null, err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { book, err: null }
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  await dbConnect()

  const { book, err } = await requireOwner(bookId, session.user.id!)
  if (err) return err

  const share = await Share.findOne({ bookId: book!._id, active: true })
  if (!share) return Response.json({ active: false })

  const origin = new URL(req.url).origin
  return Response.json({
    active: true,
    token: share.token,
    shareUrl: `${origin}/share/${share.token}`,
    createdAt: share.createdAt,
  })
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  await dbConnect()

  const { book, err } = await requireOwner(bookId, session.user.id!)
  if (err) return err

  await Share.updateMany({ bookId: book!._id, active: true }, { active: false })

  const token = nanoid(12)
  await Share.create({ bookId: book!._id, token, createdBy: session.user.id, active: true })

  book!.shareStatus = 'shared'
  await book!.save()

  const origin = new URL(req.url).origin
  return Response.json({ token, shareUrl: `${origin}/share/${token}` })
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  await dbConnect()

  const { book, err } = await requireOwner(bookId, session.user.id!)
  if (err) return err

  await Share.updateMany({ bookId: book!._id, active: true }, { active: false })

  book!.shareStatus = 'private'
  await book!.save()

  return new Response(null, { status: 204 })
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/app/api/books/\[bookId\]/share/route.ts
git commit -m "feat: add GET and DELETE to share API, decouple from published"
```

---

## Task 4: Update access control across API routes and pages

Six files all swap `book.published` for `book.shareStatus === 'shared' || book.shareStatus === 'public'`.

**Files:**
- Modify: `app/api/books/[bookId]/pages/route.ts`
- Modify: `app/api/books/[bookId]/like/route.ts`
- Modify: `app/api/progress/route.ts`
- Modify: `app/api/share/[token]/route.ts`
- Modify: `app/share/[token]/page.tsx`
- Modify: `app/read/[bookId]/page.tsx`

- [ ] **`app/api/books/[bookId]/pages/route.ts` line 25** — change:

```typescript
// before
const canRead = canEditBook(session.user.id, book) || book.published

// after
const canRead = canEditBook(session.user.id, book) || book.shareStatus === 'shared' || book.shareStatus === 'public'
```

- [ ] **`app/api/books/[bookId]/like/route.ts` line 28** — change:

```typescript
// before
const canAccess =
  canEditBook(userId, book) ||
  book.published ||
  (await isBookReader(userId, bookId))

// after
const canAccess =
  canEditBook(userId, book) ||
  book.shareStatus === 'shared' ||
  book.shareStatus === 'public' ||
  (await isBookReader(userId, bookId))
```

- [ ] **`app/api/progress/route.ts` line 12** — change:

```typescript
// before
const canAccess = canEditBook(userId, book) || book.published

// after
const canAccess = canEditBook(userId, book) || book.shareStatus === 'shared' || book.shareStatus === 'public'
```

- [ ] **`app/api/share/[token]/route.ts` line 23** — change:

```typescript
// before
if (!book.published) {
  return Response.json({ error: 'Book not published' }, { status: 403 })
}

// after
if (book.shareStatus !== 'shared' && book.shareStatus !== 'public') {
  return Response.json({ error: 'Book not published' }, { status: 403 })
}
```

- [ ] **`app/share/[token]/page.tsx` line 40** — change:

```typescript
// before
if (!book.published) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
      <p className="text-sm text-[#2C1810]/60">此記憶書尚未發布</p>
    </main>
  )
}

// after
if (book.shareStatus !== 'shared' && book.shareStatus !== 'public') {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
      <p className="text-sm text-[#2C1810]/60">此記憶書尚未發布</p>
    </main>
  )
}
```

- [ ] **`app/read/[bookId]/page.tsx` line 28** — change:

```typescript
// before
const canAccess =
  canEditBook(userId, book) ||
  book.published ||
  (await isBookReader(userId, bookId))

// after
const canAccess =
  canEditBook(userId, book) ||
  book.shareStatus === 'shared' ||
  book.shareStatus === 'public' ||
  (await isBookReader(userId, bookId))
```

- [ ] **Commit:**

```bash
git add forlove10grams/app/api/books/\[bookId\]/pages/route.ts \
        forlove10grams/app/api/books/\[bookId\]/like/route.ts \
        forlove10grams/app/api/progress/route.ts \
        forlove10grams/app/api/share/\[token\]/route.ts \
        forlove10grams/app/share/\[token\]/page.tsx \
        forlove10grams/app/read/\[bookId\]/page.tsx
git commit -m "feat: update access control to use shareStatus"
```

---

## Task 5: Update dashboard books API

**Files:**
- Modify: `app/api/books/route.ts`

- [ ] **Replace the three filter lines and the select/response** in `app/api/books/route.ts`:

```typescript
// before (lines 26-27)
if (status === 'published') query.published = true
if (status === 'unpublished') query.published = { $ne: true }

// after
if (status === 'published') query.shareStatus = 'shared'
if (status === 'unpublished') query.shareStatus = 'private'
```

```typescript
// before (line 37)
.select('_id title description coverImage published tags')

// after
.select('_id title description coverImage shareStatus tags')
```

```typescript
// before (line 49 in the map)
published: b.published ?? false,

// after
shareStatus: (b.shareStatus as 'private' | 'shared' | 'public') ?? 'private',
```

- [ ] **Commit:**

```bash
git add forlove10grams/app/api/books/route.ts
git commit -m "feat: update books API to filter and return shareStatus"
```

---

## Task 6: Create ShareStatusContext

**Files:**
- Create: `lib/contexts/share-status-context.tsx`

- [ ] **Create the file:**

```typescript
'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ShareStatusContextValue = {
  isLoaded: boolean
  setLoaded: () => void
}

const ShareStatusContext = createContext<ShareStatusContextValue>({
  isLoaded: false,
  setLoaded: () => {},
})

export function ShareStatusProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const setLoaded = useCallback(() => setIsLoaded(true), [])
  return (
    <ShareStatusContext.Provider value={{ isLoaded, setLoaded }}>
      {children}
    </ShareStatusContext.Provider>
  )
}

export function useShareStatus() {
  return useContext(ShareStatusContext)
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/lib/contexts/share-status-context.tsx
git commit -m "feat: add ShareStatusContext for edit page loading coordination"
```

---

## Task 7: Update ShareButton

**Files:**
- Modify: `components/share-button.tsx`

- [ ] **Replace the entire file:**

```typescript
'use client'

import { useState } from 'react'
import { useShareStatus } from '@/lib/contexts/share-status-context'

type Status = 'idle' | 'loading' | 'copied' | 'error'

export function ShareButton({ bookId }: { bookId: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const { isLoaded } = useShareStatus()

  async function handleShare() {
    setStatus('loading')
    try {
      const res = await fetch(`/api/books/${bookId}/share`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const { shareUrl } = await res.json()
      await navigator.clipboard.writeText(shareUrl)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  const label =
    status === 'loading' ? '分享中…'
    : status === 'copied' ? '✓ 已複製連結'
    : status === 'error' ? '分享失敗'
    : '分享 & 複製讀者連結'

  return (
    <button
      onClick={handleShare}
      disabled={!isLoaded || status === 'loading'}
      className="rounded-md border border-[#2C1810]/20 px-3 py-1.5 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-50 transition-colors"
    >
      {label}
    </button>
  )
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/components/share-button.tsx
git commit -m "feat: update ShareButton text and add disabled-until-loaded behavior"
```

---

## Task 8: Create ShareLinkManager component

**Files:**
- Create: `components/share-link-manager.tsx`

- [ ] **Create the file:**

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useShareStatus } from '@/lib/contexts/share-status-context'

interface ShareState {
  active: boolean
  shareUrl: string | null
  createdAt: string | null
}

export function ShareLinkManager({ bookId }: { bookId: string }) {
  const [share, setShare] = useState<ShareState | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { setLoaded } = useShareStatus()

  const fetchShare = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/share`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setShare({
        active: data.active,
        shareUrl: data.shareUrl ?? null,
        createdAt: data.createdAt ?? null,
      })
    } catch {
      setShare({ active: false, shareUrl: null, createdAt: null })
    } finally {
      setLoaded()
    }
  }, [bookId, setLoaded])

  useEffect(() => { fetchShare() }, [fetchShare])

  async function handleRevoke() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/share`, { method: 'DELETE' })
      if (!res.ok) throw new Error('撤銷失敗')
      setShare({ active: false, shareUrl: null, createdAt: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤銷失敗')
    } finally {
      setActionLoading(false)
    }
  }

  function copyUrl() {
    if (share?.shareUrl) {
      navigator.clipboard.writeText(share.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (share === null) {
    return <p className="text-sm text-[#2C1810]/50">載入中…</p>
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#2C1810]">分享連結</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {share.active && share.shareUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={share.shareUrl}
              className="flex-1 truncate rounded border border-[#2C1810]/20 bg-white px-2 py-1 text-xs text-[#2C1810]"
            />
            <button
              onClick={copyUrl}
              className="rounded border border-[#2C1810]/20 px-2 py-1 text-xs text-[#2C1810] hover:bg-[#2C1810]/5"
            >
              {copied ? '✓ 已複製' : '複製'}
            </button>
          </div>
          {share.createdAt && (
            <p className="text-xs text-[#2C1810]/50">
              建立於 {new Date(share.createdAt).toLocaleDateString('zh-TW')}
            </p>
          )}
          <button
            onClick={handleRevoke}
            disabled={actionLoading}
            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            撤銷連結
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#2C1810]/50">目前沒有分享連結</p>
      )}
    </div>
  )
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/components/share-link-manager.tsx
git commit -m "feat: add ShareLinkManager component"
```

---

## Task 9: Update Dashboard (client type, badge, and page toBook)

**Files:**
- Modify: `components/dashboard-books-client.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **In `components/dashboard-books-client.tsx` line 15** — replace the `published` field in `DashboardBook`:

```typescript
// before
export type DashboardBook = {
  _id: string
  title: string
  description: string | null
  coverImage: string | null
  published: boolean
  tags: string[]
  likeCount: number
}

// after
export type DashboardBook = {
  _id: string
  title: string
  description: string | null
  coverImage: string | null
  shareStatus: 'private' | 'shared' | 'public'
  tags: string[]
  likeCount: number
}
```

- [ ] **In `components/dashboard-books-client.tsx` lines 80–87** — replace the badge span:

```tsx
// before
<span
  className={`text-xs px-2 py-0.5 rounded-full ${
    book.published
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-[#2C1810]/5 text-[#2C1810]/40'
  }`}
>
  {book.published ? '已分享' : '草稿'}
</span>

// after
<span
  className={`text-xs px-2 py-0.5 rounded-full ${
    book.shareStatus === 'shared'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-[#2C1810]/5 text-[#2C1810]/40'
  }`}
>
  {book.shareStatus === 'shared' ? '已分享' : '草稿'}
</span>
```

- [ ] **In `app/dashboard/page.tsx` lines 16–29** — replace the `toBook` function:

```typescript
// before
function toBook(
  b: { _id: mongoose.Types.ObjectId; title: string; description?: string; coverImage?: string; published?: boolean; tags?: string[] },
  likeCount = 0
): DashboardBook {
  return {
    _id: b._id.toString(),
    title: b.title,
    description: b.description ?? null,
    coverImage: b.coverImage ?? null,
    published: b.published ?? false,
    tags: b.tags ?? [],
    likeCount,
  }
}

// after
function toBook(
  b: { _id: mongoose.Types.ObjectId; title: string; description?: string; coverImage?: string; shareStatus?: string; tags?: string[] },
  likeCount = 0
): DashboardBook {
  return {
    _id: b._id.toString(),
    title: b.title,
    description: b.description ?? null,
    coverImage: b.coverImage ?? null,
    shareStatus: (b.shareStatus as 'private' | 'shared' | 'public') ?? 'private',
    tags: b.tags ?? [],
    likeCount,
  }
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/components/dashboard-books-client.tsx \
        forlove10grams/app/dashboard/page.tsx
git commit -m "feat: update dashboard to use shareStatus instead of published"
```

---

## Task 10: Wire edit page

**Files:**
- Modify: `app/books/[bookId]/edit/page.tsx`

- [ ] **Add three imports** at the top of the file (after existing imports):

```typescript
import { ShareStatusProvider } from '@/lib/contexts/share-status-context'
import { ShareLinkManager } from '@/components/share-link-manager'
```

- [ ] **Three targeted edits to `app/books/[bookId]/edit/page.tsx`:**

**Edit 1** — wrap the outer `return (` in `ShareStatusProvider`. Change:

```tsx
return (
  <main className="flex h-screen flex-col bg-[#FAF7F2]">
```

to:

```tsx
return (
  <ShareStatusProvider>
  <main className="flex h-screen flex-col bg-[#FAF7F2]">
```

And add the closing tag before the final `)`:

```tsx
  </main>
  </ShareStatusProvider>
)
```

**Edit 2** — add `space-y-6` to the bottom `<section>` className:

```tsx
// before
<section className="flex-none border-t border-[#2C1810]/10 bg-[#FAF7F2] px-4 sm:px-6 py-4">

// after
<section className="flex-none border-t border-[#2C1810]/10 bg-[#FAF7F2] px-4 sm:px-6 py-4 space-y-6">
```

**Edit 3** — add `ShareLinkManager` after `InviteLinkManager` inside that section:

```tsx
// before
<InviteLinkManager bookId={bookId} />

// after
<InviteLinkManager bookId={bookId} />
{isOwner && <ShareLinkManager bookId={bookId} />}
```

- [ ] **Commit:**

```bash
git add forlove10grams/app/books/\[bookId\]/edit/page.tsx
git commit -m "feat: add ShareStatusProvider and ShareLinkManager to edit page"
```

---

## Task 11: Manual verification

- [ ] **Start the dev server** (run yourself):

```bash
cd forlove10grams && npm run dev
```

- [ ] **Verify ShareButton disabled state** — open an edit page. While the page is loading, the「分享 & 複製讀者連結」button should be disabled (opacity-50). It becomes enabled once `ShareLinkManager` finishes its fetch.

- [ ] **Verify ShareLinkManager — no active link** — on a book with no share link, the bottom section shows「分享連結」heading and「目前沒有分享連結」.

- [ ] **Verify create share link** — click「分享 & 複製讀者連結」. The URL is copied to clipboard. The `ShareLinkManager` now shows the URL, creation date, and「撤銷連結」button. Dashboard badge for this book shows「已分享」.

- [ ] **Verify revoke** — click「撤銷連結」. The manager switches to「目前沒有分享連結」. Visiting the old share URL shows「此記憶書尚未發布」. Dashboard badge reverts to「草稿」after page refresh.

- [ ] **Verify create new link after revoke** — click「分享 & 複製讀者連結」again. A new link appears in the manager. Old token still returns 404. New token works.

- [ ] **Verify dashboard filter** — in dashboard, filter「已分享」shows only books with `shareStatus: 'shared'`; filter「草稿」shows only `private`.
