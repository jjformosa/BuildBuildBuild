# Reader Message (讀者私訊) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reader leave one private, editable one-line message to the creator at the end of a book; creators see all messages on their dashboard, editors see only messages from readers they personally brought in — with a `✉ N` badge and unread indicator.

**Architecture:** A new `BookMessage` model with a unique `(bookId, fromUserId)` index (one message per reader per book, upsert — the schema itself makes it impossible to grow into a message board/chat). A new `BookReader.sharedBy` field records who shared the book with each reader (copied once from `Share.createdBy` on first entry) and is the sole source of truth for visibility. The reader UI is a `MessageComposer` placed between the Like button and the handover letter at the book's end. Managers view via a `BookMessagesModal` opened from a dashboard `✉ N` badge; separate `readByCreatorAt` / `readByEditorAt` fields give creator and editor independent read state.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Mongoose, Zod. No test framework — verification is `npx tsc --noEmit`, `npm run lint`, and manual browser checks.

## Global Constraints

- No automated test framework exists in this project — do not add one. Verification is `cd forlove10grams && npx tsc --noEmit`, `npm run lint`, and manual browser checks.
- All paths below are relative to the repo root; source lives under `forlove10grams/`.
- **Design red lines — do not build:** creator replies, threads/chat, push/email notifications, rich text / stickers / photos. Plain-text one line only.
- **One message per reader per book**, enforced by a unique `(bookId, fromUserId)` index; PUT upserts (re-sending overwrites).
- Message body is trimmed and **1–500 chars**; empty/whitespace → 400; 501+ → 400.
- **Editors cannot leave messages** (decided 2026-07-07): the reader-message PUT requires the caller to NOT be a manager (`!canEditBook`). Only readers with access can post.
- **Visibility rule — "whoever shared it can see it":** creator sees ALL messages for their book; an editor sees only messages from readers whose `BookReader.sharedBy === editorId`. Never widen the audience silently — the composer states the audience up front.
- **Attribution timing:** `sharedBy` = `Share.createdBy` at the reader's **first** entry, written via `$setOnInsert`, then permanent. Later link revoke/rebuild or "extend 7 days" (which only updates `expiresAt`, not `createdBy`) never changes it. Missing `sharedBy` → treat as creator-shared (creator-only visibility).
- Message visibility is computed at query time by joining `fromUserId` → `BookReader.sharedBy`. Do NOT denormalize `sharedBy` onto `BookMessage`.
- Editing a message resets **both** `readByCreatorAt` and `readByEditorAt` to `null`. Deleting a message (creator only) returns the reader to the un-messaged state with no notification.
- Removed readers keep their existing messages but can no longer edit/withdraw; private books keep messages visible to managers.
- `N === 0` hides the badge (same convention as likes).
- Spec: `docs/superpowers/specs/2026-07-07-reader-message-design.md`

---

### Task 1: Add `BookReader.sharedBy` and record it on first entry

**Files:**
- Modify: `forlove10grams/lib/models/book-reader.ts`
- Modify: `forlove10grams/app/share/[token]/page.tsx`

**Interfaces:**
- Produces: `IBookReader.sharedBy?: Types.ObjectId` — set once, on first upsert, to the share's `createdBy`.

- [ ] **Step 1: Add the field to the model**

Find:

```ts
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
```

Replace with:

```ts
export interface IBookReader extends Document {
  bookId: Types.ObjectId
  userId: Types.ObjectId
  joinedAt: Date
  sharedBy?: Types.ObjectId // Share.createdBy at first entry — governs message visibility
}

const BookReaderSchema = new Schema<IBookReader>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: () => new Date() },
    sharedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: false }
)
```

- [ ] **Step 2: Write `sharedBy` on first entry in the share route**

In `app/share/[token]/page.tsx`, find:

```ts
  if (book.shareStatus === 'shared' && !isManager(session.user.id!, book)) {
    await BookReader.findOneAndUpdate(
      { bookId: book._id, userId: session.user.id },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true }
    )
  }
```

Replace with:

```ts
  if (book.shareStatus === 'shared' && !isManager(session.user.id!, book)) {
    await BookReader.findOneAndUpdate(
      { bookId: book._id, userId: session.user.id },
      { $setOnInsert: { joinedAt: new Date(), sharedBy: share.createdBy } },
      { upsert: true }
    )
  }
```

`$setOnInsert` writes `sharedBy` only when the `BookReader` is first created; subsequent entries through any link leave it unchanged (attribution timing rule).

- [ ] **Step 3: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to either file.

- [ ] **Step 4: Commit**

```bash
git add forlove10grams/lib/models/book-reader.ts "forlove10grams/app/share/[token]/page.tsx"
git commit -m "feat: record sharedBy on reader first entry"
```

---

### Task 2: Create the `BookMessage` model

**Files:**
- Create: `forlove10grams/lib/models/book-message.ts`

**Interfaces:**
- Produces: `IBookMessage { bookId, fromUserId, body, readByCreatorAt, readByEditorAt, createdAt, updatedAt }`; default export `BookMessage`; unique index `(bookId, fromUserId)`.

- [ ] **Step 1: Create the model**

```ts
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IBookMessage extends Document {
  bookId: Types.ObjectId
  fromUserId: Types.ObjectId
  body: string // 1–500 chars
  readByCreatorAt?: Date | null // null = creator hasn't seen it
  readByEditorAt?: Date | null // null = editor hasn't seen it
  createdAt: Date
  updatedAt: Date
}

const BookMessageSchema = new Schema<IBookMessage>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    readByCreatorAt: { type: Date, default: null },
    readByEditorAt: { type: Date, default: null },
  },
  { timestamps: true }
)

BookMessageSchema.index({ bookId: 1, fromUserId: 1 }, { unique: true }) // one message per reader per book
BookMessageSchema.index({ bookId: 1 })

const BookMessage: Model<IBookMessage> =
  mongoose.models.BookMessage ?? mongoose.model<IBookMessage>('BookMessage', BookMessageSchema)

export default BookMessage
```

- [ ] **Step 2: Typecheck**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to `lib/models/book-message.ts`.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/lib/models/book-message.ts
git commit -m "feat: add BookMessage model"
```

---

### Task 3: Reader message route (create/edit + withdraw)

**Files:**
- Create: `forlove10grams/app/api/books/[bookId]/message/route.ts`

**Interfaces:**
- Consumes: `BookMessage` (Task 2), `canReadBook`/`canEditBook` (existing).
- Produces:
  - `PUT /api/books/[bookId]/message` body `{ body }` → `{ body, updatedAt }`; upsert; resets both read timestamps.
  - `DELETE /api/books/[bookId]/message` → `{ ok: true }`; 404 if none.

- [ ] **Step 1: Create the route**

```ts
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookMessage from '@/lib/models/book-message'
import { canEditBook, canReadBook } from '@/lib/access'

const PutBody = z.object({ body: z.string().trim().min(1).max(500) })

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId } = await ctx.params

  const parsed = PutBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })

  // Only readers-with-access, never managers (creator/editor).
  if (canEditBook(userId, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Managers cannot leave messages' }, { status: 403 })
  }
  if (!(await canReadBook(userId, book))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const msg = await BookMessage.findOneAndUpdate(
    { bookId: book._id, fromUserId: userId },
    { body: parsed.data.body, readByCreatorAt: null, readByEditorAt: null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return Response.json({ body: msg.body, updatedAt: msg.updatedAt })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId } = await ctx.params

  await dbConnect()
  const res = await BookMessage.deleteOne({ bookId, fromUserId: userId })
  if (res.deletedCount === 0) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to the route.

- [ ] **Step 3: Commit**

```bash
git add "forlove10grams/app/api/books/[bookId]/message/route.ts"
git commit -m "feat: reader message create/edit/withdraw API"
```

---

### Task 4: Manager routes (list, mark-read, delete)

**Files:**
- Create: `forlove10grams/app/api/books/[bookId]/messages/route.ts`
- Create: `forlove10grams/app/api/books/[bookId]/messages/read/route.ts`
- Create: `forlove10grams/app/api/books/[bookId]/messages/[messageId]/route.ts`

**Interfaces:**
- Consumes: `BookMessage` (Task 2), `BookReader.sharedBy` (Task 1), `User`, `isManager`/`canEditBook` (existing).
- Produces:
  - `GET /api/books/[bookId]/messages` → `Array<{ _id, fromName, body, updatedAt, unread }>` (creator: all; editor: only `sharedBy === editorId`).
  - `PATCH /api/books/[bookId]/messages/read` → `{ ok: true }` (writes the requester's readBy field).
  - `DELETE /api/books/[bookId]/messages/[messageId]` → `{ ok: true }` (creator only).

- [ ] **Step 1: Create a shared visibility helper `lib/queries/book-message-visibility.ts`**

```ts
import type { Types } from 'mongoose'
import BookReader from '@/lib/models/book-reader'
import type { IBookMessage } from '@/lib/models/book-message'

/**
 * Given all messages for one book and the editor's id, return only those
 * whose author is a reader the editor personally brought in
 * (BookReader.sharedBy === editorId).
 */
export async function filterEditorVisible(
  bookId: Types.ObjectId,
  editorId: string,
  messages: IBookMessage[]
): Promise<IBookMessage[]> {
  const readers = await BookReader.find(
    { bookId, sharedBy: editorId },
    'userId'
  ).lean<{ userId: Types.ObjectId }[]>()
  const allowed = new Set(readers.map((r) => r.userId.toString()))
  return messages.filter((m) => allowed.has(m.fromUserId.toString()))
}
```

- [ ] **Step 2: Create `messages/route.ts` (GET list)**

```ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookMessage, { type IBookMessage } from '@/lib/models/book-message'
import User from '@/lib/models/user'
import { isManager } from '@/lib/access'
import { filterEditorVisible } from '@/lib/queries/book-message-visibility'

type UserNameDoc = { _id: unknown; name?: string; nickname?: string | null }

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(userId, book)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const isCreator = book.createdBy.toString() === userId
  const all = await BookMessage.find({ bookId: book._id }).sort({ updatedAt: -1 }).lean<IBookMessage[]>()
  const visible = isCreator ? all : await filterEditorVisible(book._id, userId, all)

  const fromIds = visible.map((m) => m.fromUserId)
  const users = await User.find({ _id: { $in: fromIds } }, 'name nickname').lean<UserNameDoc[]>()
  const nameMap = new Map(users.map((u) => [String(u._id), u.nickname ?? u.name ?? '讀者']))

  return Response.json(
    visible.map((m) => ({
      _id: m._id!.toString(),
      fromName: nameMap.get(m.fromUserId.toString()) ?? '讀者',
      body: m.body,
      updatedAt: m.updatedAt,
      unread: isCreator ? m.readByCreatorAt == null : m.readByEditorAt == null,
    }))
  )
}
```

- [ ] **Step 3: Create `messages/read/route.ts` (PATCH mark-read)**

```ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookMessage, { type IBookMessage } from '@/lib/models/book-message'
import { isManager } from '@/lib/access'
import { filterEditorVisible } from '@/lib/queries/book-message-visibility'

export async function PATCH(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(userId, book)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const isCreator = book.createdBy.toString() === userId

  if (isCreator) {
    await BookMessage.updateMany(
      { bookId: book._id, readByCreatorAt: null },
      { readByCreatorAt: now }
    )
  } else {
    const all = await BookMessage.find({ bookId: book._id, readByEditorAt: null }).lean<IBookMessage[]>()
    const visible = await filterEditorVisible(book._id, userId, all)
    const ids = visible.map((m) => m._id)
    if (ids.length > 0) {
      await BookMessage.updateMany({ _id: { $in: ids } }, { readByEditorAt: now })
    }
  }

  return Response.json({ ok: true })
}
```

- [ ] **Step 4: Create `messages/[messageId]/route.ts` (DELETE, creator only)**

```ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookMessage from '@/lib/models/book-message'

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string; messageId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId, messageId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  // Creator only — final disposition follows book ownership, editors cannot delete.
  if (book.createdBy.toString() !== userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const res = await BookMessage.deleteOne({ _id: messageId, bookId: book._id })
  if (res.deletedCount === 0) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
```

- [ ] **Step 5: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to the three routes or the helper.

- [ ] **Step 6: Commit**

```bash
git add "forlove10grams/app/api/books/[bookId]/messages" forlove10grams/lib/queries/book-message-visibility.ts
git commit -m "feat: manager message list, mark-read, and delete APIs"
```

---

### Task 5: Dashboard message-count query

**Files:**
- Create: `forlove10grams/lib/queries/book-message-counts.ts`

**Interfaces:**
- Consumes: `BookMessage` (Task 2), `filterEditorVisible` (Task 4).
- Produces: `getMessageCountsByBook(bookIds, viewerId, scope): Promise<Map<string, { total: number; unread: number }>>` — `scope: 'owner' | 'editor'`.

- [ ] **Step 1: Create the query**

```ts
import type { Types } from 'mongoose'
import BookMessage, { type IBookMessage } from '@/lib/models/book-message'
import { filterEditorVisible } from '@/lib/queries/book-message-visibility'

export type MessageCount = { total: number; unread: number }

export async function getMessageCountsByBook(
  bookIds: Types.ObjectId[],
  viewerId: string,
  scope: 'owner' | 'editor'
): Promise<Map<string, MessageCount>> {
  if (bookIds.length === 0) return new Map()

  const all = await BookMessage.find({ bookId: { $in: bookIds } }).lean<IBookMessage[]>()

  // For editors, keep only messages from readers they brought in — per book.
  let visible = all
  if (scope === 'editor') {
    const byBook = new Map<string, IBookMessage[]>()
    for (const m of all) {
      const id = m.bookId.toString()
      const list = byBook.get(id) ?? []
      list.push(m)
      byBook.set(id, list)
    }
    const kept: IBookMessage[] = []
    for (const bookId of bookIds) {
      const msgs = byBook.get(bookId.toString())
      if (!msgs) continue
      kept.push(...(await filterEditorVisible(bookId, viewerId, msgs)))
    }
    visible = kept
  }

  const map = new Map<string, MessageCount>()
  for (const m of visible) {
    const id = m.bookId.toString()
    const cur = map.get(id) ?? { total: 0, unread: 0 }
    cur.total += 1
    const unread = scope === 'owner' ? m.readByCreatorAt == null : m.readByEditorAt == null
    if (unread) cur.unread += 1
    map.set(id, cur)
  }
  return map
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to the query.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/lib/queries/book-message-counts.ts
git commit -m "feat: dashboard message-count query"
```

---

### Task 6: `MessageComposer` component

**Files:**
- Create: `forlove10grams/components/message-composer.tsx`

**Interfaces:**
- Consumes: `PUT`/`DELETE /api/books/[bookId]/message` (Task 3).
- Produces: `MessageComposer` — `export function MessageComposer({ bookId, initialMessage, creatorName, editorName }: { bookId: string; initialMessage: string | null; creatorName: string; editorName: string | null }): JSX.Element`. When `editorName` is non-null the audience includes the editor.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'

const MAX = 500

export function MessageComposer({
  bookId,
  initialMessage,
  creatorName,
  editorName,
}: {
  bookId: string
  initialMessage: string | null
  creatorName: string
  editorName: string | null
}) {
  type Mode = 'prompt' | 'editing' | 'saved'
  const [mode, setMode] = useState<Mode>(initialMessage ? 'saved' : 'prompt')
  const [saved, setSaved] = useState<string | null>(initialMessage)
  const [draft, setDraft] = useState(initialMessage ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const audience = editorName
    ? `只有 ${creatorName} 和 ${editorName} 看得到`
    : `只有 ${creatorName} 看得到`

  async function submit() {
    const body = draft.trim()
    if (!body || pending) return
    setPending(true)
    setError('')
    const prev = saved
    setSaved(body) // optimistic
    setMode('saved')
    try {
      const res = await fetch(`/api/books/${bookId}/message`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSaved(prev)
      setMode(prev ? 'saved' : 'editing')
      setError('送出失敗，請再試一次')
    } finally {
      setPending(false)
    }
  }

  async function withdraw() {
    if (!confirm('收回這句話？')) return
    setPending(true)
    setError('')
    const prev = saved
    setSaved(null)
    setDraft('')
    setMode('prompt')
    try {
      const res = await fetch(`/api/books/${bookId}/message`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      setSaved(prev)
      setDraft(prev ?? '')
      setMode('saved')
      setError('收回失敗，請再試一次')
    } finally {
      setPending(false)
    }
  }

  if (mode === 'saved' && saved) {
    return (
      <div className="mt-6 w-full text-center">
        <p className="mx-auto max-w-sm border-l-2 border-foreground/20 pl-3 text-left text-sm italic leading-relaxed text-muted-foreground">
          「{saved}」
        </p>
        <div className="mt-3 flex justify-center gap-4">
          <button onClick={() => { setDraft(saved); setMode('editing') }} className="text-xs text-primary underline underline-offset-2">
            修改
          </button>
          <button onClick={withdraw} disabled={pending} className="text-xs text-muted-foreground underline underline-offset-2">
            收回
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  if (mode === 'editing') {
    return (
      <div className="mt-6 w-full">
        <textarea
          autoFocus
          value={draft}
          maxLength={MAX}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`寫一句話…（${audience}）`}
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          rows={3}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{draft.length}/{MAX}</span>
          <button
            onClick={submit}
            disabled={pending || !draft.trim()}
            className="rounded-md bg-primary px-4 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            送出
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  // prompt
  return (
    <div className="mt-6 text-center">
      <button
        onClick={() => setMode('editing')}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        讀完了，想對 {creatorName} 說一句話嗎？（{audience}）
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to `components/message-composer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/components/message-composer.tsx
git commit -m "feat: add MessageComposer"
```

---

### Task 7: `BookMessagesModal` component

**Files:**
- Create: `forlove10grams/components/book-messages-modal.tsx`

**Interfaces:**
- Consumes: `GET /api/books/[bookId]/messages`, `PATCH .../messages/read`, `DELETE .../messages/[messageId]` (Task 4).
- Produces: `BookMessagesModal` — `export default function BookMessagesModal({ bookId, role, onClose, onRead }: { bookId: string; role: 'owner' | 'editor'; onClose: () => void; onRead: () => void }): JSX.Element`. `onRead` lets the caller clear its unread dot after the modal marks read.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useEffect, useState } from 'react'

type Message = { _id: string; fromName: string; body: string; updatedAt: string; unread: boolean }

export default function BookMessagesModal({
  bookId,
  role,
  onClose,
  onRead,
}: {
  bookId: string
  role: 'owner' | 'editor'
  onClose: () => void
  onRead: () => void
}) {
  const [messages, setMessages] = useState<Message[] | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/books/${bookId}/messages`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Message[]) => {
        if (cancelled) return
        setMessages(data)
        // Mark read on open, then notify the caller to clear its unread dot.
        fetch(`/api/books/${bookId}/messages/read`, { method: 'PATCH' })
          .then(() => onRead())
          .catch(() => {})
      })
      .catch(() => setMessages([]))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  async function remove(id: string) {
    if (!confirm('刪除這則訊息？')) return
    const res = await fetch(`/api/books/${bookId}/messages/${id}`, { method: 'DELETE' })
    if (res.ok) setMessages((prev) => prev!.filter((m) => m._id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">讀者的話</h2>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground/60 text-lg leading-none" aria-label="關閉">
            ✕
          </button>
        </div>

        {messages === null ? (
          <p className="py-6 text-center text-sm text-foreground/50">載入中…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground/50">還沒有讀者留言。</p>
        ) : (
          <ul className="max-h-96 space-y-3 overflow-y-auto">
            {messages.map((m) => (
              <li key={m._id} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {m.unread && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose align-middle" />}
                    {m.fromName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.updatedAt).toLocaleDateString('zh-TW')}
                  </span>
                </div>
                <p className="mt-1.5 border-l-2 border-foreground/15 pl-2.5 text-sm italic leading-relaxed text-foreground/80">
                  「{m.body}」
                </p>
                {role === 'owner' && (
                  <div className="mt-2 text-right">
                    <button onClick={() => remove(m._id)} className="text-xs text-muted-foreground hover:text-destructive">
                      刪除
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to `components/book-messages-modal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/components/book-messages-modal.tsx
git commit -m "feat: add BookMessagesModal"
```

---

### Task 8: Wire the composer into the reader end-of-book flow

**Files:**
- Modify: `forlove10grams/app/read/[bookId]/page.tsx`
- Modify: `forlove10grams/components/read-page-client.tsx`
- Modify: `forlove10grams/components/book-close-ending.tsx`

**Interfaces:**
- Consumes: `MessageComposer` (Task 6), `BookReader.sharedBy` (Task 1), `BookMessage` (Task 2).
- Produces: `ReadPageClient` + `BookCloseEnding` accept `canMessage`, `initialMessage`, `messageCreatorName`, `messageEditorName`; the composer renders between the Like button and the handover letter, only for eligible readers.

- [ ] **Step 1: `app/read/[bookId]/page.tsx` — import models and compute composer props**

Find:

```ts
import BookLike from '@/lib/models/book-like'
import { ReadPageClient, type ReadPageData } from '@/components/read-page-client'
```

Replace with:

```ts
import BookLike from '@/lib/models/book-like'
import BookReader from '@/lib/models/book-reader'
import BookMessage from '@/lib/models/book-message'
import { canEditBook } from '@/lib/access'
import { ReadPageClient, type ReadPageData } from '@/components/read-page-client'
```

Then find:

```ts
  const viewer = await User.findById(userId).lean()
  const viewerNickname = viewer?.nickname ?? null
  const viewerMyNickname = viewer?.myNickname ?? null
```

Insert immediately after it:

```ts
  // ── Reader-message composer props (only for readers, never managers) ──
  const isManagerViewer = canEditBook(userId, book, session.user.role ?? undefined)
  let canMessage = false
  let initialMessage: string | null = null
  let messageCreatorName = ''
  let messageEditorName: string | null = null

  if (!isManagerViewer) {
    canMessage = true
    const reader = await BookReader.findOne(
      { bookId: book._id, userId },
      'sharedBy'
    ).lean<{ sharedBy?: import('mongoose').Types.ObjectId }>()
    const sharedBy = reader?.sharedBy?.toString() ?? book.createdBy.toString() // fallback: creator
    const sharerIsEditor = book.editorId ? sharedBy === book.editorId.toString() : false

    const creator = await User.findById(book.createdBy, 'name nickname').lean<{ name?: string; nickname?: string | null }>()
    messageCreatorName = creator?.nickname ?? creator?.name ?? '作者'

    if (sharerIsEditor && book.editorId) {
      const ed = await User.findById(book.editorId, 'name nickname').lean<{ name?: string; nickname?: string | null }>()
      messageEditorName = ed?.nickname ?? ed?.name ?? null
    }

    const myMsg = await BookMessage.findOne({ bookId: book._id, fromUserId: userId }, 'body').lean<{ body: string }>()
    initialMessage = myMsg?.body ?? null
  }
```

- [ ] **Step 2: `app/read/[bookId]/page.tsx` — pass the new props to `ReadPageClient`**

Find:

```tsx
      hasLiked={hasLiked}
      likeCount={likeCount}
      isEditor={isEditor}
      editorLetter={book.editorLetter ?? null}
      creatorName={creatorName}
    />
```

Replace with:

```tsx
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

- [ ] **Step 3: `read-page-client.tsx` — extend `Props` and thread props through**

Find the `Props` type:

```ts
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
}
```

Replace with:

```ts
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

Then find the destructuring:

```ts
export function ReadPageClient({
  bookId, bookTitle, initialPages, totalCount,
  viewerNickname, viewerMyNickname, hasLiked, likeCount, isEditor, editorLetter, creatorName,
}: Props) {
```

Replace with:

```ts
export function ReadPageClient({
  bookId, bookTitle, initialPages, totalCount,
  viewerNickname, viewerMyNickname, hasLiked, likeCount, isEditor, editorLetter, creatorName,
  canMessage, initialMessage, messageCreatorName, messageEditorName,
}: Props) {
```

Then find the `BookCloseEnding` usage:

```tsx
            <BookCloseEnding
              bookId={bookId}
              lastPageId={pages[pages.length - 1]._id}
              scrollContainerRef={scrollContainerRef}
              hasLiked={hasLiked}
              likeCount={likeCount}
              isEditor={isEditor}
              editorLetter={editorLetter}
              creatorName={creatorName}
            />
```

Replace with:

```tsx
            <BookCloseEnding
              bookId={bookId}
              lastPageId={pages[pages.length - 1]._id}
              scrollContainerRef={scrollContainerRef}
              hasLiked={hasLiked}
              likeCount={likeCount}
              isEditor={isEditor}
              editorLetter={editorLetter}
              creatorName={creatorName}
              canMessage={canMessage}
              initialMessage={initialMessage}
              messageCreatorName={messageCreatorName}
              messageEditorName={messageEditorName}
            />
```

- [ ] **Step 4: `book-close-ending.tsx` — accept the props and render `MessageComposer`**

Find:

```ts
import { LikeButton } from '@/components/like-button'
import { HandoverLetter } from '@/components/handover-letter'
```

Replace with:

```ts
import { LikeButton } from '@/components/like-button'
import { HandoverLetter } from '@/components/handover-letter'
import { MessageComposer } from '@/components/message-composer'
```

Then find the prop list:

```ts
export function BookCloseEnding({
  bookId,
  lastPageId,
  scrollContainerRef,
  hasLiked,
  likeCount,
  isEditor,
  editorLetter,
  creatorName,
}: {
  bookId: string
  lastPageId: string
  scrollContainerRef: RefObject<HTMLElement | null>
  hasLiked: boolean
  likeCount: number
  isEditor?: boolean
  editorLetter?: string | null
  creatorName?: string | null
}) {
```

Replace with:

```ts
export function BookCloseEnding({
  bookId,
  lastPageId,
  scrollContainerRef,
  hasLiked,
  likeCount,
  isEditor,
  editorLetter,
  creatorName,
  canMessage,
  initialMessage,
  messageCreatorName,
  messageEditorName,
}: {
  bookId: string
  lastPageId: string
  scrollContainerRef: RefObject<HTMLElement | null>
  hasLiked: boolean
  likeCount: number
  isEditor?: boolean
  editorLetter?: string | null
  creatorName?: string | null
  canMessage?: boolean
  initialMessage?: string | null
  messageCreatorName?: string
  messageEditorName?: string | null
}) {
```

Then find the Like button + handover block:

```tsx
        <div className="flex justify-center">
          <LikeButton bookId={bookId} initialHasLiked={hasLiked} initialLikeCount={likeCount} />
        </div>

        {isEditor && editorLetter && creatorName && (
          <HandoverLetter
            isEditor={isEditor}
            editorLetter={editorLetter}
            creatorName={creatorName}
            bookId={bookId}
          />
        )}
```

Replace with:

```tsx
        <div className="flex justify-center">
          <LikeButton bookId={bookId} initialHasLiked={hasLiked} initialLikeCount={likeCount} />
        </div>

        {canMessage && messageCreatorName && (
          <MessageComposer
            bookId={bookId}
            initialMessage={initialMessage ?? null}
            creatorName={messageCreatorName}
            editorName={messageEditorName ?? null}
          />
        )}

        {isEditor && editorLetter && creatorName && (
          <HandoverLetter
            isEditor={isEditor}
            editorLetter={editorLetter}
            creatorName={creatorName}
            bookId={bookId}
          />
        )}
```

- [ ] **Step 5: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to any of the three files.

- [ ] **Step 6: Commit**

```bash
git add "forlove10grams/app/read/[bookId]/page.tsx" forlove10grams/components/read-page-client.tsx forlove10grams/components/book-close-ending.tsx
git commit -m "feat: render reader message composer at book end"
```

---

### Task 9: Wire message badges into the dashboard

**Files:**
- Modify: `forlove10grams/app/dashboard/page.tsx`
- Modify: `forlove10grams/components/dashboard-books-client.tsx`

**Interfaces:**
- Consumes: `getMessageCountsByBook` (Task 5), `BookMessagesModal` (Task 7).
- Produces: `DashboardBook` gains `messageTotal: number` and `messageUnread: number`; `BookCard` (owner + editor) shows `✉ N` with an unread dot and opens the modal.

- [ ] **Step 1: `app/dashboard/page.tsx` — compute and pass message counts**

Find:

```ts
import { getLikeCountsByBook } from '@/lib/queries/book-like-counts'
```

Replace with:

```ts
import { getLikeCountsByBook } from '@/lib/queries/book-like-counts'
import { getMessageCountsByBook } from '@/lib/queries/book-message-counts'
```

Then find `toBook`:

```ts
function toBook(b: OwnerBookDoc, likeCount = 0): DashboardBook {
  return {
    _id: b._id.toString(),
    title: b.title,
    description: b.description ?? null,
    coverImage: b.coverImage ?? null,
    shareStatus: (b.shareStatus as ShareStatus) ?? 'private',
    tags: b.tags ?? [],
    likeCount,
    editorName: b.editorId?.name ?? null,
  }
}
```

Replace with:

```ts
function toBook(
  b: OwnerBookDoc,
  likeCount = 0,
  messageTotal = 0,
  messageUnread = 0
): DashboardBook {
  return {
    _id: b._id.toString(),
    title: b.title,
    description: b.description ?? null,
    coverImage: b.coverImage ?? null,
    shareStatus: (b.shareStatus as ShareStatus) ?? 'private',
    tags: b.tags ?? [],
    likeCount,
    editorName: b.editorId?.name ?? null,
    messageTotal,
    messageUnread,
  }
}
```

Then find:

```ts
  const editorLikeCounts =
    editorBooksRaw.length > 0
      ? await getLikeCountsByBook(
          editorBooksRaw.map((b) => b._id as mongoose.Types.ObjectId),
        )
      : new Map<string, number>()
```

Insert immediately after it:

```ts
  const ownerMessageCounts = isAdmin
    ? await getMessageCountsByBook(
        ownerBooksRaw.map((b) => b._id as mongoose.Types.ObjectId),
        userId,
        'owner'
      )
    : new Map<string, { total: number; unread: number }>()

  const editorMessageCounts =
    editorBooksRaw.length > 0
      ? await getMessageCountsByBook(
          editorBooksRaw.map((b) => b._id as mongoose.Types.ObjectId),
          userId,
          'editor'
        )
      : new Map<string, { total: number; unread: number }>()
```

Then find:

```ts
  const ownerBooks = ownerBooksRaw.map((b) =>
    toBook(b, ownerLikeCounts.get(b._id.toString()) ?? 0)
  )

  const editorBooks: DashboardBook[] = editorBooksRaw.map((b) =>
    toBook(b, editorLikeCounts.get(b._id.toString()) ?? 0)
  )
```

Replace with:

```ts
  const ownerBooks = ownerBooksRaw.map((b) => {
    const mc = ownerMessageCounts.get(b._id.toString())
    return toBook(b, ownerLikeCounts.get(b._id.toString()) ?? 0, mc?.total ?? 0, mc?.unread ?? 0)
  })

  const editorBooks: DashboardBook[] = editorBooksRaw.map((b) => {
    const mc = editorMessageCounts.get(b._id.toString())
    return toBook(b, editorLikeCounts.get(b._id.toString()) ?? 0, mc?.total ?? 0, mc?.unread ?? 0)
  })
```

- [ ] **Step 2: `dashboard-books-client.tsx` — extend `DashboardBook` and import the modal**

Find:

```ts
export type DashboardBook = {
  _id: string
  title: string
  description: string | null
  coverImage: string | null
  shareStatus: 'private' | 'shared' | 'public'
  tags: string[]
  likeCount: number
  editorName: string | null
}
```

Replace with:

```ts
export type DashboardBook = {
  _id: string
  title: string
  description: string | null
  coverImage: string | null
  shareStatus: 'private' | 'shared' | 'public'
  tags: string[]
  likeCount: number
  editorName: string | null
  messageTotal: number
  messageUnread: number
}
```

Then find (top imports):

```ts
import TagManagerModal from '@/components/tag-manager-modal'
import { createRipple } from '@/lib/ripple'
```

Replace with:

```ts
import TagManagerModal from '@/components/tag-manager-modal'
import BookMessagesModal from '@/components/book-messages-modal'
import { createRipple } from '@/lib/ripple'
```

Note: if the collections plan already added imports here, keep both — append `BookMessagesModal` alongside them rather than replacing.

- [ ] **Step 3: `dashboard-books-client.tsx` — add an envelope icon + the badge + modal to `BookCard`**

Near `HeartIcon`, add an envelope icon. Find:

```tsx
function HeartIcon() {
```

Insert immediately before it:

```tsx
function MailIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

```

Then in `BookCard`, find:

```tsx
  const [showTagModal, setShowTagModal] = useState(false)
  const initial = book.title.charAt(0)
```

Replace with:

```tsx
  const [showTagModal, setShowTagModal] = useState(false)
  const [showMessagesModal, setShowMessagesModal] = useState(false)
  const [messageUnread, setMessageUnread] = useState(book.messageUnread)
  const initial = book.title.charAt(0)
```

Then find the like line in the metadata row:

```tsx
        {book.likeCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HeartIcon /> 心意 {formatGramCount(book.likeCount)}
          </span>
        )}
```

Insert immediately after it:

```tsx
        {book.messageTotal > 0 && (
          <button
            type="button"
            onClick={(e) => { createRipple(e); setShowMessagesModal(true) }}
            className="relative flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="讀者的話"
          >
            <MailIcon /> {book.messageTotal}
            {messageUnread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose" />
            )}
          </button>
        )}
```

Then find the tag modal render at the end of `BookCard`:

```tsx
      {showTagModal && (
        <TagManagerModal
          tags={book.tags}
          onAdd={handleAddTag}
          onRemove={handleRemoveTag}
          onClose={() => setShowTagModal(false)}
        />
      )}
    </div>
  )
}
```

Replace with:

```tsx
      {showTagModal && (
        <TagManagerModal
          tags={book.tags}
          onAdd={handleAddTag}
          onRemove={handleRemoveTag}
          onClose={() => setShowTagModal(false)}
        />
      )}

      {showMessagesModal && (
        <BookMessagesModal
          bookId={book._id}
          role={role}
          onClose={() => setShowMessagesModal(false)}
          onRead={() => setMessageUnread(0)}
        />
      )}
    </div>
  )
}
```

Note: `role` is already a prop of `BookCard` (`'owner' | 'editor'`), matching `BookMessagesModal`'s `role` type exactly. If the collections plan already added a modal block here, place this one alongside it.

- [ ] **Step 4: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors. If TypeScript flags missing `messageTotal`/`messageUnread` anywhere `DashboardBook` is constructed, ensure `app/dashboard/page.tsx` (`toBook`) is the only constructor — search for other object literals typed as `DashboardBook` and add the two fields if any exist.

- [ ] **Step 5: Commit**

```bash
git add forlove10grams/app/dashboard/page.tsx forlove10grams/components/dashboard-books-client.tsx
git commit -m "feat: show reader-message badge on dashboard book cards"
```

---

### Task 10: Manual end-to-end verification

**Files:** none (verification only). Run `cd forlove10grams && npm run dev`. You need: a creator (admin), an editor on a book, and two reader accounts — reader A brought in by the creator's link, reader B by the editor's link.

- [ ] **Step 1: Leave, edit, withdraw**
- As reader A, finish a book → the prompt shows "…想對 {creator} 說一句話嗎？（只有 {creator} 看得到）". Leave a message → it shows in italic quotes with 修改/收回.
- Creator dashboard shows `✉ 1` + unread dot; open the modal → dot clears.
- Reader A edits → creator's unread dot returns, content + date update.
- Reader A withdraws → creator's `✉` badge disappears (N=0).

- [ ] **Step 2: One message per reader**
- Reader A sends twice → only one row exists (upsert, no thread).

- [ ] **Step 3: Managers can't compose**
- Creator opens their own book's reader view → no composer. Editor opens the book → no composer.

- [ ] **Step 4: Delete**
- Creator deletes reader A's message → reader A's end-of-book returns to the un-messaged prompt (can re-leave); no notification.

- [ ] **Step 5: Validation + auth**
- Removed reader hits `PUT /api/books/{id}/message` via devtools → 403.
- 501-char body → 400; whitespace-only → 400.

- [ ] **Step 6: Visibility (the core rule)**
- Reader A (creator-shared) and reader B (editor-shared) both leave messages.
- Creator modal shows A + B; editor modal shows only B.
- Reader A's composer says "只有 {creator} 看得到"; reader B's says "只有 {creator} 和 {editor} 看得到".
- Editor opens its modal (marks read) → creator's unread dot is unaffected, and vice-versa.

- [ ] **Step 7: Attribution stability**
- Editor extends the creator's link (`expiresAt` only) → a new reader entering is still creator-attributed → editor can't see that reader's message.
- Editor revokes + rebuilds the link → a new reader entering is editor-attributed → editor sees it; readers who came earlier via the creator's link stay creator-attributed.
