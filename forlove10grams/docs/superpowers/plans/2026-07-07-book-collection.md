# Book Collections (收藏夾) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private, per-user `Collection` concept — an ordered folder of books — for organizing scattered dashboard books, with zero impact on sharing or book permissions.

**Architecture:** One new `Collection` Mongoose model per folder, holding an ordered `bookIds: ObjectId[]` (array order = display order; membership + ordering come free). No change to the `Book` model — books never know which folders contain them. New REST routes under `/api/collections`. On the dashboard, a `CollectionBar` chip row (managed by `DashboardShell`, mutually exclusive with search) toggles a `CollectionView`; each `BookCard` gets a "收藏夾" entry opening a `CollectionPickerModal` (checkbox add/remove, modeled on `TagManagerModal`).

**Tech Stack:** Next.js App Router, React 19, TypeScript, Mongoose, Zod. No test framework — verification is `npx tsc --noEmit`, `npm run lint`, and manual browser checks.

## Global Constraints

- No automated test framework exists in this project — do not add one. Verification is `cd forlove10grams && npx tsc --noEmit`, `npm run lint`, and manual browser checks.
- All paths below are relative to the repo root; source lives under `forlove10grams/`.
- Collections are **always private**: no sharing, no links, no nested collections, no custom cover (use the first accessible book's cover), no auto-categorization. Do not build any of these.
- Deleting a collection **never** deletes books. Removing/adding a book to a collection **never** touches book permissions or `shareStatus`.
- Every route requires login and only operates on collections where `ownerId === session.user.id`. Cross-owner access returns 403/404.
- `addBookId` must verify the caller has a dashboard-level relation to the book (creator OR editor OR a `BookReader` record), else 403 — this prevents probing arbitrary book IDs into a folder.
- Chosen data model: **A — `bookIds: ObjectId[]` embedded ordered array** (not a join collection). Array order is the display order.
- Collection membership is a dangling-tolerant reference: if a book is deleted or the viewer loses access, filter it out at render time — do not cascade-clean.
- Spec: `docs/superpowers/specs/2026-07-07-book-collection-design.md`

---

### Task 1: Create the `Collection` model

**Files:**
- Create: `forlove10grams/lib/models/collection.ts`

**Interfaces:**
- Produces: `ICollection { name: string; ownerId: Types.ObjectId; bookIds: Types.ObjectId[] }`; default export `Collection` model. Unique index on `(ownerId, name)`; multikey index on `bookIds`.

- [ ] **Step 1: Create the model**

```ts
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface ICollection extends Document {
  name: string
  ownerId: Types.ObjectId
  bookIds: Types.ObjectId[] // ordered: array order is display order
}

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookIds: [{ type: Schema.Types.ObjectId, ref: 'Book' }],
  },
  { timestamps: true }
)

CollectionSchema.index({ ownerId: 1, name: 1 }, { unique: true }) // same owner, no dup names
CollectionSchema.index({ bookIds: 1 }) // reverse lookup: which folders contain this book

const Collection: Model<ICollection> =
  mongoose.models.Collection ?? mongoose.model<ICollection>('Collection', CollectionSchema)

export default Collection
```

- [ ] **Step 2: Typecheck**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to `lib/models/collection.ts`.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/lib/models/collection.ts
git commit -m "feat: add Collection model"
```

---

### Task 2: List + create collections route

**Files:**
- Create: `forlove10grams/app/api/collections/route.ts`

**Interfaces:**
- Consumes: `Collection` (Task 1), `Book` (existing).
- Produces:
  - `GET /api/collections` → `Array<{ _id: string; name: string; bookCount: number; coverImage: string | null; containsBook?: boolean }>`. When `?bookId=xxx` is supplied, each item includes `containsBook`.
  - `POST /api/collections` body `{ name }` → 201 `{ _id, name, bookCount: 0, coverImage: null }`; duplicate name → 409.

- [ ] **Step 1: Create the route**

```ts
import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Collection from '@/lib/models/collection'
import Book from '@/lib/models/book'

type BookCoverDoc = { _id: mongoose.Types.ObjectId; coverImage?: string }

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = new mongoose.Types.ObjectId(session.user.id)
  const bookId = new URL(req.url).searchParams.get('bookId')

  await dbConnect()
  const collections = await Collection.find({ ownerId: uid }).sort({ _id: -1 }).lean()

  const firstIds = collections
    .map((c) => c.bookIds[0])
    .filter((id): id is mongoose.Types.ObjectId => Boolean(id))
  const covers =
    firstIds.length > 0
      ? await Book.find({ _id: { $in: firstIds } }, 'coverImage').lean<BookCoverDoc[]>()
      : []
  const coverMap = new Map(covers.map((b) => [b._id.toString(), b.coverImage ?? null]))

  return Response.json(
    collections.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      bookCount: c.bookIds.length,
      coverImage: c.bookIds[0] ? coverMap.get(c.bookIds[0].toString()) ?? null : null,
      ...(bookId
        ? { containsBook: c.bookIds.some((id) => id.toString() === bookId) }
        : {}),
    }))
  )
}

const CreateBody = z.object({ name: z.string().trim().min(1).max(60) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CreateBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  const uid = new mongoose.Types.ObjectId(session.user.id)
  await dbConnect()

  const existing = await Collection.findOne({ ownerId: uid, name: parsed.data.name })
  if (existing) return Response.json({ error: '已有同名收藏夾' }, { status: 409 })

  try {
    const collection = await Collection.create({ ownerId: uid, name: parsed.data.name, bookIds: [] })
    return Response.json(
      { _id: collection._id.toString(), name: collection.name, bookCount: 0, coverImage: null },
      { status: 201 }
    )
  } catch (err) {
    // Unique-index race: another request created the same name between check and insert.
    if ((err as { code?: number }).code === 11000) {
      return Response.json({ error: '已有同名收藏夾' }, { status: 409 })
    }
    throw err
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to the route.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/app/api/collections/route.ts
git commit -m "feat: list and create collections API"
```

---

### Task 3: Collection detail (get/rename/reorder/membership/delete) route

**Files:**
- Create: `forlove10grams/app/api/collections/[collectionId]/route.ts`

**Interfaces:**
- Consumes: `Collection` (Task 1), `Book`, `BookReader` (existing).
- Produces:
  - `GET /api/collections/[collectionId]` → `Array<{ _id, title, coverImage, shareStatus, role: 'owner' | 'editor' | 'reader' }>` in `bookIds` order, access-filtered.
  - `PATCH /api/collections/[collectionId]` body (≥1 of): `{ name?, addBookId?, removeBookId?, bookIds? }` → `{ ok: true }`; dup name → 409; unauthorized book → 403; bad permutation → 400.
  - `DELETE /api/collections/[collectionId]` → `{ ok: true }` (books untouched).

- [ ] **Step 1: Create the route**

```ts
import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Collection from '@/lib/models/collection'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'

type BookDoc = {
  _id: mongoose.Types.ObjectId
  title: string
  coverImage?: string
  shareStatus?: string
  createdBy: mongoose.Types.ObjectId
  editorId?: mongoose.Types.ObjectId
}

/** Does `userId` have a dashboard-level relation to this book? */
async function hasBookRelation(userId: string, book: BookDoc): Promise<boolean> {
  if (book.createdBy.toString() === userId) return true
  if (book.editorId?.toString() === userId) return true
  const reader = await BookReader.exists({ bookId: book._id, userId })
  return reader !== null
}

function roleForBook(userId: string, book: BookDoc, isReader: boolean): 'owner' | 'editor' | 'reader' | null {
  if (book.createdBy.toString() === userId) return 'owner'
  if (book.editorId?.toString() === userId) return 'editor'
  if (book.shareStatus === 'public') return 'reader'
  if (book.shareStatus === 'shared' && isReader) return 'reader'
  return null
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ collectionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const uid = new mongoose.Types.ObjectId(userId)
  const { collectionId } = await ctx.params

  await dbConnect()
  const collection = await Collection.findOne({ _id: collectionId, ownerId: uid })
  if (!collection) return Response.json({ error: 'Not found' }, { status: 404 })

  const books = await Book.find({ _id: { $in: collection.bookIds } }).lean<BookDoc[]>()
  const bookMap = new Map(books.map((b) => [b._id.toString(), b]))

  const readerRecs = await BookReader.find(
    { userId: uid, bookId: { $in: collection.bookIds } },
    'bookId'
  ).lean<{ bookId: mongoose.Types.ObjectId }[]>()
  const readerSet = new Set(readerRecs.map((r) => r.bookId.toString()))

  const items = collection.bookIds
    .map((id) => bookMap.get(id.toString()))
    .filter((b): b is BookDoc => Boolean(b))
    .map((b) => {
      const role = roleForBook(userId, b, readerSet.has(b._id.toString()))
      if (!role) return null
      return {
        _id: b._id.toString(),
        title: b.title,
        coverImage: b.coverImage ?? null,
        shareStatus: b.shareStatus ?? 'private',
        role,
      }
    })
    .filter(Boolean)

  return Response.json(items)
}

const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    addBookId: z.string().optional(),
    removeBookId: z.string().optional(),
    bookIds: z.array(z.string()).optional(),
  })
  .refine((b) => b.name || b.addBookId || b.removeBookId || b.bookIds, {
    message: 'At least one field required',
  })

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ collectionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const uid = new mongoose.Types.ObjectId(userId)
  const { collectionId } = await ctx.params

  const parsed = PatchBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  await dbConnect()
  const collection = await Collection.findOne({ _id: collectionId, ownerId: uid })
  if (!collection) return Response.json({ error: 'Not found' }, { status: 404 })

  const { name, addBookId, removeBookId, bookIds } = parsed.data

  if (name !== undefined) {
    const dup = await Collection.findOne({ ownerId: uid, name, _id: { $ne: collection._id } })
    if (dup) return Response.json({ error: '已有同名收藏夾' }, { status: 409 })
    collection.name = name
  }

  if (addBookId) {
    const book = await Book.findById(addBookId).lean<BookDoc>()
    if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })
    if (!(await hasBookRelation(userId, book))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!collection.bookIds.some((id) => id.toString() === addBookId)) {
      collection.bookIds.push(new mongoose.Types.ObjectId(addBookId))
    }
  }

  if (removeBookId) {
    collection.bookIds = collection.bookIds.filter((id) => id.toString() !== removeBookId)
  }

  if (bookIds) {
    const current = collection.bookIds.map((id) => id.toString()).sort()
    const next = [...bookIds].sort()
    const isPermutation =
      current.length === next.length && current.every((id, i) => id === next[i])
    if (!isPermutation) {
      return Response.json({ error: 'bookIds must be a permutation of the current set' }, { status: 400 })
    }
    collection.bookIds = bookIds.map((id) => new mongoose.Types.ObjectId(id))
  }

  await collection.save()
  return Response.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ collectionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const uid = new mongoose.Types.ObjectId(session.user.id)
  const { collectionId } = await ctx.params

  await dbConnect()
  const res = await Collection.deleteOne({ _id: collectionId, ownerId: uid })
  if (res.deletedCount === 0) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to the route.

- [ ] **Step 3: Commit**

```bash
git add "forlove10grams/app/api/collections/[collectionId]/route.ts"
git commit -m "feat: collection detail, membership, reorder, delete API"
```

---

### Task 4: `CollectionPickerModal` component

**Files:**
- Create: `forlove10grams/components/collection-picker-modal.tsx`

**Interfaces:**
- Consumes: `GET /api/collections?bookId=` (Task 2), `PATCH /api/collections/[id]` add/remove (Task 3), `POST /api/collections` (Task 2).
- Produces: `CollectionPickerModal` — `export default function CollectionPickerModal({ bookId, onClose }: { bookId: string; onClose: () => void }): JSX.Element`.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useEffect, useState } from 'react'

type PickerItem = { _id: string; name: string; containsBook: boolean }

export default function CollectionPickerModal({
  bookId,
  onClose,
}: {
  bookId: string
  onClose: () => void
}) {
  const [items, setItems] = useState<PickerItem[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    fetch(`/api/collections?bookId=${bookId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ _id: string; name: string; containsBook?: boolean }>) =>
        setItems(data.map((c) => ({ _id: c._id, name: c.name, containsBook: !!c.containsBook })))
      )
      .catch(() => setItems([]))
  }, [bookId])

  async function toggle(item: PickerItem) {
    setSaving(true)
    setError('')
    const nextContains = !item.containsBook
    setItems((prev) =>
      prev!.map((c) => (c._id === item._id ? { ...c, containsBook: nextContains } : c))
    )
    try {
      const res = await fetch(`/api/collections/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextContains ? { addBookId: bookId } : { removeBookId: bookId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItems((prev) =>
        prev!.map((c) => (c._id === item._id ? { ...c, containsBook: item.containsBook } : c))
      )
      setError('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function createAndAdd() {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setError('')
    try {
      const createRes = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (createRes.status === 409) {
        setError('已有同名收藏夾')
        return
      }
      if (!createRes.ok) throw new Error()
      const created: { _id: string; name: string } = await createRes.json()
      await fetch(`/api/collections/${created._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addBookId: bookId }),
      })
      setItems((prev) => [{ _id: created._id, name: created.name, containsBook: true }, ...(prev ?? [])])
      setNewName('')
    } catch {
      setError('建立失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">加入收藏夾</h2>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground/60 text-lg leading-none" aria-label="關閉">
            ✕
          </button>
        </div>

        {items === null ? (
          <p className="py-4 text-center text-sm text-foreground/50">載入中…</p>
        ) : (
          <ul className="mb-4 max-h-60 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item._id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/5">
                  <input
                    type="checkbox"
                    checked={item.containsBook}
                    disabled={saving}
                    onChange={() => toggle(item)}
                  />
                  <span className="truncate">{item.name}</span>
                </label>
              </li>
            ))}
            {items.length === 0 && <li className="px-2 py-3 text-center text-xs text-foreground/40">還沒有收藏夾</li>}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
            placeholder="+ 新收藏夾"
            className="flex-1 rounded-md border border-foreground/15 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button onClick={createAndAdd} disabled={saving || !newName.trim()} className="btn-outline-xs">
            建立
          </button>
        </div>
        {saving && <p className="mt-2 text-center text-xs text-foreground/50">儲存中…</p>}
        {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to `components/collection-picker-modal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/components/collection-picker-modal.tsx
git commit -m "feat: add CollectionPickerModal"
```

---

### Task 5: `CollectionBar` and `CollectionView` components

**Files:**
- Create: `forlove10grams/components/collection-bar.tsx`
- Create: `forlove10grams/components/collection-view.tsx`

**Interfaces:**
- Consumes: `GET /api/collections` (Task 2), `GET /api/collections/[id]` + `PATCH` reorder/rename + `DELETE` (Task 3).
- Produces:
  - `CollectionBar` — `export function CollectionBar({ activeId, onSelect }: { activeId: string | null; onSelect: (id: string | null, name: string | null) => void }): JSX.Element`.
  - `CollectionView` — `export function CollectionView({ collectionId, collectionName, onDeleted }: { collectionId: string; collectionName: string; onDeleted: () => void }): JSX.Element`.

- [ ] **Step 1: Create `collection-bar.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'

type Chip = { _id: string; name: string; bookCount: number }

export function CollectionBar({
  activeId,
  onSelect,
}: {
  activeId: string | null
  onSelect: (id: string | null, name: string | null) => void
}) {
  const [chips, setChips] = useState<Chip[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  function load() {
    fetch('/api/collections')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Chip[]) => setChips(data))
      .catch(() => setChips([]))
  }

  useEffect(load, [])

  async function create() {
    const name = newName.trim()
    if (!name) return
    setError('')
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.status === 409) {
      setError('已有同名收藏夾')
      return
    }
    if (res.ok) {
      setNewName('')
      setAdding(false)
      load()
    }
  }

  const base =
    'rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onSelect(null, null)}
        className={`${base} ${activeId === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
      >
        全部
      </button>
      {chips.map((c) => (
        <button
          key={c._id}
          onClick={() => onSelect(c._id, c.name)}
          className={`${base} ${activeId === c._id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          {c.name}
          {c.bookCount > 0 && <span className="ml-1 opacity-70">{c.bookCount}</span>}
        </button>
      ))}
      {adding ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            placeholder="收藏夾名稱"
            className="rounded-full border border-foreground/20 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button onClick={create} className="text-xs text-primary">建立</button>
        </span>
      ) : (
        <button onClick={() => setAdding(true)} className={`${base} border border-dashed border-foreground/25 text-muted-foreground hover:text-foreground`}>
          + 新增
        </button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Create `collection-view.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Item = {
  _id: string
  title: string
  coverImage: string | null
  shareStatus: string
  role: 'owner' | 'editor' | 'reader'
}

export function CollectionView({
  collectionId,
  collectionName,
  onDeleted,
}: {
  collectionId: string
  collectionName: string
  onDeleted: () => void
}) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [name, setName] = useState(collectionName)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(collectionName)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setItems(null)
    setName(collectionName)
    setRenameValue(collectionName)
    fetch(`/api/collections/${collectionId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Item[]) => setItems(data))
      .catch(() => setItems([]))
  }, [collectionId, collectionName])

  async function persistOrder(next: Item[]) {
    setItems(next)
    await fetch(`/api/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookIds: next.map((i) => i._id) }),
    })
  }

  function move(index: number, dir: -1 | 1) {
    if (!items) return
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    persistOrder(next)
  }

  async function rename() {
    const value = renameValue.trim()
    if (!value) return
    setBusy(true)
    const res = await fetch(`/api/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    })
    setBusy(false)
    if (res.ok) {
      setName(value)
      setRenaming(false)
    }
  }

  async function remove() {
    if (!confirm(`刪除收藏夾「${name}」？（不會刪除裡面的書）`)) return
    setBusy(true)
    const res = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) onDeleted()
  }

  function hrefFor(item: Item): string {
    return item.role === 'reader' ? `/read/${item._id}` : `/books/${item._id}/edit`
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {renaming ? (
          <span className="flex items-center gap-2">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && rename()}
              className="rounded-md border border-foreground/20 px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button onClick={rename} disabled={busy} className="text-xs text-primary">儲存</button>
            <button onClick={() => setRenaming(false)} className="text-xs text-muted-foreground">取消</button>
          </span>
        ) : (
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">{name}</h2>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setRenaming(true)} className="btn-outline-xs">重新命名</button>
          <button onClick={remove} disabled={busy} className="btn-danger-xs">刪除收藏夾</button>
        </div>
      </div>

      {items === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">載入中…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">這個收藏夾還沒有書，或你已無權存取夾內的書。</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li key={item._id} className="flex items-center gap-2">
              <div className="flex flex-none flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-muted-foreground disabled:opacity-30" aria-label="上移">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-xs text-muted-foreground disabled:opacity-30" aria-label="下移">▼</button>
              </div>
              <Link
                href={hrefFor(item)}
                className="group flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-all hover:border-primary/30"
              >
                <div className="relative h-12 w-12 flex-none overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-rose/10">
                  {item.coverImage ? (
                    <Image src={item.coverImage} alt="" fill className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary/35">
                      {item.title.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to either component. (`btn-outline-xs` / `btn-danger-xs` are existing utility classes used elsewhere in the dashboard.)

- [ ] **Step 4: Commit**

```bash
git add forlove10grams/components/collection-bar.tsx forlove10grams/components/collection-view.tsx
git commit -m "feat: add CollectionBar and CollectionView"
```

---

### Task 6: Wire collections into the dashboard

**Files:**
- Modify: `forlove10grams/components/dashboard-books-client.tsx`

**Interfaces:**
- Consumes: `CollectionBar`, `CollectionView` (Task 5), `CollectionPickerModal` (Task 4).
- Produces: `DashboardShell` renders the collection bar below search and swaps to the collection view when a chip is active; `BookCard` gains a "收藏夾" entry.

- [ ] **Step 1: Import the new components**

At the top of `dashboard-books-client.tsx`, find:

```ts
import TagManagerModal from '@/components/tag-manager-modal'
import { createRipple } from '@/lib/ripple'
```

Replace with:

```ts
import TagManagerModal from '@/components/tag-manager-modal'
import CollectionPickerModal from '@/components/collection-picker-modal'
import { CollectionBar } from '@/components/collection-bar'
import { CollectionView } from '@/components/collection-view'
import { createRipple } from '@/lib/ripple'
```

- [ ] **Step 2: Add the "收藏夾" entry to `BookCard`**

In `BookCard`, find:

```tsx
  const [showTagModal, setShowTagModal] = useState(false)
  const initial = book.title.charAt(0)
```

Replace with:

```tsx
  const [showTagModal, setShowTagModal] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const initial = book.title.charAt(0)
```

Then find the tag entry button in the metadata row:

```tsx
        <button
          type="button"
          onClick={(e) => { createRipple(e); setShowTagModal(true) }}
          className="relative overflow-hidden rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors px-1.5 py-0.5 cursor-pointer"
          title="管理標籤"
        >
          + 標籤
        </button>
```

Insert immediately after it:

```tsx
        <button
          type="button"
          onClick={(e) => { createRipple(e); setShowCollectionModal(true) }}
          className="relative overflow-hidden rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors px-1.5 py-0.5 cursor-pointer"
          title="加入收藏夾"
        >
          + 收藏夾
        </button>
```

Then find the tag modal at the end of `BookCard`:

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

      {showCollectionModal && (
        <CollectionPickerModal bookId={book._id} onClose={() => setShowCollectionModal(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add collection state + bar + view to `DashboardShell`**

In `DashboardShell`, find:

```ts
  const [query, setQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const hasSharedContent = editorBooks.length > 0 || readerBooks.length > 0
```

Replace with:

```ts
  const [query, setQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [activeCollectionName, setActiveCollectionName] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Collection view is mutually exclusive with search (same convention as sort/filter).
  function selectCollection(id: string | null, name: string | null) {
    setActiveCollectionId(id)
    setActiveCollectionName(name)
    if (id) {
      setQuery('')
      setDebouncedSearch('')
    }
  }

  const hasSharedContent = editorBooks.length > 0 || readerBooks.length > 0
```

- [ ] **Step 4: Render the bar and swap the body when a collection is active**

Find:

```tsx
      {quickCapture && <div className="-mt-4">{quickCapture}</div>}

      {/* Admin: owner books */}
      {isAdmin && (
```

Replace with:

```tsx
      {quickCapture && <div className="-mt-4">{quickCapture}</div>}

      <CollectionBar activeId={activeCollectionId} onSelect={selectCollection} />

      {activeCollectionId && activeCollectionName ? (
        <CollectionView
          collectionId={activeCollectionId}
          collectionName={activeCollectionName}
          onDeleted={() => selectCollection(null, null)}
        />
      ) : (
        <>
          {/* Admin: owner books */}
          {isAdmin && (
```

Then find the end of the shell's sections — the closing of the `hasSharedContent` block:

```tsx
          {readerBooks.length > 0 && (
            <>
              {(isAdmin || editorBooks.length > 0) && (
                <SectionHeading className="mt-8 mb-5">閱讀過的記憶書</SectionHeading>
              )}
              <ReaderList books={readerBooks} />
            </>
          )}
        </section>
      )}
    </div>
  )
}
```

Replace with:

```tsx
          {readerBooks.length > 0 && (
            <>
              {(isAdmin || editorBooks.length > 0) && (
                <SectionHeading className="mt-8 mb-5">閱讀過的記憶書</SectionHeading>
              )}
              <ReaderList books={readerBooks} />
            </>
          )}
        </section>
      )}
        </>
      )}
    </div>
  )
}
```

(The added `</>` and closing `)}` terminate the `activeCollectionId ? … : ( <> … </> )` conditional opened in Step 4. After editing, verify the JSX nesting with the typecheck below — indentation is illustrative; correctness is enforced by `tsc`.)

- [ ] **Step 5: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to `dashboard-books-client.tsx`. If JSX fails to parse, re-check that the conditional opened in Step 4 is closed exactly once in Step 4's block wrapper.

- [ ] **Step 6: Commit**

```bash
git add forlove10grams/components/dashboard-books-client.tsx
git commit -m "feat: wire collections bar, view, and picker into dashboard"
```

---

### Task 7: Manual end-to-end verification

**Files:** none (verification only). Run `cd forlove10grams && npm run dev` and log in as an admin with several books.

- [ ] **Step 1: Create / dup / rename / delete**
- Collection bar → 新增 → name it → chip appears. Create another with the same name → 409 "已有同名收藏夾".
- Enter the collection → 重新命名 works; 刪除收藏夾 asks to confirm, then the books remain on the dashboard.

- [ ] **Step 2: Membership**
- On a `BookCard`, open + 收藏夾 → check two collections → the book appears in both. Uncheck one → it leaves that folder, stays in the other.
- The picker's initial checkbox state matches actual membership (via `?bookId=`).

- [ ] **Step 3: Reader-role books**
- As a non-owner, add a book shared to you into a collection (picker allows it). Confirm it shows with a reader link into `/read/...`.
- Try adding a random book ID you have no relation to (via devtools `fetch` PATCH `addBookId`) → 403.
- Operate on another user's `collectionId` → 403/404.

- [ ] **Step 4: Ordering + access filtering**
- Reorder with ▲/▼; reload → order persists.
- Have a creator remove your reader access to a book in your collection → that book disappears from the collection view; the collection itself remains.

- [ ] **Step 5: Mutual exclusivity**
- Enter a collection → the search box clears and the owner/editor/reader sections are hidden.
- Click 全部 (or the active chip again) → back to the normal three-section dashboard.
