# Page happenedAt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let creators/editors record an optional "this happened on" date per page, editable from the edit page's top bar, laying the data foundation for future date-based features.

**Architecture:** Add an optional `happenedAt: Date` field to the `Page` Mongoose model. Thread it through the existing PATCH page endpoint (partial update, same pattern as `content`/`mediaUrls`), the edit page's server-side initial data load, and `BookEditorClient`'s `PageData` type + top bar UI. Saves are immediate (fire-and-forget), matching how `MediaUploader` already saves `mediaUrls` — no debounce needed since a date-input change is a single discrete event, not keystrokes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Mongoose, Zod, no test framework (verify via `npx tsc --noEmit`, `npm run lint`, and manual browser checks).

## Global Constraints

- No automated test framework exists in this project — do not add one. Verification is `npx tsc --noEmit`, `npm run lint`, and manual browser checks.
- Store full date precision (`YYYY-MM-DD`), not just year-month.
- Do not implement dashboard/`BookCard` date-range display, "N years ago today," reader-facing display, or date-based sorting — explicitly deferred in the design spec.
- Do not add debounce or a dedicated error/retry UI for `happenedAt` saves — fire-and-forget, matching the existing `mediaUrls` save pattern.
- Spec: `docs/superpowers/specs/2026-07-03-page-happened-at-design.md`

---

### Task 1: Add `happenedAt` to the Page model

**Files:**
- Modify: `forlove10grams/lib/models/page.ts`

**Interfaces:**
- Produces: `IPage.happenedAt?: Date` — later tasks read/write this field by name.

- [x] **Step 1: Add the field to the interface and schema**

In `forlove10grams/lib/models/page.ts`, find:

```ts
export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
}
```

Replace with:

```ts
export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
  happenedAt?: Date
}
```

Then find:

```ts
    transcodingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'error'],
    },
  },
  { timestamps: true }
)
```

Replace with:

```ts
    transcodingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'error'],
    },
    happenedAt: { type: Date },
  },
  { timestamps: true }
)
```

- [x] **Step 2: Typecheck**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to `lib/models/page.ts`.

- [x] **Step 3: Commit**

```bash
git add forlove10grams/lib/models/page.ts
git commit -m "feat: add happenedAt field to Page model"
```

---

### Task 2: Support `happenedAt` in the page PATCH endpoint

**Files:**
- Modify: `forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts`

**Interfaces:**
- Consumes: `IPage.happenedAt` from Task 1.
- Produces: `PATCH /api/books/[bookId]/pages/[pageId]` now accepts an optional `happenedAt: string | null` in the request body.

- [x] **Step 1: Extend `PatchPageBody`**

Find:

```ts
const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
})
```

Replace with:

```ts
const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  happenedAt: z.string().nullable().optional(),
})
```

No other change needed in this file — `Object.assign(page, parsed.data)` (already present in the `PATCH` handler) assigns `happenedAt` the same way it assigns `content`/`mediaUrls` today; Mongoose casts the `"YYYY-MM-DD"` string to `Date` on assignment for a `Date`-typed schema path, and assigning `null` clears it.

- [x] **Step 2: Typecheck**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to this route file.

- [x] **Step 3: Lint**

Run: `cd forlove10grams && npm run lint`
Expected: no errors related to this route file.

- [ ] **Step 4: Manual API check**

With the dev server running (`npm run dev`) and logged in as the book's owner in the browser, open browser devtools console on the edit page for one of your books and run:

```js
fetch(`/api/books/<bookId>/pages/<pageId>`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ happenedAt: '2024-11-05' }),
}).then(r => r.json()).then(console.log)
```

Expected: response JSON includes `"happenedAt":"2024-11-05T00:00:00.000Z"`.

Then clear it:

```js
fetch(`/api/books/<bookId>/pages/<pageId>`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ happenedAt: null }),
}).then(r => r.json()).then(console.log)
```

Expected: response JSON has `"happenedAt":null` (or the key absent).

- [x] **Step 5: Commit**

```bash
git add "forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts"
git commit -m "feat: accept happenedAt in page PATCH endpoint"
```

---

### Task 3: Load `happenedAt` on the edit page

**Files:**
- Modify: `forlove10grams/app/books/[bookId]/edit/page.tsx`

**Interfaces:**
- Consumes: `IPage.happenedAt` from Task 1.
- Produces: `PageData.happenedAt: string | null` populated for `BookEditorClient` (the `PageData` type itself is updated in Task 4; this task supplies the value).

- [x] **Step 1: Add `happenedAt` when mapping `rawPages` to `PageData[]`**

Find:

```ts
  const pages: PageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content,
    mediaUrls: p.type === 'carousel' ? p.mediaUrls.map(signImageUrl) : p.mediaUrls,
  }))
```

Replace with:

```ts
  const pages: PageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content,
    mediaUrls: p.type === 'carousel' ? p.mediaUrls.map(signImageUrl) : p.mediaUrls,
    happenedAt: p.happenedAt ? p.happenedAt.toISOString().slice(0, 10) : null,
  }))
```

This will not typecheck until Task 4 adds `happenedAt` to the `PageData` type — that's expected, do Task 4 immediately after this step before running the typecheck below.

- [x] **Step 2: Commit together with Task 4**

Do not commit this task in isolation — `npx tsc --noEmit` will fail until `PageData` (Task 4) has the matching field. Proceed directly to Task 4, then typecheck and commit both files together.

---

### Task 4: Add `happenedAt` to `BookEditorClient`'s UI

**Files:**
- Modify: `forlove10grams/components/book-editor-client.tsx`

**Interfaces:**
- Consumes: `PageData.happenedAt` populated by Task 3.
- Produces: `PageData.happenedAt?: string | null` (type), `handleHappenedAtChange(value: string): void` (local function, not exported).

- [x] **Step 1: Add `happenedAt` to the `PageData` type**

Find:

```ts
export type PageData = {
  _id: string
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
}
```

Replace with:

```ts
export type PageData = {
  _id: string
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  happenedAt?: string | null
}
```

- [x] **Step 2: Normalize `happenedAt` when a new page is created**

Find (inside `handleAddPage`):

```ts
        const newPage: PageData = {
          _id: raw._id,
          type: raw.type,
          content: raw.content,
          mediaUrls: raw.mediaUrls ?? [],
        }
```

Replace with:

```ts
        const newPage: PageData = {
          _id: raw._id,
          type: raw.type,
          content: raw.content,
          mediaUrls: raw.mediaUrls ?? [],
          happenedAt: raw.happenedAt ?? null,
        }
```

- [x] **Step 3: Add `handleHappenedAtChange`**

Find `handleDeletePage` (it comes right after `handleContentChange`):

```ts
  async function handleDeletePage(pageId: string) {
```

Insert the new function immediately before it:

```ts
  function handleHappenedAtChange(value: string) {
    const currentId = selectedId
    if (!currentId) return
    const happenedAt = value || null
    setPages((prev) => prev.map((p) => (p._id === currentId ? { ...p, happenedAt } : p)))
    fetch(`/api/books/${bookId}/pages/${currentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ happenedAt }),
    })
  }

  async function handleDeletePage(pageId: string) {
```

- [x] **Step 4: Add the date input to the top bar**

Find:

```tsx
            <div className="flex-none border-b border-foreground/10 px-6 py-3 flex items-center justify-between">
              <span className="rounded bg-foreground/8 px-2 py-0.5 text-xs text-foreground/60">
                {selectedPage.type === 'carousel' ? '輪播頁' : '影片頁'}
              </span>
              <span className="text-xs text-foreground/35">
                {saveState === 'saving' ? '儲存中…' : saveState === 'unsaved' ? '未儲存' : '已儲存'}
              </span>
            </div>
```

Replace with:

```tsx
            <div className="flex-none border-b border-foreground/10 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-foreground/8 px-2 py-0.5 text-xs text-foreground/60">
                  {selectedPage.type === 'carousel' ? '輪播頁' : '影片頁'}
                </span>
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
              <span className="text-xs text-foreground/35">
                {saveState === 'saving' ? '儲存中…' : saveState === 'unsaved' ? '未儲存' : '已儲存'}
              </span>
            </div>
```

- [x] **Step 5: Typecheck (covers Task 3 + Task 4 together)**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to `book-editor-client.tsx` or `app/books/[bookId]/edit/page.tsx`.

- [x] **Step 6: Lint**

Run: `cd forlove10grams && npm run lint`
Expected: no errors related to either file.

- [x] **Step 7: Commit Task 3 + Task 4 together**

```bash
git add "forlove10grams/app/books/[bookId]/edit/page.tsx" forlove10grams/components/book-editor-client.tsx
git commit -m "feat: add happenedAt date input to page editor"
```

---

### Task 5: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd forlove10grams && npm run dev`

- [ ] **Step 2: Verify the date input end-to-end**

- Open a book's edit page, select any page. Confirm a date input renders next to the page-type badge (輪播頁/影片頁), initially empty.
- Set a date. Confirm no `✕` clear button appears until a value is set, then it appears once set.
- Reload the page. Confirm the date persisted (loaded from the server).
- Switch to a different page, then back. Confirm each page shows its own `happenedAt` value (not a leftover from the previously selected page).
- Click `✕` to clear the date, reload, confirm it's empty again.
- Repeat on a video-type page — confirm the same behavior.
- Confirm setting/clearing the date does not affect the `已儲存/未儲存/儲存中` indicator's behavior for markdown content edits (i.e. editing `content` still debounces and shows `未儲存` → `儲存中` → `已儲存` as before).
