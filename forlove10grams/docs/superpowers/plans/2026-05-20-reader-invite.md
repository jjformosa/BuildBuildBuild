# Reader Invite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a token-based invite link system so Managers can invite users as read-only Readers of a book, replacing the previous `book.published` access gate with an explicit BookReader record.

**Architecture:** Two new Mongoose models (`BookInvite` for one-per-book invite links and `BookReader` for per-user access records) back five new API route groups. The read page gains a BookReader check; a new `/invite/[token]` landing page handles the join flow. A new client component added to the book edit page exposes link management and the reader list to Managers.

**Tech Stack:** Next.js App Router, Mongoose/MongoDB, nanoid v5, Zod v4, NextAuth, Tailwind CSS

> **No test infrastructure in this project.** "Verify" steps use `npx tsc --noEmit` for type-checking. Manual browser verification is the functional test.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/models/book-invite.ts` | BookInvite Mongoose model |
| Create | `lib/models/book-reader.ts` | BookReader Mongoose model |
| Modify | `lib/access.ts` | Add `isBookReader` + `isManager` helpers |
| Create | `app/api/books/[bookId]/invite-link/route.ts` | GET/POST/DELETE invite link (Manager only) |
| Create | `app/api/invite/[token]/route.ts` | GET validate token (public) |
| Create | `app/api/invite/[token]/accept/route.ts` | POST accept invite (requires login) |
| Create | `app/api/books/[bookId]/readers/route.ts` | GET list readers (Manager only) |
| Create | `app/api/books/[bookId]/readers/[userId]/route.ts` | DELETE remove reader (Manager only) |
| Modify | `app/read/[bookId]/page.tsx` | Add BookReader to access check |
| Create | `app/invite/[token]/page.tsx` | Invite landing page |
| Create | `components/invite-link-manager.tsx` | UI: invite link controls + reader list |
| Modify | `app/books/[bookId]/edit/page.tsx` | Mount InviteLinkManager section |

---

### Task 1: BookInvite Model

**Files:**
- Create: `lib/models/book-invite.ts`

- [ ] **Step 1: Create the model**

```typescript
// lib/models/book-invite.ts
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookInvite extends Document {
  bookId: Types.ObjectId
  token: string
  createdBy: Types.ObjectId
  expiresAt: Date
  revokedAt?: Date
}

const BookInviteSchema = new Schema<IBookInvite>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    token: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true }
)

const BookInvite: Model<IBookInvite> =
  mongoose.models.BookInvite ?? mongoose.model<IBookInvite>('BookInvite', BookInviteSchema)

export default BookInvite
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors introduced by this file

- [ ] **Step 3: Commit**

```bash
git add lib/models/book-invite.ts
git commit -m "feat: add BookInvite model"
```

---

### Task 2: BookReader Model

**Files:**
- Create: `lib/models/book-reader.ts`

- [ ] **Step 1: Create the model**

```typescript
// lib/models/book-reader.ts
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookReader extends Document {
  bookId: Types.ObjectId
  userId: Types.ObjectId
  joinedAt: Date
}

const BookReaderSchema = new Schema<IBookReader>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
)

BookReaderSchema.index({ bookId: 1, userId: 1 }, { unique: true })

const BookReader: Model<IBookReader> =
  mongoose.models.BookReader ?? mongoose.model<IBookReader>('BookReader', BookReaderSchema)

export default BookReader
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/models/book-reader.ts
git commit -m "feat: add BookReader model"
```

---

### Task 3: Update lib/access.ts

**Files:**
- Modify: `lib/access.ts`

Current file exports `canEditBook` and `canReadBook`. We add `isManager` (sync alias) and `isBookReader` (async DB check). The old `canReadBook` used the Share token — we leave that export untouched to avoid breaking the old `/share/[token]` flow, and add `isBookReader` as a new export.

- [ ] **Step 1: Update the file**

Replace the entire content of `lib/access.ts` with:

```typescript
import Share from './models/share'
import BookReader from './models/book-reader'
import { dbConnect } from './mongoose'
import type { IBook } from './models/book'

export function isManager(userId: string, book: IBook): boolean {
  return (
    book.createdBy.toString() === userId ||
    book.editorId?.toString() === userId
  )
}

export function canEditBook(userId: string, book: IBook, role?: string): boolean {
  if (role === 'admin') return true
  return isManager(userId, book)
}

export async function isBookReader(userId: string, bookId: string): Promise<boolean> {
  await dbConnect()
  const exists = await BookReader.exists({ bookId, userId })
  return exists !== null
}

export async function canReadBook(
  userId: string,
  book: IBook,
  token?: string
): Promise<boolean> {
  if (canEditBook(userId, book)) return true
  if (!token) return false
  const share = await Share.exists({
    bookId: book._id,
    token,
    active: true,
  })
  return share !== null
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/access.ts
git commit -m "feat: add isManager and isBookReader helpers to access.ts"
```

---

### Task 4: Invite Link Management API

**Files:**
- Create: `app/api/books/[bookId]/invite-link/route.ts`

This route handles GET (current status), POST (generate/extend — upsert), DELETE (revoke). All three require Manager access.

- [ ] **Step 1: Create the directory and route file**

```typescript
// app/api/books/[bookId]/invite-link/route.ts
import type { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookInvite from '@/lib/models/book-invite'
import { isManager } from '@/lib/access'

type Ctx = { params: Promise<{ bookId: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invite = await BookInvite.findOne({ bookId })
  if (!invite) return Response.json({ active: false, invite: null })

  const now = new Date()
  const isActive = invite.revokedAt == null && invite.expiresAt > now

  return Response.json({
    active: isActive,
    invite: {
      token: invite.token,
      expiresAt: invite.expiresAt,
      revokedAt: invite.revokedAt ?? null,
    },
  })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = nanoid(12)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await BookInvite.findOneAndUpdate(
    { bookId },
    {
      $set: {
        token,
        expiresAt,
        revokedAt: undefined,
        createdBy: session.user.id,
      },
    },
    { upsert: true, new: true }
  )

  const origin = new URL(req.url).origin

  return Response.json({
    token: invite.token,
    expiresAt: invite.expiresAt,
    inviteUrl: `${origin}/invite/${invite.token}`,
  })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invite = await BookInvite.findOne({ bookId })
  if (!invite) return Response.json({ error: 'Not found' }, { status: 404 })

  invite.revokedAt = new Date()
  await invite.save()

  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/books/[bookId]/invite-link/route.ts
git commit -m "feat: invite link management API (GET/POST/DELETE)"
```

---

### Task 5: Token Validation API (Public)

**Files:**
- Create: `app/api/invite/[token]/route.ts`

No auth required — returns book title + cover so the landing page can render without a DB call.

- [ ] **Step 1: Create the file**

```typescript
// app/api/invite/[token]/route.ts
import type { NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongoose'
import BookInvite from '@/lib/models/book-invite'
import Book from '@/lib/models/book'

type Ctx = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params
  await dbConnect()

  const invite = await BookInvite.findOne({ token })
  if (!invite) {
    return Response.json({ error: 'Invite not found' }, { status: 404 })
  }

  const now = new Date()
  if (invite.revokedAt != null || invite.expiresAt <= now) {
    return Response.json({ error: 'Invite expired or revoked' }, { status: 410 })
  }

  const book = await Book.findById(invite.bookId)
  if (!book) {
    return Response.json({ error: 'Invite not found' }, { status: 404 })
  }

  return Response.json({
    bookId: book._id.toString(),
    title: book.title,
    coverImage: book.coverImage ?? null,
  })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/invite/[token]/route.ts
git commit -m "feat: public invite token validation API"
```

---

### Task 6: Accept Invite API

**Files:**
- Create: `app/api/invite/[token]/accept/route.ts`

Requires login. Validates token freshly (race: token may expire between landing page load and click), then upserts a BookReader record.

- [ ] **Step 1: Create the file**

```typescript
// app/api/invite/[token]/accept/route.ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import BookInvite from '@/lib/models/book-invite'
import BookReader from '@/lib/models/book-reader'
import Book from '@/lib/models/book'
import { isManager } from '@/lib/access'

type Ctx = { params: Promise<{ token: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token } = await params
  await dbConnect()

  const invite = await BookInvite.findOne({ token })
  if (!invite) {
    return Response.json({ error: 'Invite not found' }, { status: 404 })
  }

  const now = new Date()
  if (invite.revokedAt != null || invite.expiresAt <= now) {
    return Response.json({ error: 'Invite expired or revoked' }, { status: 410 })
  }

  const book = await Book.findById(invite.bookId)
  if (!book) {
    return Response.json({ error: 'Invite not found' }, { status: 404 })
  }

  const userId = session.user.id

  // Manager clicking their own invite just redirects — no DB write needed
  if (isManager(userId, book)) {
    return Response.json({ alreadyReader: true, bookId: book._id.toString() })
  }

  // Upsert: safe to call multiple times
  const existing = await BookReader.findOne({ bookId: invite.bookId, userId })
  if (existing) {
    return Response.json({ alreadyReader: true, bookId: book._id.toString() })
  }

  await BookReader.create({ bookId: invite.bookId, userId })

  return Response.json({ bookId: book._id.toString() })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/invite/[token]/accept/route.ts
git commit -m "feat: accept invite API — creates BookReader record"
```

---

### Task 7: Reader Management APIs

**Files:**
- Create: `app/api/books/[bookId]/readers/route.ts`
- Create: `app/api/books/[bookId]/readers/[userId]/route.ts`

- [ ] **Step 1: Create readers list route**

```typescript
// app/api/books/[bookId]/readers/route.ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import User from '@/lib/models/user'
import { isManager } from '@/lib/access'

type Ctx = { params: Promise<{ bookId: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const readers = await BookReader.find({ bookId }).lean()
  const userIds = readers.map((r) => r.userId)
  const users = await User.find({ _id: { $in: userIds } }).lean()
  const userMap = new Map(users.map((u) => [u._id.toString(), u]))

  const result = readers.map((r) => {
    const u = userMap.get(r.userId.toString())
    return {
      userId: r.userId.toString(),
      displayName: u?.nickname ?? u?.name ?? u?.email ?? r.userId.toString(),
      joinedAt: r.joinedAt,
    }
  })

  return Response.json(result)
}
```

- [ ] **Step 2: Create remove reader route**

```typescript
// app/api/books/[bookId]/readers/[userId]/route.ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import { isManager } from '@/lib/access'

type Ctx = { params: Promise<{ bookId: string; userId: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, userId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const deleted = await BookReader.findOneAndDelete({ bookId, userId })
  if (!deleted) {
    return Response.json({ error: 'Reader not found' }, { status: 404 })
  }

  return Response.json({ ok: true })
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/api/books/[bookId]/readers/route.ts app/api/books/[bookId]/readers/[userId]/route.ts
git commit -m "feat: reader list and remove reader APIs"
```

---

### Task 8: Update Read Page Access Control

**Files:**
- Modify: `app/read/[bookId]/page.tsx`

The current check is `canEditBook(userId, book) || book.published`. We add `isBookReader` as a third path. The `book.published` path is preserved for backward compatibility with the old `/share/[token]` flow (not in scope for removal).

- [ ] **Step 1: Update the access check in the read page**

In `app/read/[bookId]/page.tsx`, replace:

```typescript
import { canEditBook } from '@/lib/access'
```

with:

```typescript
import { canEditBook, isBookReader } from '@/lib/access'
```

Then replace:

```typescript
  // Owners/editors always have access; any logged-in user can read published books
  const canAccess = canEditBook(userId, book) || book.published
  if (!canAccess) redirect('/dashboard')
```

with:

```typescript
  const canAccess =
    canEditBook(userId, book) ||
    book.published ||
    (await isBookReader(userId, bookId))
  if (!canAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">你沒有這本書的閱讀權限</p>
      </main>
    )
  }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/read/[bookId]/page.tsx
git commit -m "feat: add BookReader check to read page access control"
```

---

### Task 9: Invite Landing Page

**Files:**
- Create: `app/invite/[token]/page.tsx`

Flow per spec:
1. Token invalid (404/410) → show "連結無效或書本已停止分享"
2. Not logged in → redirect to `/login?callbackUrl=/invite/[token]`
3. Already Manager or Reader → redirect to `/read/[bookId]`
4. Logged in, not yet a Reader → show book cover + title + "開始閱讀" button (client component handles POST + redirect)

The page is a Server Component for the DB checks; a small Client Component handles the "開始閱讀" button click.

- [ ] **Step 1: Create the accept button client component inline**

```typescript
// app/invite/[token]/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import BookInvite from '@/lib/models/book-invite'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import { isManager } from '@/lib/access'
import { AcceptInviteButton } from './accept-button'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  await dbConnect()

  const invite = await BookInvite.findOne({ token })
  const now = new Date()
  const isValidInvite =
    invite != null &&
    invite.revokedAt == null &&
    invite.expiresAt > now

  if (!isValidInvite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結無效或書本已停止分享</p>
      </main>
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`)
  }

  const book = await Book.findById(invite.bookId)
  if (!book) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結無效或書本已停止分享</p>
      </main>
    )
  }

  const userId = session.user.id
  const bookId = book._id.toString()

  // Already has access — skip ahead
  if (isManager(userId, book)) redirect(`/read/${bookId}`)
  const alreadyReader = await BookReader.exists({ bookId, userId })
  if (alreadyReader) redirect(`/read/${bookId}`)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#FAF7F2] px-4">
      {book.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImage}
          alt={book.title}
          className="h-48 w-36 rounded-lg object-cover shadow-md"
        />
      )}
      <h1 className="text-xl font-semibold text-[#2C1810]">{book.title}</h1>
      <AcceptInviteButton token={token} bookId={bookId} />
    </main>
  )
}
```

- [ ] **Step 2: Create the accept button client component**

```typescript
// app/invite/[token]/accept-button.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AcceptInviteButton({
  token,
  bookId,
}: {
  token: string
  bookId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '加入失敗')
      }
      router.push(`/read/${bookId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失敗')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleAccept}
        disabled={loading}
        className="rounded-md bg-[#2C1810] px-6 py-2.5 text-sm font-medium text-[#FAF7F2] disabled:opacity-50 transition-opacity"
      >
        {loading ? '加入中…' : '開始閱讀'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/invite/[token]/page.tsx app/invite/[token]/accept-button.tsx
git commit -m "feat: invite landing page with accept flow"
```

---

### Task 10: InviteLinkManager Component + Edit Page Integration

**Files:**
- Create: `components/invite-link-manager.tsx`
- Modify: `app/books/[bookId]/edit/page.tsx`

The component fetches invite link state and reader list on mount, and exposes Generate/Extend, Revoke, and Remove Reader actions.

- [ ] **Step 1: Create the component**

```typescript
// components/invite-link-manager.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'

interface InviteState {
  active: boolean
  invite: {
    token: string
    expiresAt: string
    revokedAt: string | null
  } | null
  inviteUrl: string | null
}

interface Reader {
  userId: string
  displayName: string
  joinedAt: string
}

export function InviteLinkManager({ bookId }: { bookId: string }) {
  const [invite, setInvite] = useState<InviteState | null>(null)
  const [readers, setReaders] = useState<Reader[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [invRes, rdRes] = await Promise.all([
        fetch(`/api/books/${bookId}/invite-link`),
        fetch(`/api/books/${bookId}/readers`),
      ])
      if (!invRes.ok || !rdRes.ok) throw new Error('載入失敗')
      const invData = await invRes.json()
      const rdData = await rdRes.json()
      const origin = window.location.origin
      setInvite({
        ...invData,
        inviteUrl: invData.invite ? `${origin}/invite/${invData.invite.token}` : null,
      })
      setReaders(rdData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleGenerate() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/invite-link`, { method: 'POST' })
      if (!res.ok) throw new Error('產生連結失敗')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '產生連結失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRevoke() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/invite-link`, { method: 'DELETE' })
      if (!res.ok) throw new Error('撤銷失敗')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤銷失敗')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveReader(userId: string) {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/readers/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('移除失敗')
      setReaders((prev) => prev.filter((r) => r.userId !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  function copyUrl() {
    if (invite?.inviteUrl) navigator.clipboard.writeText(invite.inviteUrl)
  }

  if (loading) {
    return <p className="text-sm text-[#2C1810]/50">載入中…</p>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[#2C1810]">邀請連結</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {invite?.active && invite.inviteUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={invite.inviteUrl}
              className="flex-1 truncate rounded border border-[#2C1810]/20 bg-white px-2 py-1 text-xs text-[#2C1810]"
            />
            <button
              onClick={copyUrl}
              className="rounded border border-[#2C1810]/20 px-2 py-1 text-xs text-[#2C1810] hover:bg-[#2C1810]/5"
            >
              複製
            </button>
          </div>
          <p className="text-xs text-[#2C1810]/50">
            到期時間：{new Date(invite.invite!.expiresAt).toLocaleDateString('zh-TW')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={actionLoading}
              className="rounded border border-[#2C1810]/30 px-2 py-1 text-xs text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-50"
            >
              延長 7 天
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
        <div className="space-y-1">
          {invite?.invite && !invite.active && (
            <p className="text-xs text-[#2C1810]/50">
              {invite.invite.revokedAt ? '連結已撤銷' : '連結已到期'}
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={actionLoading}
            className="rounded-md bg-[#2C1810] px-3 py-1.5 text-xs font-medium text-[#FAF7F2] disabled:opacity-50"
          >
            {actionLoading ? '產生中…' : '產生邀請連結'}
          </button>
        </div>
      )}

      {readers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[#2C1810]">讀者</h3>
          <ul className="space-y-1">
            {readers.map((r) => (
              <li key={r.userId} className="flex items-center justify-between">
                <span className="text-xs text-[#2C1810]">{r.displayName}</span>
                <button
                  onClick={() => handleRemoveReader(r.userId)}
                  disabled={actionLoading}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add InviteLinkManager to the edit page**

In `app/books/[bookId]/edit/page.tsx`, add the import at the top:

```typescript
import { InviteLinkManager } from '@/components/invite-link-manager'
```

Then, after the `<BookEditorClient .../>` line and before the closing `</main>`, add a footer section:

Replace:

```typescript
      <BookEditorClient bookId={bookId} initialPages={pages} initialTags={book.tags ?? []} />
    </main>
```

with:

```typescript
      <BookEditorClient bookId={bookId} initialPages={pages} initialTags={book.tags ?? []} />
      <section className="flex-none border-t border-[#2C1810]/10 bg-[#FAF7F2] px-4 sm:px-6 py-4">
        <InviteLinkManager bookId={bookId} />
      </section>
    </main>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/invite-link-manager.tsx app/books/[bookId]/edit/page.tsx
git commit -m "feat: InviteLinkManager component — invite link controls and reader list on edit page"
```

---

## Manual Verification Checklist

After all tasks complete, verify these flows in the browser:

- [ ] Manager opens edit page → "讀者與分享" section visible; reader count is 0; no active invite
- [ ] Manager clicks "產生邀請連結" → URL appears; expiry date shown
- [ ] Copy link → open in incognito (logged out) → redirected to login with callbackUrl
- [ ] Log in as a non-Manager user → returned to `/invite/[token]` → book title visible → click "開始閱讀" → redirected to `/read/[bookId]`
- [ ] Back on edit page: reader now appears in list
- [ ] Manager clicks "撤銷" → invite URL becomes invalid (try in incognito → "連結無效…")
- [ ] Manager clicks "產生邀請連結" again → new URL generated
- [ ] Manager clicks "移除" next to a reader → reader disappears; that user can no longer access `/read/[bookId]` (gets "你沒有這本書的閱讀權限")
- [ ] Manager (creator/editor) clicking invite link directly → skips accept, goes straight to read page
- [ ] Old `/share/[token]` flow: published books still accessible (no regression)
