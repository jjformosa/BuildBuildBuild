# Quick Capture Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dashboard quick-capture entry that creates a new draft memory book with its first page and routes the creator directly into the right editing focus.

**Architecture:** Keep the existing `Book` and `Page` models. Add a small pure helper for mode validation, title formatting, and mode-to-page-type mapping; expose the compound mutation through `POST /api/books/quick`; render a client-side `QuickCaptureBar` below dashboard search; pass `quick` search params into `BookEditorClient` so it can focus text or media. The implementation uses the current Next.js 16 App Router patterns: route handlers use Web `Response`, route params/search params are promises in pages, and client navigation uses `useRouter` from `next/navigation`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Mongoose, MongoDB, Tailwind CSS, Node built-in test/assert for helper smoke checks.

---

## Context And Constraints

- Approved spec: `forlove10grams/docs/superpowers/specs/2026-06-19-quick-capture-entry-design.md`
- Local Next docs checked:
  - `forlove10grams/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
  - `forlove10grams/node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
  - `forlove10grams/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`
  - `forlove10grams/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
- This repo currently has no Vitest/Jest/Playwright setup. Use a small Node smoke script for pure helper behavior, plus `npx tsc --noEmit`, `npm run lint`, and manual browser verification.
- The worktree may contain unrelated dirty files. Stage only the exact files named in each task.

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `forlove10grams/lib/quick-capture.ts` | Pure quick-capture mode, title, and page-type helpers |
| Create | `forlove10grams/scripts/check-quick-capture.ts` | Node smoke checks for pure helper behavior |
| Create | `forlove10grams/app/api/books/quick/route.ts` | Compound mutation: create draft book and first page |
| Create | `forlove10grams/components/quick-capture-bar.tsx` | Dashboard capture row client component |
| Modify | `forlove10grams/app/dashboard/page.tsx` | Pass quick capture row into `DashboardShell` for admin users |
| Modify | `forlove10grams/components/dashboard-books-client.tsx` | Render optional quick capture row below search |
| Modify | `forlove10grams/app/books/[bookId]/edit/page.tsx` | Read and validate `quick` search param, pass to editor client |
| Modify | `forlove10grams/components/book-editor-client.tsx` | Focus/highlight editor or media section once for quick mode |

---

### Task 1: Quick Capture Helper And Smoke Checks

**Files:**
- Create: `forlove10grams/lib/quick-capture.ts`
- Create: `forlove10grams/scripts/check-quick-capture.ts`

- [ ] **Step 1: Write the failing helper smoke check**

Create `forlove10grams/scripts/check-quick-capture.ts`:

```typescript
import assert from 'node:assert/strict'
import {
  formatQuickCaptureTitle,
  isQuickCaptureMode,
  pageTypeForQuickCaptureMode,
} from '../lib/quick-capture.ts'

assert.equal(isQuickCaptureMode('photo'), true)
assert.equal(isQuickCaptureMode('video'), true)
assert.equal(isQuickCaptureMode('text'), true)
assert.equal(isQuickCaptureMode('audio'), false)
assert.equal(isQuickCaptureMode(undefined), false)

assert.equal(pageTypeForQuickCaptureMode('photo'), 'carousel')
assert.equal(pageTypeForQuickCaptureMode('video'), 'video')
assert.equal(pageTypeForQuickCaptureMode('text'), 'carousel')

assert.equal(
  formatQuickCaptureTitle(new Date('2026-06-19T06:30:00.000Z')),
  '快速記錄 2026/06/19 14:30',
)

console.log('quick capture helper checks passed')
```

- [ ] **Step 2: Run the smoke check and verify it fails**

Run:

```bash
cd forlove10grams
node --experimental-strip-types scripts/check-quick-capture.ts
```

Expected: FAIL with a module resolution error like `Cannot find module '../lib/quick-capture.ts'`.

- [ ] **Step 3: Implement the helper**

Create `forlove10grams/lib/quick-capture.ts`:

```typescript
export const QUICK_CAPTURE_MODES = ['photo', 'video', 'text'] as const

export type QuickCaptureMode = (typeof QUICK_CAPTURE_MODES)[number]
export type QuickCapturePageType = 'carousel' | 'video'

export function isQuickCaptureMode(value: unknown): value is QuickCaptureMode {
  return (
    typeof value === 'string' &&
    (QUICK_CAPTURE_MODES as readonly string[]).includes(value)
  )
}

export function pageTypeForQuickCaptureMode(
  mode: QuickCaptureMode,
): QuickCapturePageType {
  return mode === 'video' ? 'video' : 'carousel'
}

export function formatQuickCaptureTitle(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  })

  const parts = new Map(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  )

  const year = parts.get('year')
  const month = parts.get('month')
  const day = parts.get('day')
  const hour = parts.get('hour')
  const minute = parts.get('minute')

  return `快速記錄 ${year}/${month}/${day} ${hour}:${minute}`
}
```

- [ ] **Step 4: Run the smoke check and verify it passes**

Run:

```bash
cd forlove10grams
node --experimental-strip-types scripts/check-quick-capture.ts
```

Expected:

```text
quick capture helper checks passed
```

- [ ] **Step 5: Run TypeScript check**

Run:

```bash
cd forlove10grams
npx tsc --noEmit
```

Expected: PASS with no TypeScript errors from `lib/quick-capture.ts` or `scripts/check-quick-capture.ts`.

- [ ] **Step 6: Commit helper and smoke check**

Run:

```bash
git status --short
git add forlove10grams/lib/quick-capture.ts forlove10grams/scripts/check-quick-capture.ts
git commit -m "feat: add quick capture helpers"
```

Expected: commit includes only the helper, smoke check, and any commit-hook-generated audit report.

---

### Task 2: Quick Capture API Route

**Files:**
- Create: `forlove10grams/app/api/books/quick/route.ts`

- [ ] **Step 1: Create the API route**

Create `forlove10grams/app/api/books/quick/route.ts`:

```typescript
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import {
  formatQuickCaptureTitle,
  isQuickCaptureMode,
  pageTypeForQuickCaptureMode,
} from '@/lib/quick-capture'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const mode = body && typeof body === 'object' ? (body as { mode?: unknown }).mode : null
  if (!isQuickCaptureMode(mode)) {
    return Response.json({ error: 'Invalid mode' }, { status: 400 })
  }

  await dbConnect()

  let createdBookId: string | null = null
  try {
    const book = await Book.create({
      title: formatQuickCaptureTitle(),
      createdBy: session.user.id,
    })
    createdBookId = book._id.toString()

    const page = await Page.create({
      bookId: book._id,
      type: pageTypeForQuickCaptureMode(mode),
      content: '',
      mediaUrls: [],
    })

    book.pageOrder.push(page._id)
    await book.save()

    return Response.json(
      {
        _id: createdBookId,
        pageId: page._id.toString(),
        mode,
        redirectTo: `/books/${createdBookId}/edit?quick=${mode}`,
      },
      { status: 201 },
    )
  } catch {
    if (createdBookId) {
      await Page.deleteMany({ bookId: createdBookId }).catch(() => undefined)
      await Book.deleteOne({ _id: createdBookId }).catch(() => undefined)
    }
    return Response.json({ error: '建立失敗，請再試一次' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
cd forlove10grams
npx tsc --noEmit
```

Expected: PASS with no errors from `app/api/books/quick/route.ts`.

- [ ] **Step 3: Run lint**

Run:

```bash
cd forlove10grams
npm run lint
```

Expected: PASS, or only pre-existing lint failures unrelated to `app/api/books/quick/route.ts`.

- [ ] **Step 4: Commit API route**

Run:

```bash
git status --short
git add forlove10grams/app/api/books/quick/route.ts
git commit -m "feat: add quick capture book API"
```

Expected: commit includes only the API route and any commit-hook-generated audit report.

---

### Task 3: Dashboard Quick Capture Bar

**Files:**
- Create: `forlove10grams/components/quick-capture-bar.tsx`
- Modify: `forlove10grams/app/dashboard/page.tsx`
- Modify: `forlove10grams/components/dashboard-books-client.tsx`

- [ ] **Step 1: Create the client component**

Create `forlove10grams/components/quick-capture-bar.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRipple } from '@/lib/ripple'
import type { QuickCaptureMode } from '@/lib/quick-capture'

type Status = 'idle' | 'loading' | 'error'

const OPTIONS: Array<{ mode: QuickCaptureMode; label: string }> = [
  { mode: 'photo', label: '照片' },
  { mode: 'video', label: '影片' },
  { mode: 'text', label: '文字' },
]

export function QuickCaptureBar() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [loadingMode, setLoadingMode] = useState<QuickCaptureMode | null>(null)
  const [error, setError] = useState('')

  async function handleCapture(mode: QuickCaptureMode) {
    setStatus('loading')
    setLoadingMode(mode)
    setError('')
    try {
      const res = await fetch('/api/books/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const data = await res.json()
      if (!res.ok || typeof data.redirectTo !== 'string') {
        throw new Error(data.error ?? '建立失敗，請再試一次')
      }
      router.push(data.redirectTo)
    } catch (err) {
      setStatus('error')
      setLoadingMode(null)
      setError(err instanceof Error ? err.message : '建立失敗，請再試一次')
    }
  }

  const disabled = status === 'loading'

  return (
    <section className="rounded-xl border border-rose/20 bg-rose/12 px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">現在記一筆</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            先捕捉，標題和整理之後再補。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-none">
          {OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              disabled={disabled}
              onClick={(event) => {
                createRipple(event)
                handleCapture(option.mode)
              }}
              className="relative overflow-hidden rounded-lg border border-rose/20 bg-background px-3 py-2 text-sm font-medium text-rose transition-colors hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMode === option.mode ? '建立中…' : option.label}
            </button>
          ))}
        </div>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Pass the bar from the server dashboard**

In `forlove10grams/app/dashboard/page.tsx`, add this import near the existing component imports:

```tsx
import { QuickCaptureBar } from '@/components/quick-capture-bar'
```

Then replace the `DashboardShell` usage:

```tsx
          <DashboardShell
            isAdmin={isAdmin}
            ownerBooks={ownerBooks}
            ownerHasMore={ownerHasMore}
            editorBooks={editorBooks}
            readerBooks={readerBooks}
            createButton={<CreateBookButton />}
          />
```

with:

```tsx
          <DashboardShell
            isAdmin={isAdmin}
            ownerBooks={ownerBooks}
            ownerHasMore={ownerHasMore}
            editorBooks={editorBooks}
            readerBooks={readerBooks}
            createButton={<CreateBookButton />}
            quickCapture={isAdmin ? <QuickCaptureBar /> : null}
          />
```

- [ ] **Step 3: Render the optional bar below search**

In `forlove10grams/components/dashboard-books-client.tsx`, update the `DashboardShell` props type from:

```tsx
  createButton,
}: {
  isAdmin: boolean
  ownerBooks: DashboardBook[]
  ownerHasMore: boolean
  editorBooks: DashboardBook[]
  readerBooks: ReaderBookItem[]
  createButton: React.ReactNode
}) {
```

to:

```tsx
  createButton,
  quickCapture,
}: {
  isAdmin: boolean
  ownerBooks: DashboardBook[]
  ownerHasMore: boolean
  editorBooks: DashboardBook[]
  readerBooks: ReaderBookItem[]
  createButton: React.ReactNode
  quickCapture?: React.ReactNode
}) {
```

Then insert this immediately after the closing `</form>` for the search block:

```tsx
      {quickCapture && <div className="-mt-4">{quickCapture}</div>}
```

The surrounding `DashboardShell` wrapper already uses `space-y-10`; the `-mt-4` keeps the capture row visually attached to search without creating a large banner.

- [ ] **Step 4: Run TypeScript and lint**

Run:

```bash
cd forlove10grams
npx tsc --noEmit
npm run lint
```

Expected: PASS, or only pre-existing lint failures unrelated to quick capture files.

- [ ] **Step 5: Commit dashboard UI**

Run:

```bash
git status --short
git add forlove10grams/components/quick-capture-bar.tsx forlove10grams/app/dashboard/page.tsx forlove10grams/components/dashboard-books-client.tsx
git commit -m "feat: add dashboard quick capture bar"
```

Expected: commit includes only the quick capture bar, dashboard wiring, and any commit-hook-generated audit report.

---

### Task 4: Editor Quick Mode Focus

**Files:**
- Modify: `forlove10grams/app/books/[bookId]/edit/page.tsx`
- Modify: `forlove10grams/components/book-editor-client.tsx`

- [ ] **Step 1: Read and validate `quick` in the edit page**

In `forlove10grams/app/books/[bookId]/edit/page.tsx`, add this import:

```tsx
import { isQuickCaptureMode, type QuickCaptureMode } from '@/lib/quick-capture'
```

Change the page signature from:

```tsx
export default async function EditBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
```

to:

```tsx
export default async function EditBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>
  searchParams: Promise<{ quick?: string | string[] }>
}) {
```

After:

```tsx
  const { bookId } = await params
  const userId = session.user.id
```

add:

```tsx
  const { quick } = await searchParams
  const quickMode: QuickCaptureMode | null =
    typeof quick === 'string' && isQuickCaptureMode(quick) ? quick : null
```

Then update the editor component call from:

```tsx
      <BookEditorClient bookId={bookId} initialPages={pages} initialTags={book.tags ?? []} />
```

to:

```tsx
      <BookEditorClient
        bookId={bookId}
        initialPages={pages}
        initialTags={book.tags ?? []}
        quickMode={quickMode}
      />
```

- [ ] **Step 2: Add quick mode props and refs to `BookEditorClient`**

In `forlove10grams/components/book-editor-client.tsx`, update the import:

```tsx
import { useState, useRef, useEffect } from 'react'
```

to:

```tsx
import { useState, useRef, useEffect, type RefObject } from 'react'
```

Add this import near the local imports:

```tsx
import type { QuickCaptureMode } from '@/lib/quick-capture'
```

Add this helper function above `export function BookEditorClient`:

```tsx
function scrollToQuickTarget(
  targetRef: RefObject<HTMLDivElement | null>,
  shouldFocusText: boolean,
) {
  const target = targetRef.current
  if (!target) return

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })

  if (shouldFocusText) {
    window.setTimeout(() => {
      const textarea = target.querySelector('textarea')
      if (textarea instanceof HTMLTextAreaElement) textarea.focus()
    }, 150)
  }
}
```

Update the component props from:

```tsx
export function BookEditorClient({
  bookId,
  initialPages,
  initialTags,
}: {
  bookId: string
  initialPages: PageData[]
  initialTags: string[]
}) {
```

to:

```tsx
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

After:

```tsx
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

add:

```tsx
  const quickHandledRef = useRef(false)
  const editorSectionRef = useRef<HTMLDivElement | null>(null)
  const mediaSectionRef = useRef<HTMLDivElement | null>(null)
  const [quickHighlight, setQuickHighlight] = useState<'editor' | 'media' | null>(null)
```

- [ ] **Step 3: Add the one-time quick mode effect**

In `BookEditorClient`, after the existing mobile media-query `useEffect`, add:

```tsx
  useEffect(() => {
    if (!quickMode || !selectedPage || quickHandledRef.current) return
    quickHandledRef.current = true

    const targetKind = quickMode === 'text' ? 'editor' : 'media'
    setQuickHighlight(targetKind)
    scrollToQuickTarget(
      targetKind === 'editor' ? editorSectionRef : mediaSectionRef,
      targetKind === 'editor',
    )

    const timer = window.setTimeout(() => setQuickHighlight(null), 1600)
    return () => window.clearTimeout(timer)
  }, [quickMode, selectedPage])
```

- [ ] **Step 4: Attach refs and highlight classes**

Replace the editor wrapper:

```tsx
              <div data-color-mode="light" suppressHydrationWarning>
                <MDEditor
                  value={selectedPage.content ?? ''}
                  onChange={handleContentChange}
                  height={300}
                  preview={isMobile ? 'edit' : 'live'}
                  commands={getCommands().filter((cmd) => cmd.name !== 'image')}
                  extraCommands={getExtraCommands()}
                />
              </div>
```

with:

```tsx
              <div
                ref={editorSectionRef}
                data-color-mode="light"
                suppressHydrationWarning
                className={`rounded-xl transition-all duration-300 ${
                  quickHighlight === 'editor' ? 'ring-2 ring-primary/30 ring-offset-4 ring-offset-background' : ''
                }`}
              >
                <MDEditor
                  value={selectedPage.content ?? ''}
                  onChange={handleContentChange}
                  height={300}
                  preview={isMobile ? 'edit' : 'live'}
                  commands={getCommands().filter((cmd) => cmd.name !== 'image')}
                  extraCommands={getExtraCommands()}
                />
              </div>
```

Replace the media block:

```tsx
              <div>
                <p className="mb-2 text-xs text-foreground/50">
                  {selectedPage.type === 'carousel' ? '圖片（可多張）' : '影片'}
                </p>
                <MediaUploader
                  bookId={bookId}
                  pageId={selectedPage._id}
                  fileType={selectedPage.type}
                  mediaUrls={selectedPage.mediaUrls}
                  onUrlsChange={handleMediaUrlsChange}
                />
              </div>
```

with:

```tsx
              <div
                ref={mediaSectionRef}
                className={`rounded-xl transition-all duration-300 ${
                  quickHighlight === 'media'
                    ? 'bg-primary/5 ring-2 ring-primary/25 ring-offset-4 ring-offset-background p-3'
                    : ''
                }`}
              >
                <p className="mb-2 text-xs text-foreground/50">
                  {selectedPage.type === 'carousel' ? '圖片（可多張）' : '影片'}
                </p>
                <MediaUploader
                  bookId={bookId}
                  pageId={selectedPage._id}
                  fileType={selectedPage.type}
                  mediaUrls={selectedPage.mediaUrls}
                  onUrlsChange={handleMediaUrlsChange}
                />
              </div>
```

- [ ] **Step 5: Run TypeScript and lint**

Run:

```bash
cd forlove10grams
npx tsc --noEmit
npm run lint
```

Expected: PASS, or only pre-existing lint failures unrelated to edit quick mode files.

- [ ] **Step 6: Commit editor quick focus**

Run:

```bash
git status --short
git add forlove10grams/app/books/\[bookId\]/edit/page.tsx forlove10grams/components/book-editor-client.tsx
git commit -m "feat: focus editor for quick capture mode"
```

Expected: commit includes only the edit page, editor client, and any commit-hook-generated audit report.

---

### Task 5: End-To-End Verification

**Files:**
- Verify only unless a previous task failed and needs a targeted fix.

- [ ] **Step 1: Run all static checks**

Run:

```bash
cd forlove10grams
node --experimental-strip-types scripts/check-quick-capture.ts
npx tsc --noEmit
npm run lint
```

Expected:

```text
quick capture helper checks passed
```

Expected for `tsc` and `lint`: PASS, or only documented pre-existing failures unrelated to files in this plan.

- [ ] **Step 2: Start the dev server**

Run:

```bash
cd forlove10grams
npm run dev
```

Expected: Next dev server starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 3: Browser verification as admin**

Open the dashboard while logged in as an admin creator.

Expected:
- The search box remains at the top of `DashboardShell`.
- A compact quick capture row appears below search.
- The row says `現在記一筆`.
- Buttons `照片`, `影片`, and `文字` are visible.
- On mobile width, the buttons do not overflow or overlap.

- [ ] **Step 4: Verify photo mode**

Click `照片`.

Expected:
- Button text changes to `建立中…`.
- All three quick capture buttons are disabled while pending.
- Browser navigates to `/books/<bookId>/edit?quick=photo`.
- The edit page title starts with `快速記錄 `.
- The first selected page is a `輪播頁`.
- The media section is highlighted or scrolled into view.
- The image upload button is visible.

- [ ] **Step 5: Verify video mode**

Return to dashboard and click `影片`.

Expected:
- Browser navigates to `/books/<bookId>/edit?quick=video`.
- The edit page title starts with `快速記錄 `.
- The first selected page is a `影片頁`.
- The media section is highlighted or scrolled into view.
- The video upload button is visible.

- [ ] **Step 6: Verify text mode**

Return to dashboard and click `文字`.

Expected:
- Browser navigates to `/books/<bookId>/edit?quick=text`.
- The edit page title starts with `快速記錄 `.
- The first selected page is a `輪播頁`.
- The markdown editor is highlighted or scrolled into view.
- The editor textarea receives focus on desktop browsers that allow focus after navigation.

- [ ] **Step 7: Verify non-admin behavior**

Log in as a non-admin editor or reader, or use a session with `session.user.role !== 'admin'`.

Expected:
- Dashboard does not render the quick capture row.
- A direct `POST /api/books/quick` request returns `403`.

Example direct request after authenticating in the browser:

```bash
curl -i -X POST http://localhost:3000/api/books/quick \
  -H 'Content-Type: application/json' \
  --data '{"mode":"photo"}'
```

Expected without a valid admin session cookie:

```text
HTTP/1.1 401 Unauthorized
```

or with a valid non-admin session cookie:

```text
HTTP/1.1 403 Forbidden
```

- [ ] **Step 8: Close verification**

If every verification step passes, no extra commit is needed. If verification exposes a defect in a specific task, return to that task, make the targeted fix in the files named there, rerun that task's checks, and use that task's commit step.

Expected: no unrelated dirty files are staged or committed.

---

## Self-Review Checklist

- Spec coverage:
  - Dashboard capture row: Task 3.
  - `photo / video / text` mode handling: Tasks 1 and 2.
  - New draft book plus first page: Task 2.
  - `quick` editor focus behavior: Task 4.
  - Permission parity with existing `POST /api/books`: Task 2 and Task 5.
  - No new page type/model: all tasks keep `Book`, `Page`, `carousel`, and `video`.
- Completeness scan: this plan contains no incomplete sections.
- Type consistency:
  - `QuickCaptureMode` is `photo | video | text`.
  - `QuickCapturePageType` is `carousel | video`.
  - `quickMode` is `QuickCaptureMode | null` server-side and optional client-side.
