# Share Reader Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild reader management on top of the existing share link — track who reads a book, let managers view and remove individual readers.

**Architecture:** Introduce a `BookReader` model that is upserted when a logged-in user follows a valid share link. Access to `shared` books on the read page is gated on `BookReader` existence rather than `shareStatus` alone. Managers can list and remove readers via two new API routes exposed in a new `ReaderList` component on the edit page.

**Tech Stack:** Next.js App Router (SSR + client components), Mongoose, TypeScript, Tailwind CSS

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/models/book-reader.ts` | BookReader mongoose model |
| Modify | `lib/access.ts` | Replace `canReadBook` to use BookReader |
| Modify | `app/read/[bookId]/page.tsx` | Use new `canReadBook` |
| Modify | `app/share/[token]/page.tsx` | Upsert BookReader before redirect |
| Create | `app/api/books/[bookId]/readers/route.ts` | GET readers list |
| Create | `app/api/books/[bookId]/readers/[userId]/route.ts` | DELETE reader |
| Create | `components/reader-list.tsx` | Reader list UI |
| Modify | `app/books/[bookId]/edit/page.tsx` | Add ReaderList to bottom section |
| Delete | `app/api/books/[bookId]/invite/route.ts` | Remove old editor invite route |

---

## Task 1: BookReader model

**Files:**
- Create: `lib/models/book-reader.ts`

- [ ] **Step 1: Create the model file**

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
BookReaderSchema.index({ bookId: 1 })

const BookReader: Model<IBookReader> =
  mongoose.models.BookReader ?? mongoose.model<IBookReader>('BookReader', BookReaderSchema)

export default BookReader
```

- [ ] **Step 2: Commit**

```bash
git add lib/models/book-reader.ts
git commit -m "feat: add BookReader model"
```

---

## Task 2: Update canReadBook in lib/access.ts

**Files:**
- Modify: `lib/access.ts`

The current `canReadBook` uses a share token for validation. Replace it with a BookReader-based check. Remove the now-unused `Share` import and `token` parameter.

- [ ] **Step 1: Rewrite lib/access.ts**

```typescript
// lib/access.ts
import type { IBook } from './models/book'
import BookReader from './models/book-reader'

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

export async function canReadBook(userId: string, book: IBook): Promise<boolean> {
  if (canEditBook(userId, book)) return true
  if (book.shareStatus === 'public') return true
  if (book.shareStatus === 'shared') {
    const reader = await BookReader.exists({ bookId: book._id, userId })
    return reader !== null
  }
  return false
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/access.ts
git commit -m "feat: canReadBook now checks BookReader for shared books"
```

---

## Task 3: Update read page access check

**Files:**
- Modify: `app/read/[bookId]/page.tsx`

Replace the inline access check with `canReadBook`. The `canEditBook` import is no longer needed for the access gate (it's still used indirectly via `canReadBook`).

- [ ] **Step 1: Update imports and access check**

Replace the import line:
```typescript
import { canEditBook } from '@/lib/access'
```
with:
```typescript
import { canReadBook } from '@/lib/access'
```

Replace the access check block (lines 26–36):
```typescript
  const canAccess =
    canEditBook(userId, book) ||
    book.shareStatus === 'shared' ||
    book.shareStatus === 'public'
  if (!canAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">你沒有這本書的閱讀權限</p>
      </main>
    )
  }
```
with:
```typescript
  const canAccess = await canReadBook(userId, book)
  if (!canAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">你沒有這本書的閱讀權限</p>
      </main>
    )
  }
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd forlove10grams && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `read/[bookId]/page.tsx` or `lib/access.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/read/\[bookId\]/page.tsx
git commit -m "feat: gate shared-book read access on BookReader record"
```

---

## Task 4: Upsert BookReader in share page

**Files:**
- Modify: `app/share/[token]/page.tsx`

When a logged-in user follows a valid share link for a `shared` book, upsert a BookReader record before redirecting. This creates the reader's access record silently. For `public` books, skip the upsert (public access doesn't require a BookReader).

- [ ] **Step 1: Add imports**

Add to the top of `app/share/[token]/page.tsx` after existing imports:
```typescript
import BookReader from '@/lib/models/book-reader'
```

- [ ] **Step 2: Replace the final redirect block**

The current last block in the page function is:
```typescript
  if (book.shareStatus !== 'shared' && book.shareStatus !== 'public') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">此記憶書尚未發布</p>
      </main>
    )
  }

  redirect(`/read/${share.bookId.toString()}`)
```

Replace with:
```typescript
  if (book.shareStatus !== 'shared' && book.shareStatus !== 'public') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">此記憶書尚未發布</p>
      </main>
    )
  }

  if (book.shareStatus === 'shared') {
    await BookReader.findOneAndUpdate(
      { bookId: book._id, userId: session.user.id },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true }
    )
  }

  redirect(`/read/${share.bookId.toString()}`)
```

- [ ] **Step 3: Commit**

```bash
git add app/share/\[token\]/page.tsx
git commit -m "feat: upsert BookReader when user follows share link"
```

---

## Task 5: GET /api/books/[bookId]/readers

**Files:**
- Create: `app/api/books/[bookId]/readers/route.ts`

Returns the reader list for a book. Only accessible to Managers (owner or editor). `displayName` prefers `user.nickname`, falls back to `user.name`.

- [ ] **Step 1: Create the route file**

```typescript
// app/api/books/[bookId]/readers/route.ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import User from '@/lib/models/user'
import { isManager } from '@/lib/access'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id!, book))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const readers = await BookReader.find({ bookId: book._id }).sort({ joinedAt: -1 }).lean()
  const userIds = readers.map((r) => r.userId)
  const users = await User.find({ _id: { $in: userIds } }, 'name nickname').lean()
  const userMap = new Map(users.map((u) => [u._id.toString(), u]))

  const result = readers.map((r) => ({
    userId: r.userId.toString(),
    displayName:
      userMap.get(r.userId.toString())?.nickname ??
      userMap.get(r.userId.toString())?.name ??
      '未知使用者',
    joinedAt: r.joinedAt.toISOString(),
  }))

  return Response.json(result)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/books/\[bookId\]/readers/route.ts
git commit -m "feat: GET /api/books/[bookId]/readers"
```

---

## Task 6: DELETE /api/books/[bookId]/readers/[userId]

**Files:**
- Create: `app/api/books/[bookId]/readers/[userId]/route.ts`

Removes a single reader. Returns 404 if the reader record doesn't exist.

- [ ] **Step 1: Create the route file**

```typescript
// app/api/books/[bookId]/readers/[userId]/route.ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import { isManager } from '@/lib/access'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string; userId: string }> }
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, userId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id!, book))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const deleted = await BookReader.findOneAndDelete({ bookId: book._id, userId })
  if (!deleted) return Response.json({ error: 'Reader not found' }, { status: 404 })

  return new Response(null, { status: 204 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/books/\[bookId\]/readers/\[userId\]/route.ts
git commit -m "feat: DELETE /api/books/[bookId]/readers/[userId]"
```

---

## Task 7: ReaderList component

**Files:**
- Create: `components/reader-list.tsx`

Client component. Fetches readers on mount (only when `shareStatus === 'shared'`). Supports inline remove with optimistic list update.

- [ ] **Step 1: Create the component**

```typescript
// components/reader-list.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'

interface Reader {
  userId: string
  displayName: string
  joinedAt: string
}

export function ReaderList({
  bookId,
  shareStatus,
}: {
  bookId: string
  shareStatus: string
}) {
  const [readers, setReaders] = useState<Reader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchReaders = useCallback(async () => {
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/readers`)
      if (!res.ok) throw new Error()
      setReaders(await res.json())
    } catch {
      setError('載入失敗，請重新整理')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    if (shareStatus !== 'shared') return
    fetchReaders()
  }, [shareStatus, fetchReaders])

  if (shareStatus !== 'shared') return null

  async function handleRemove(userId: string) {
    setRemoving(userId)
    setError('')
    try {
      const res = await fetch(`/api/books/${bookId}/readers/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      setReaders((prev) => prev.filter((r) => r.userId !== userId))
    } catch {
      setError('移除失敗')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#2C1810]">讀者名單</h3>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-[#2C1810]/50">載入中…</p>
      ) : readers.length === 0 ? (
        <p className="text-sm text-[#2C1810]/50">還沒有讀者</p>
      ) : (
        <ul className="space-y-2">
          {readers.map((r) => (
            <li key={r.userId} className="flex items-center justify-between gap-2">
              <div>
                <span className="text-sm text-[#2C1810]">{r.displayName}</span>
                <span className="ml-2 text-xs text-[#2C1810]/50">
                  {new Date(r.joinedAt).toLocaleDateString('zh-TW')}
                </span>
              </div>
              <button
                onClick={() => handleRemove(r.userId)}
                disabled={removing === r.userId}
                className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader-list.tsx
git commit -m "feat: ReaderList component"
```

---

## Task 8: Wire ReaderList into edit page

**Files:**
- Modify: `app/books/[bookId]/edit/page.tsx`

Add import and render `ReaderList` in the bottom section after `ShareLinkManager`. Pass `shareStatus` from the SSR-fetched book.

- [ ] **Step 1: Add import**

Add after the existing component imports (around line 13):
```typescript
import { ReaderList } from '@/components/reader-list'
```

- [ ] **Step 2: Add ReaderList to the bottom section**

Find the bottom section (currently around line 75–78):
```tsx
      <section className="flex-none border-t border-[#2C1810]/10 bg-[#FAF7F2] px-4 sm:px-6 py-4 space-y-6">
        {(isOwner || isEditor) && <ShareLinkManager bookId={bookId} />}
      </section>
```

Replace with:
```tsx
      <section className="flex-none border-t border-[#2C1810]/10 bg-[#FAF7F2] px-4 sm:px-6 py-4 space-y-6">
        {(isOwner || isEditor) && <ShareLinkManager bookId={bookId} />}
        {(isOwner || isEditor) && (
          <ReaderList bookId={bookId} shareStatus={book.shareStatus} />
        )}
      </section>
```

- [ ] **Step 3: Verify the file compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/books/\[bookId\]/edit/page.tsx
git commit -m "feat: add ReaderList to book edit page"
```

---

## Task 9: Delete old invite route

**Files:**
- Delete: `app/api/books/[bookId]/invite/route.ts`

This was the old editor-invite-by-email route. It set `book.editorId` via an admin-only API and is no longer used. Removing it avoids dead code confusion.

- [ ] **Step 1: Delete the file**

```bash
rm forlove10grams/app/api/books/\[bookId\]/invite/route.ts
```

- [ ] **Step 2: Verify no remaining references**

```bash
grep -r "books/\[bookId\]/invite\|/invite/route" forlove10grams/app forlove10grams/components forlove10grams/lib --include="*.ts" --include="*.tsx"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete old editor invite route"
```
