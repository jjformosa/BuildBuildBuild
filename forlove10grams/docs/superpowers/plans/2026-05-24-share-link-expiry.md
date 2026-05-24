# Share Link Expiry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **IMPORTANT (CLAUDE.md constraint):** `git commit`, `git push`, and other state-changing git commands must NOT be executed directly. Provide the command text for the user to run manually.

**Goal:** Add 7-day expiry to `shareStatus === 'shared'` share links, with upsert-on-extend so the URL never changes.

**Architecture:** `Share` model gains `expiresAt?: Date | null`. POST becomes an upsert — if an active share exists, only `expiresAt` is updated and the token stays the same. GET returns `expiresAt`. The share entry page checks expiry server-side. `ShareLinkManager` gains a third UI state (expired) and an extend button.

**Tech Stack:** Next.js 15 App Router, Mongoose, TypeScript, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `forlove10grams/lib/models/share.ts` | Add `expiresAt?: Date \| null` |
| `forlove10grams/app/api/books/[bookId]/share/route.ts` | POST → upsert; GET → include expiresAt |
| `forlove10grams/app/share/[token]/page.tsx` | Check expiresAt before redirect |
| `forlove10grams/components/share-link-manager.tsx` | Three states + handleExtend |

---

### Task 1: Share Model — add `expiresAt`

**Files:**
- Modify: `forlove10grams/lib/models/share.ts`

- [ ] **Step 1: Read current file**

```bash
cat forlove10grams/lib/models/share.ts
```

Expected content:
```typescript
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IShare extends Document {
  bookId: Types.ObjectId
  token: string
  createdBy: Types.ObjectId
  active: boolean
}

const ShareSchema = new Schema<IShare>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    token: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ShareSchema.index({ bookId: 1 })

const Share: Model<IShare> =
  mongoose.models.Share ?? mongoose.model<IShare>('Share', ShareSchema)

export default Share
```

- [ ] **Step 2: Replace file with updated version**

Write `forlove10grams/lib/models/share.ts`:

```typescript
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IShare extends Document {
  bookId: Types.ObjectId
  token: string
  createdBy: Types.ObjectId
  active: boolean
  expiresAt?: Date | null
}

const ShareSchema = new Schema<IShare>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    token: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
)

ShareSchema.index({ bookId: 1 })

const Share: Model<IShare> =
  mongoose.models.Share ?? mongoose.model<IShare>('Share', ShareSchema)

export default Share
```

- [ ] **Step 3: TypeScript check**

Run: `cd forlove10grams && npx tsc --noEmit --skipLibCheck 2>&1 | grep -v ".next/"`

Expected: no errors from `lib/models/share.ts`

- [ ] **Step 4: Provide commit command for user to run**

```
git add forlove10grams/lib/models/share.ts
git commit -m "feat: add expiresAt to Share model"
```

---

### Task 2: Share Route — POST upsert + GET with `expiresAt`

**Files:**
- Modify: `forlove10grams/app/api/books/[bookId]/share/route.ts`

Context: POST currently always deactivates the old share and creates a new token. We change it to upsert — if an active share already exists, only update `expiresAt` and keep the token unchanged. GET currently returns `{ active, token, shareUrl, createdAt }`; we add `expiresAt`.

- [ ] **Step 1: Replace the POST handler body**

The full updated POST handler (replace everything after `if (err) return err` in the POST function):

```typescript
export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  await dbConnect()

  const { book, err } = await requireManager(bookId, session.user.id!)
  if (err) return err

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const expiresAt = book.shareStatus === 'public'
    ? null
    : new Date(Date.now() + SEVEN_DAYS_MS)

  const origin = new URL(req.url).origin
  const existing = await Share.findOne({ bookId: book._id, active: true })

  if (existing) {
    await Share.updateOne({ _id: existing._id }, { $set: { expiresAt } })
    return Response.json({
      token: existing.token,
      shareUrl: `${origin}/share/${existing.token}`,
      expiresAt: expiresAt?.toISOString() ?? null,
    })
  }

  const token = nanoid(12)
  await Share.create({ bookId: book._id, token, createdBy: session.user.id, active: true, expiresAt })

  if (book.shareStatus !== 'public') {
    book.shareStatus = 'shared'
    await book.save()
  }

  return Response.json({
    token,
    shareUrl: `${origin}/share/${token}`,
    expiresAt: expiresAt?.toISOString() ?? null,
  })
}
```

- [ ] **Step 2: Update GET to return `expiresAt`**

In the GET handler, find the `return Response.json({ active: true, ... })` block and replace it:

```typescript
  return Response.json({
    active: true,
    token: share.token,
    shareUrl: `${origin}/share/${share.token}`,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt?.toISOString() ?? null,
  })
```

- [ ] **Step 3: Verify the full file looks correct**

The complete `route.ts` should be:

```typescript
import type { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book, { type IBook } from '@/lib/models/book'
import Share from '@/lib/models/share'

async function requireManager(
  bookId: string,
  userId: string,
): Promise<{ book: IBook; err: null } | { book: null; err: Response }> {
  const book = await Book.findById(bookId)
  if (!book) return { book: null, err: Response.json({ error: 'Not found' }, { status: 404 }) }
  const isOwner = book.createdBy.toString() === userId
  const isEditor = book.editorId?.toString() === userId
  if (!isOwner && !isEditor)
    return { book: null, err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
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

  const { book, err } = await requireManager(bookId, session.user.id!)
  if (err) return err

  const share = await Share.findOne({ bookId: book._id, active: true })
  if (!share) return Response.json({ active: false })

  const origin = new URL(req.url).origin
  return Response.json({
    active: true,
    token: share.token,
    shareUrl: `${origin}/share/${share.token}`,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt?.toISOString() ?? null,
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

  const { book, err } = await requireManager(bookId, session.user.id!)
  if (err) return err

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const expiresAt = book.shareStatus === 'public'
    ? null
    : new Date(Date.now() + SEVEN_DAYS_MS)

  const origin = new URL(req.url).origin
  const existing = await Share.findOne({ bookId: book._id, active: true })

  if (existing) {
    await Share.updateOne({ _id: existing._id }, { $set: { expiresAt } })
    return Response.json({
      token: existing.token,
      shareUrl: `${origin}/share/${existing.token}`,
      expiresAt: expiresAt?.toISOString() ?? null,
    })
  }

  const token = nanoid(12)
  await Share.create({ bookId: book._id, token, createdBy: session.user.id, active: true, expiresAt })

  if (book.shareStatus !== 'public') {
    book.shareStatus = 'shared'
    await book.save()
  }

  return Response.json({
    token,
    shareUrl: `${origin}/share/${token}`,
    expiresAt: expiresAt?.toISOString() ?? null,
  })
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  await dbConnect()

  const { book, err } = await requireManager(bookId, session.user.id!)
  if (err) return err

  await Share.updateMany({ bookId: book._id, active: true }, { active: false })
  // Two separate writes — not atomic; shareStatus and active shares may briefly diverge on crash

  book.shareStatus = 'private'
  await book.save()

  return new Response(null, { status: 204 })
}
```

- [ ] **Step 4: TypeScript check**

Run: `cd forlove10grams && npx tsc --noEmit --skipLibCheck 2>&1 | grep -v ".next/"`

Expected: no new errors from `app/api/books/[bookId]/share/route.ts`

- [ ] **Step 5: Provide commit command for user to run**

```
git add forlove10grams/app/api/books/[bookId]/share/route.ts
git commit -m "feat: share POST upsert with expiresAt, GET returns expiresAt"
```

---

### Task 3: Share Page — expiry check

**Files:**
- Modify: `forlove10grams/app/share/[token]/page.tsx`

Context: The page currently shows "連結無效或已過期" if `Share.findOne({ token, active: true })` returns null. We add a check after that: if the share exists but `expiresAt` is in the past, show "連結已到期" instead of redirecting.

- [ ] **Step 1: Read the current file**

```bash
cat forlove10grams/app/share/[token]/page.tsx
```

- [ ] **Step 2: Add the expiry check**

After the `if (!share)` block (around line 22), insert:

```typescript
  if (share.expiresAt != null && share.expiresAt < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結已到期</p>
      </main>
    )
  }
```

The full updated file:

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Share from '@/lib/models/share'
import Book from '@/lib/models/book'

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const session = await auth()

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/share/${token}`)}`)
  }

  await dbConnect()
  const share = await Share.findOne({ token, active: true })

  if (!share) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結無效或已過期</p>
      </main>
    )
  }

  if (share.expiresAt != null && share.expiresAt < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結已到期</p>
      </main>
    )
  }

  const book = await Book.findById(share.bookId)

  if (!book) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結無效或已過期</p>
      </main>
    )
  }

  if (book.shareStatus !== 'shared' && book.shareStatus !== 'public') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">此記憶書尚未發布</p>
      </main>
    )
  }

  redirect(`/read/${share.bookId.toString()}`)
}
```

- [ ] **Step 3: TypeScript check**

Run: `cd forlove10grams && npx tsc --noEmit --skipLibCheck 2>&1 | grep -v ".next/"`

Expected: no errors

- [ ] **Step 4: Provide commit command for user to run**

```
git add forlove10grams/app/share/[token]/page.tsx
git commit -m "feat: share page shows 連結已到期 when expiresAt has passed"
```

---

### Task 4: ShareLinkManager — three states + handleExtend

**Files:**
- Modify: `forlove10grams/components/share-link-manager.tsx`

Context: Currently has two states: `share.active && share.shareUrl` (active) vs else (inactive). We add `expiresAt` to `ShareState`, compute `isExpired` client-side, and split into three render branches. A new `handleExtend` function calls POST and updates local state without full re-fetch.

- [ ] **Step 1: Replace the full file**

Write `forlove10grams/components/share-link-manager.tsx`:

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useShareStatus } from '@/lib/contexts/share-status-context'

interface ShareState {
  active: boolean
  shareUrl: string | null
  createdAt: string | null
  expiresAt: string | null
}

export function ShareLinkManager({ bookId }: { bookId: string }) {
  const [share, setShare] = useState<ShareState | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { setLoaded, registerRefresh } = useShareStatus()

  const fetchShare = useCallback(async () => {
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/share`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setShare({
        active: data.active,
        shareUrl: data.shareUrl ?? null,
        createdAt: data.createdAt ?? null,
        expiresAt: data.expiresAt ?? null,
      })
    } catch {
      setError('載入失敗，請重新整理')
      setShare({ active: false, shareUrl: null, createdAt: null, expiresAt: null })
    } finally {
      setLoaded()
    }
  }, [bookId, setLoaded])

  useEffect(() => { fetchShare() }, [fetchShare])
  useEffect(() => { registerRefresh(fetchShare) }, [registerRefresh, fetchShare])

  async function handleRevoke() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/share`, { method: 'DELETE' })
      if (!res.ok) throw new Error('撤銷失敗')
      setShare({ active: false, shareUrl: null, createdAt: null, expiresAt: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤銷失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleExtend() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/share`, { method: 'POST' })
      if (!res.ok) throw new Error('延長失敗')
      const data = await res.json()
      setShare((prev) => ({
        ...prev!,
        active: true,
        shareUrl: data.shareUrl,
        expiresAt: data.expiresAt ?? null,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '延長失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function copyUrl() {
    if (!share?.shareUrl) return
    try {
      await navigator.clipboard.writeText(share.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('複製失敗，請手動複製連結')
    }
  }

  if (share === null) {
    return <p className="text-sm text-[#2C1810]/50">載入中…</p>
  }

  const isExpired = !!share.expiresAt && new Date(share.expiresAt) < new Date()
  const daysLeft = share.expiresAt && !isExpired
    ? Math.ceil((new Date(share.expiresAt).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#2C1810]">分享連結</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {share.active && !isExpired && share.shareUrl ? (
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
          {share.expiresAt ? (
            <p className="text-xs text-[#2C1810]/50">{daysLeft} 天後到期</p>
          ) : (
            <p className="text-xs text-[#2C1810]/50">永久有效</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleExtend}
              disabled={actionLoading}
              className="rounded border border-[#2C1810]/20 px-2 py-1 text-xs text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-50"
            >
              延長七天
            </button>
            <button
              onClick={handleRevoke}
              disabled={actionLoading}
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              撤銷連結
            </button>
          </div>
        </div>
      ) : share.active && isExpired ? (
        <div className="space-y-2">
          <p className="text-xs text-amber-600">連結已到期</p>
          <div className="flex gap-2">
            <button
              onClick={handleExtend}
              disabled={actionLoading}
              className="rounded border border-[#2C1810]/20 px-2 py-1 text-xs text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-50"
            >
              延長七天
            </button>
            <button
              onClick={handleRevoke}
              disabled={actionLoading}
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              撤銷
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#2C1810]/50">目前沒有分享連結</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd forlove10grams && npx tsc --noEmit --skipLibCheck 2>&1 | grep -v ".next/"`

Expected: no errors

- [ ] **Step 3: Manual browser test checklist**

Start dev server, open a book's edit page as owner:

1. **建立連結**：點「分享 & 複製讀者連結」→ ShareLinkManager 顯示 URL + 「7 天後到期」+ 兩個按鈕（延長七天 / 撤銷連結）
2. **延長**：點「延長七天」→ daysLeft 重置為 7，URL 不變（同一個 token）
3. **撤銷後重建**：點「撤銷連結」→ 顯示「目前沒有分享連結」→ 再點「分享 & 複製讀者連結」→ 新 token 產生，URL 改變
4. **share page 過期**：手動在 MongoDB 把 `expiresAt` 改到過去的時間，開啟該 share URL → 顯示「連結已到期」
5. **過期後延長**：在 ShareLinkManager 顯示「連結已到期」時點「延長七天」→ 連結恢復有效，URL 不變

- [ ] **Step 4: Provide commit command for user to run**

```
git add forlove10grams/components/share-link-manager.tsx
git commit -m "feat: ShareLinkManager three states, handleExtend, expiresAt display"
```
