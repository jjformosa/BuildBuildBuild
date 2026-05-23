# Editor Management + 把書交給她 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editor management to the dashboard (view + remove current editor) and a handover-letter ceremony (required when inviting, displayed to editor at the end of the read page).

**Architecture:** `book.editorLetter` stores the letter alongside `book.editorId`. The dashboard `GET /api/books` populates editor name; `BookCard` manages editor-row state locally. A new `DELETE /api/books/[bookId]/editor` clears both fields. `HandoverLetter` is a client component rendered at the end of `ReadPageClient` after all pages, gated by `isEditor` prop computed server-side.

**Tech Stack:** Next.js App Router (Server + Client Components), Mongoose, Tailwind CSS

---

## File Map

**Create:**
- `forlove10grams/app/api/books/[bookId]/editor/route.ts` — DELETE endpoint to remove editor

- `forlove10grams/components/handover-letter.tsx` — client component rendered after all pages in read view

**Modify:**
- `forlove10grams/lib/models/book.ts` — add `editorLetter: String` field
- `forlove10grams/app/api/books/[bookId]/invite/route.ts` — add `letter` to body; save to `book.editorLetter`
- `forlove10grams/app/api/books/route.ts` — populate `editorId.name`; return `editorName`
- `forlove10grams/components/dashboard-books-client.tsx` — `DashboardBook` type + editor row in `BookCard`
- `forlove10grams/app/dashboard/page.tsx` — `toBook` + populate in SSR query
- `forlove10grams/components/invite-editor-button.tsx` — add required `letter` textarea
- `forlove10grams/components/read-page-client.tsx` — accept `isEditor`/`editorLetter`/`creatorName` props; render `HandoverLetter`
- `forlove10grams/app/read/[bookId]/page.tsx` — compute `isEditor`, fetch `creatorName`, pass to `ReadPageClient`
- `forlove10grams/app/books/[bookId]/edit/page.tsx` — add "查看書本" link in header

---

## Task 1: Add `editorLetter` to Book model

**Files:**
- Modify: `forlove10grams/lib/models/book.ts`

- [ ] **Add `editorLetter` to the `IBook` interface** — insert after `editorId`:

```typescript
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

- [ ] **Add `editorLetter` to `BookSchema`** — insert after the `editorId` field:

```typescript
editorId: { type: Schema.Types.ObjectId, ref: 'User' },
editorLetter: { type: String },
```

- [ ] **Commit:**

```bash
git add forlove10grams/lib/models/book.ts
git commit -m "feat: add editorLetter field to Book model"
```

---

## Task 2: Add `DELETE /api/books/[bookId]/editor`

**Files:**
- Create: `forlove10grams/app/api/books/[bookId]/editor/route.ts`

- [ ] **Create the file with the following content:**

```typescript
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/editor'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { bookId } = await ctx.params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (book.createdBy.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  book.editorId = undefined
  book.editorLetter = undefined
  await book.save()

  return new Response(null, { status: 204 })
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/app/api/books/[bookId]/editor/route.ts
git commit -m "feat: add DELETE /api/books/[bookId]/editor to remove editor"
```

---

## Task 3: Update `POST /api/books/[bookId]/invite` — add required `letter`

**Files:**
- Modify: `forlove10grams/app/api/books/[bookId]/invite/route.ts`

- [ ] **Replace the entire file with the following:**

```typescript
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import User from '@/lib/models/user'

const InviteBody = z.object({
  email: z.email(),
  letter: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/invite'>
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { bookId } = await ctx.params

  const body = await req.json()
  const parsed = InviteBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }
  const { email, letter } = parsed.data

  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Book not found' }, { status: 404 })
  }
  if (book.createdBy.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invitee = await User.findOne({ email, role: 'customer' })
  if (!invitee) {
    return Response.json(
      { error: 'User not found or not a customer' },
      { status: 404 }
    )
  }

  book.editorId = invitee._id
  book.editorLetter = letter
  await book.save()

  return Response.json({ ok: true, editorId: invitee._id })
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/app/api/books/[bookId]/invite/route.ts
git commit -m "feat: require letter in invite body, save to book.editorLetter"
```

---

## Task 4: Update `GET /api/books` — return `editorName`

**Files:**
- Modify: `forlove10grams/app/api/books/route.ts`

- [ ] **Add a local type** for the populated query result — insert after the imports at the top of the file:

```typescript
type BookQueryResult = {
  _id: mongoose.Types.ObjectId
  title: string
  description?: string
  coverImage?: string
  shareStatus?: string
  tags?: string[]
  editorId: { name: string } | null
}
```

- [ ] **Update the `Book.find` query** — replace the existing `.select().lean()` chain:

```typescript
// before
const books = await Book.find(query)
  .sort({ _id: -1 })
  .limit(limit)
  .select('_id title description coverImage shareStatus tags')
  .lean()

// after
const books = await Book.find(query)
  .sort({ _id: -1 })
  .limit(limit)
  .select('_id title description coverImage shareStatus tags editorId')
  .populate('editorId', 'name')
  .lean<BookQueryResult[]>()
```

- [ ] **Add `editorName` to the response map** — inside the `books.map((b) => ({...}))` block, add after `likeCount`:

```typescript
editorName: b.editorId?.name ?? null,
```

- [ ] **Commit:**

```bash
git add forlove10grams/app/api/books/route.ts
git commit -m "feat: populate editor name in GET /api/books, return editorName"
```

---

## Task 5: Update dashboard `DashboardBook` type and `toBook`

**Files:**
- Modify: `forlove10grams/components/dashboard-books-client.tsx`
- Modify: `forlove10grams/app/dashboard/page.tsx`

- [ ] **Add `editorName` to `DashboardBook` type** in `dashboard-books-client.tsx`:

```typescript
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

- [ ] **Add a local type and update `toBook`** in `dashboard/page.tsx` — replace the existing `toBook` function and add the type above it:

```typescript
type OwnerBookDoc = {
  _id: mongoose.Types.ObjectId
  title: string
  description?: string
  coverImage?: string
  shareStatus?: string
  tags?: string[]
  editorId: { name: string } | null
}

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

- [ ] **Update the `ownerBooksRaw` query** in `DashboardPage` to populate editor name:

```typescript
// before
Book.find({ createdBy: uid }).sort({ _id: -1 }).limit(INITIAL_LIMIT).lean()

// after
Book.find({ createdBy: uid })
  .sort({ _id: -1 })
  .limit(INITIAL_LIMIT)
  .populate('editorId', 'name')
  .lean<OwnerBookDoc[]>()
```

- [ ] **Commit:**

```bash
git add forlove10grams/components/dashboard-books-client.tsx forlove10grams/app/dashboard/page.tsx
git commit -m "feat: add editorName to DashboardBook type and dashboard SSR query"
```

---

## Task 6: Add editor row to `BookCard`

**Files:**
- Modify: `forlove10grams/components/dashboard-books-client.tsx`

- [ ] **Add local state and remove handler** to `BookCard` — insert after the existing `handleRemoveTag` function:

```typescript
const [editorName, setEditorName] = useState(book.editorName)
const [removeLoading, setRemoveLoading] = useState(false)
const [removeError, setRemoveError] = useState('')

async function handleRemoveEditor() {
  setRemoveLoading(true)
  setRemoveError('')
  try {
    const res = await fetch(`/api/books/${book._id}/editor`, { method: 'DELETE' })
    if (!res.ok) throw new Error('移除失敗')
    setEditorName(null)
  } catch {
    setRemoveError('移除失敗')
  } finally {
    setRemoveLoading(false)
  }
}
```

- [ ] **Add the editor row to the `BookCard` JSX** — insert between the flex row `</div>` (closing the `flex items-center gap-3` div) and the `{showTagModal && ...}` line:

```tsx
{editorName && (
  <div className="border-t border-[#2C1810]/8 mt-2 pt-2 flex items-center justify-between">
    <span className="text-xs text-[#2C1810]/55">✎ {editorName}（編輯中）</span>
    <div className="flex items-center gap-2">
      {removeError && <span className="text-xs text-red-500">{removeError}</span>}
      <button
        onClick={handleRemoveEditor}
        disabled={removeLoading}
        className="text-xs text-red-600 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {removeLoading ? '移除中…' : '移除'}
      </button>
    </div>
  </div>
)}
```

- [ ] **Commit:**

```bash
git add forlove10grams/components/dashboard-books-client.tsx
git commit -m "feat: add editor row with remove button to dashboard BookCard"
```

---

## Task 7: Add `letter` textarea to `InviteEditorButton`

**Files:**
- Modify: `forlove10grams/components/invite-editor-button.tsx`

- [ ] **Replace the entire file with the following:**

```typescript
'use client'

import { useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function InviteEditorButton({ bookId }: { bookId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [letter, setLetter] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/books/${bookId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, letter }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.error)
            ? data.error.map((i: { message: string }) => i.message).join(', ')
            : (data.error ?? '邀請失敗')
        )
      }
      setStatus('success')
      setEmail('')
      setLetter('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : '邀請失敗')
    }
  }

  function handleClose() {
    setOpen(false)
    setStatus('idle')
    setEmail('')
    setLetter('')
    setErrorMsg('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-[#2C1810]/30 px-3 py-1.5 text-sm font-medium text-[#2C1810] hover:bg-[#2C1810]/8 transition-colors"
      >
        邀請編輯者
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-[#FAF7F2] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-[#2C1810]">邀請編輯者</h2>

            {status === 'success' ? (
              <div className="space-y-4">
                <p className="text-sm text-green-700">邀請成功！對方現在可以編輯此記憶書。</p>
                <button
                  onClick={handleClose}
                  className="w-full rounded-md bg-[#2C1810] py-2 text-sm font-medium text-[#FAF7F2]"
                >
                  關閉
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="invite-email" className="mb-1 block text-sm text-[#2C1810]/70">
                    Customer 帳號 Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-md border border-[#2C1810]/20 bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#2C1810]/40 focus:outline-none focus:ring-2 focus:ring-[#2C1810]/30"
                  />
                </div>

                <div>
                  <label htmlFor="invite-letter" className="mb-1 block text-sm text-[#2C1810]/70">
                    交接信（必填）
                  </label>
                  <textarea
                    id="invite-letter"
                    required
                    value={letter}
                    onChange={(e) => setLetter(e.target.value)}
                    placeholder="你想對 ta 說的話…"
                    rows={4}
                    className="w-full rounded-md border border-[#2C1810]/20 bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#2C1810]/40 focus:outline-none focus:ring-2 focus:ring-[#2C1810]/30 resize-none"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-600">{errorMsg}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-md border border-[#2C1810]/20 py-2 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="flex-1 rounded-md bg-[#2C1810] py-2 text-sm font-medium text-[#FAF7F2] disabled:opacity-50 transition-opacity"
                  >
                    {status === 'loading' ? '邀請中…' : '送出邀請'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/components/invite-editor-button.tsx
git commit -m "feat: add required letter textarea to InviteEditorButton"
```

---

## Task 8: Create `HandoverLetter` component

**Files:**
- Create: `forlove10grams/components/handover-letter.tsx`

- [ ] **Create the file with the following content:**

```typescript
'use client'

import Link from 'next/link'

export function HandoverLetter({
  isEditor,
  editorLetter,
  creatorName,
  bookId,
}: {
  isEditor: boolean
  editorLetter: string
  creatorName: string
  bookId: string
}) {
  if (!isEditor || !editorLetter) return null

  return (
    <div className="mt-16 mb-12 mx-auto max-w-md border-t border-[#2C1810]/10 pt-12 text-center space-y-6">
      <p className="text-xs text-[#2C1810]/40 tracking-wider uppercase">
        {creatorName} 想對你說
      </p>
      <p className="text-sm text-[#2C1810]/75 leading-relaxed italic">
        「{editorLetter}」
      </p>
      <div className="pt-2">
        <Link
          href={`/books/${bookId}/edit`}
          className="rounded-md border border-[#2C1810]/30 px-4 py-2 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
        >
          進入編輯 →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Commit:**

```bash
git add forlove10grams/components/handover-letter.tsx
git commit -m "feat: add HandoverLetter component for read page"
```

---

## Task 9: Wire `HandoverLetter` into the read page

**Files:**
- Modify: `forlove10grams/components/read-page-client.tsx`
- Modify: `forlove10grams/app/read/[bookId]/page.tsx`

- [ ] **Add three optional props to `ReadPageClient`** in `read-page-client.tsx` — add the import and update `Props`:

Add import at the top:
```typescript
import { HandoverLetter } from '@/components/handover-letter'
```

Update the `Props` type:
```typescript
type Props = {
  bookId: string
  bookTitle: string
  initialPages: ReadPageData[]
  totalCount: number
  viewerNickname: string | null
  viewerMyNickname: string | null
  hasLiked: boolean
  isEditor?: boolean
  editorLetter?: string | null
  creatorName?: string | null
}
```

Update the function signature to destructure the new props:
```typescript
export function ReadPageClient({
  bookId,
  bookTitle,
  initialPages,
  totalCount,
  viewerNickname,
  viewerMyNickname,
  hasLiked,
  isEditor,
  editorLetter,
  creatorName,
}: Props) {
```

- [ ] **Render `HandoverLetter` after the `LikeButton` section** — find the block at the end of the page list (around line 175) and add the `HandoverLetter` directly below it:

```tsx
{!hasMore && pages.length > 0 && (
  <div className="mt-16 mb-12 flex justify-center">
    <LikeButton bookId={bookId} initialHasLiked={hasLiked} />
  </div>
)}

{!hasMore && isEditor && editorLetter && creatorName && (
  <HandoverLetter
    isEditor={isEditor}
    editorLetter={editorLetter}
    creatorName={creatorName}
    bookId={bookId}
  />
)}
```

- [ ] **Update `read/[bookId]/page.tsx`** — add `isEditor` check and `creatorName` fetch after the existing `viewer` query, then pass new props to `ReadPageClient`:

After the existing `const viewer = await User.findById(userId).lean()` block, add:

```typescript
const isEditor = book.editorId?.toString() === userId

let creatorName: string | null = null
if (isEditor && book.editorLetter) {
  const creator = await User.findById(book.createdBy, 'name').lean()
  creatorName = creator?.name ?? null
}
```

Update the `ReadPageClient` JSX to pass the new props:

```tsx
return (
  <ReadPageClient
    bookId={bookId}
    bookTitle={book.title}
    initialPages={initialPages}
    totalCount={totalCount}
    viewerNickname={viewerNickname}
    viewerMyNickname={viewerMyNickname}
    hasLiked={hasLiked}
    isEditor={isEditor}
    editorLetter={book.editorLetter ?? null}
    creatorName={creatorName}
  />
)
```

- [ ] **Commit:**

```bash
git add forlove10grams/components/read-page-client.tsx forlove10grams/app/read/[bookId]/page.tsx
git commit -m "feat: render HandoverLetter in read page for editors"
```

---

## Task 10: Add "查看書本" link to edit page header

**Files:**
- Modify: `forlove10grams/app/books/[bookId]/edit/page.tsx`

- [ ] **Add a `<Link>` in the header actions div** — insert before `CoverImageButton` (i.e., as the leftmost item in the right-side actions):

```tsx
<div className="flex flex-none items-center gap-1 sm:gap-2">
  <Link
    href={`/read/${bookId}`}
    className="rounded-md border border-[#2C1810]/20 px-3 py-1.5 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
  >
    查看書本
  </Link>
  {isOwner && (
    <CoverImageButton bookId={bookId} initialCoverImage={book.coverImage ?? null} availableImages={carouselImages} />
  )}
  {isOwner && <ShareButton bookId={bookId} />}
  <InviteEditorButton bookId={bookId} />
</div>
```

- [ ] **Commit:**

```bash
git add forlove10grams/app/books/[bookId]/edit/page.tsx
git commit -m "feat: add 查看書本 link to edit page header"
```

---

## Task 11: Manual verification

- [ ] Start dev server: `cd forlove10grams && npm run dev`

- [ ] **Invite flow** — open an edit page as admin/owner. Click 邀請編輯者. Verify: form now has email + 交接信 fields. Submit without letter → form should prevent submission (required). Submit with both → success message appears.

- [ ] **Dashboard editor row** — after inviting, return to dashboard. Verify the book card shows a bottom row: `✎ {editor name}（編輯中）` + 移除 button. Cards without an editor show no row.

- [ ] **Remove editor** — click 移除 on the card. Verify: row disappears immediately. Reload page to confirm `editorId` was cleared server-side.

- [ ] **HandoverLetter on read page** — log in as the editor user. Navigate to `/read/[bookId]`. Scroll to the end of all pages. Verify: after the like button, the handover letter section appears with creator name and letter text. Clicking 進入編輯 → navigates to `/books/[bookId]/edit`.

- [ ] **HandoverLetter not shown to non-editors** — log in as a reader. Navigate to the same read page. Verify: no handover letter section appears after the like button.

- [ ] **查看書本 in edit page** — open the edit page. Verify: "查看書本" button appears in the header (leftmost in the right-side actions). Clicking it navigates to `/read/[bookId]`.
