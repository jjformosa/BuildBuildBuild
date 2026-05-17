# Books Tags 系統實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 forlove10grams 的 books 功能新增標籤（tags）系統，包含獨立標籤庫、AutoComplete 輸入、後端搜尋整合、Dashboard 快速新增與編輯頁完整管理。

**Architecture:** 標籤庫以獨立 MongoDB collection（Tag model）儲存，Book 直接存純文字 `tags: string[]`（denormalized，無外鍵）。前端 TagInput 元件以 debounced `GET /api/tags?q=` 做 AutoComplete。新增/刪除各用獨立 API endpoint（不走現有 PATCH），讓 editorId 也能操作標籤。後端搜尋改為 title + tags 的 `$or` regex 查詢。

**Tech Stack:** Next.js App Router、Mongoose/MongoDB、Zod、Tailwind CSS (`#2C1810` 主色)、NextAuth (cookie session)

---

## 檔案變更清單

**新增：**
- `forlove10grams/lib/models/tag.ts`
- `forlove10grams/app/api/tags/route.ts`
- `forlove10grams/app/api/books/[bookId]/tags/route.ts`
- `forlove10grams/app/api/books/[bookId]/tags/[tagName]/route.ts`
- `forlove10grams/components/tag-input.tsx`

**修改：**
- `forlove10grams/lib/models/book.ts` — 加 `tags: string[]`
- `forlove10grams/app/api/books/route.ts` — 搜尋改 `$or`，select 加 `tags`
- `forlove10grams/components/dashboard-books-client.tsx` — BookCard 加快速新增
- `forlove10grams/components/book-editor-client.tsx` — sidebar 底部加 Tags 區塊

---

## Task 1：Tag Mongoose Model

**Files:**
- Create: `forlove10grams/lib/models/tag.ts`

- [ ] **Step 1：建立 Tag model**

```typescript
import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface ITag extends Document {
  name: string
  authorId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

const Tag: Model<ITag> =
  mongoose.models.Tag ?? mongoose.model<ITag>('Tag', TagSchema)

export default Tag
```

- [ ] **Step 2：提交**

```bash
git add forlove10grams/lib/models/tag.ts
git commit -m "feat: add Tag mongoose model with name unique index and authorId"
```

---

## Task 2：Book Model 加 tags 欄位

**Files:**
- Modify: `forlove10grams/lib/models/book.ts`

- [ ] **Step 1：讀取現有 book.ts**

讀取 `forlove10grams/lib/models/book.ts` 確認現有 interface 和 schema。

- [ ] **Step 2：更新 IBook interface**

在 `published: boolean` 後加一行：

```typescript
tags: string[]
```

- [ ] **Step 3：更新 BookSchema**

在 `published` 欄位後加：

```typescript
tags: [{ type: String }],
```

完整 schema 範例（加入後的樣子）：

```typescript
const BookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true },
    description: String,
    coverImage: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User' },
    pageOrder: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
    published: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  { timestamps: true }
)
```

- [ ] **Step 4：提交**

```bash
git add forlove10grams/lib/models/book.ts
git commit -m "feat: add tags string array field to Book model"
```

---

## Task 3：GET /api/tags — AutoComplete 搜尋端點

**Files:**
- Create: `forlove10grams/app/api/tags/route.ts`

- [ ] **Step 1：建立 route 檔案**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import dbConnect from '@/lib/db'
import Tag from '@/lib/models/tag'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 401 })
  }

  await dbConnect()

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const query = q
    ? { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    : {}

  const tags = await Tag.find(query).limit(10).select('name -_id').lean()
  return NextResponse.json(tags.map((t) => t.name))
}
```

- [ ] **Step 2：手動驗證**

啟動 dev server 後：

```bash
curl "http://localhost:3000/api/tags?q=旅" -H "Cookie: <session-cookie>"
# 期望：[] （尚無資料，正常）

curl "http://localhost:3000/api/tags" -H "Cookie: <session-cookie>"
# 期望：[] 且 status 200
```

- [ ] **Step 3：提交**

```bash
git add forlove10grams/app/api/tags/route.ts
git commit -m "feat: add GET /api/tags autocomplete search endpoint"
```

---

## Task 4：POST /api/books/[bookId]/tags — 新增標籤

**Files:**
- Create: `forlove10grams/app/api/books/[bookId]/tags/route.ts`

- [ ] **Step 1：讀取 access.ts**

讀取 `forlove10grams/lib/access.ts` 確認 `canEditBook` 的 function signature：

```typescript
// 預期如下：
export function canEditBook(userId: string, book: IBook, role?: string): boolean
```

- [ ] **Step 2：建立 route 檔案**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import dbConnect from '@/lib/db'
import Book from '@/lib/models/book'
import Tag from '@/lib/models/tag'
import { canEditBook } from '@/lib/access'

const AddTagBody = z.object({
  name: z.string().min(1).max(50).trim(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params

  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!canEditBook(session.user.id, book, session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = AddTagBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const name = parsed.data.name

  if (!book.tags.includes(name)) {
    book.tags.push(name)
    await book.save()
  }

  await Tag.updateOne(
    { name },
    { $setOnInsert: { name, authorId: session.user.id } },
    { upsert: true }
  )

  return NextResponse.json({ tags: book.tags })
}
```

**注意：** 若 `session.user.role` TypeScript 型別報錯，改用 `(session.user as { role?: string }).role`。

- [ ] **Step 3：提交**

```bash
git add forlove10grams/app/api/books/[bookId]/tags/route.ts
git commit -m "feat: add POST /api/books/[bookId]/tags endpoint with tag library upsert"
```

---

## Task 5：DELETE /api/books/[bookId]/tags/[tagName] — 刪除標籤

**Files:**
- Create: `forlove10grams/app/api/books/[bookId]/tags/[tagName]/route.ts`

- [ ] **Step 1：建立 route 檔案**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import dbConnect from '@/lib/db'
import Book from '@/lib/models/book'
import { canEditBook } from '@/lib/access'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string; tagName: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, tagName } = await params
  const decodedName = decodeURIComponent(tagName)

  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!canEditBook(session.user.id, book, session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  book.tags = book.tags.filter((t) => t !== decodedName)
  await book.save()

  return NextResponse.json({ tags: book.tags })
}
```

- [ ] **Step 2：提交**

```bash
git add forlove10grams/app/api/books/[bookId]/tags/[tagName]/route.ts
git commit -m "feat: add DELETE /api/books/[bookId]/tags/[tagName] endpoint"
```

---

## Task 6：更新 GET /api/books 搜尋邏輯

**Files:**
- Modify: `forlove10grams/app/api/books/route.ts`

- [ ] **Step 1：讀取現有搜尋段落**

讀取 `forlove10grams/app/api/books/route.ts`，找到：

```typescript
if (q) {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  query.title = { $regex: escaped, $options: 'i' }
}
```

和 `.select(...)` 那行。

- [ ] **Step 2：將 title-only 搜尋改為 title + tags**

把上面的 `if (q)` 區塊替換為：

```typescript
if (q) {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = { $regex: escaped, $options: 'i' }
  query.$or = [{ title: regex }, { tags: regex }]
}
```

- [ ] **Step 3：在 .select() 加入 tags**

找到 `.select('_id title description coverImage published')` 改為：

```typescript
.select('_id title description coverImage published tags')
```

- [ ] **Step 4：驗證搜尋功能**

啟動 dev server：

```bash
# 先建立一本 book 並加 tag "旅遊"
# 再搜尋 tag 關鍵字
curl "http://localhost:3000/api/books?q=旅遊" -H "Cookie: <session-cookie>"
# 期望：有 tags 包含 "旅遊" 的書出現在結果中
```

- [ ] **Step 5：提交**

```bash
git add forlove10grams/app/api/books/route.ts
git commit -m "feat: extend book search to match title and tags simultaneously"
```

---

## Task 7：TagInput 共用元件

**Files:**
- Create: `forlove10grams/components/tag-input.tsx`

- [ ] **Step 1：建立元件**

```typescript
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface TagInputProps {
  tags: string[]
  onAdd: (tag: string) => Promise<void>
  onRemove?: (tag: string) => Promise<void>
  disabled?: boolean
}

export default function TagInput({ tags, onAdd, onRemove, disabled }: TagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}`)
      if (res.ok) setSuggestions(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    setShowDropdown(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val.trim()), 300)
  }

  const handleAdd = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || tags.includes(trimmed)) return
    setInput('')
    setSuggestions([])
    setShowDropdown(false)
    await onAdd(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd(input)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[#2C1810]/8 px-2.5 py-1 text-xs text-[#2C1810]/70"
            >
              {tag}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(tag)}
                  className="ml-0.5 text-[#2C1810]/40 hover:text-red-400 transition-colors"
                  aria-label={`移除 ${tag}`}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onFocus={() => input && setShowDropdown(true)}
          disabled={disabled}
          placeholder="新增標籤…"
          className="w-full rounded-lg border border-[#2C1810]/15 bg-white px-3 py-1.5 text-sm text-[#2C1810] placeholder:text-[#2C1810]/30 focus:border-[#2C1810]/35 focus:outline-none disabled:opacity-50"
        />
        {showDropdown && (loading || suggestions.length > 0) && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-[#2C1810]/10 bg-white shadow-md overflow-hidden">
            {loading && (
              <li className="px-3 py-2 text-xs text-[#2C1810]/40">搜尋中…</li>
            )}
            {suggestions
              .filter((s) => !tags.includes(s))
              .map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleAdd(s)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-[#2C1810]/70 hover:bg-[#2C1810]/5 transition-colors"
                  >
                    {s}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2：提交**

```bash
git add forlove10grams/components/tag-input.tsx
git commit -m "feat: add TagInput component with debounced autocomplete and optional remove"
```

---

## Task 8：Dashboard BookCard — 快速新增標籤

**Files:**
- Modify: `forlove10grams/components/dashboard-books-client.tsx`

- [ ] **Step 1：讀取現有 BookCard**

讀取 `forlove10grams/components/dashboard-books-client.tsx`，找到 `DashboardBook` type 和 `BookCard` 元件。

- [ ] **Step 2：更新 DashboardBook type**

找到：
```typescript
type DashboardBook = {
  _id: string
  title: string
  description: string | null
  coverImage: string | null
  published: boolean
}
```

改為：
```typescript
type DashboardBook = {
  _id: string
  title: string
  description: string | null
  coverImage: string | null
  published: boolean
  tags: string[]
}
```

- [ ] **Step 3：在檔案頂部加 import**

找到現有的 import 區塊，加入：

```typescript
import TagInput from '@/components/tag-input'
```

- [ ] **Step 4：將 BookCard 從 Link 改為 div 並新增標籤功能**

現有 `BookCard` 是一個整個包在 `<Link>` 裡的元件。需要重構成 div 容器，Link 只包內容區。

找到：
```typescript
function BookCard({ book }: { book: DashboardBook }) {
  const initial = book.title.charAt(0)
  return (
    <Link
      href={`/books/${book._id}/edit`}
      className="flex items-center gap-3 rounded-xl border border-[#2C1810]/10 bg-white px-4 py-3 transition-all hover:border-[#2C1810]/25 hover:shadow-sm"
    >
```

替換成完整的新 BookCard（注意：`onTagAdded` 需要從父元件傳入，見 Step 5）：

```typescript
function BookCard({
  book,
  onTagAdded,
}: {
  book: DashboardBook
  onTagAdded: (bookId: string, tag: string) => void
}) {
  const [showTagInput, setShowTagInput] = useState(false)
  const [adding, setAdding] = useState(false)
  const initial = book.title.charAt(0)

  const handleAddTag = async (tag: string) => {
    setAdding(true)
    try {
      const res = await fetch(`/api/books/${book._id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tag }),
      })
      if (res.ok) {
        onTagAdded(book._id, tag)
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#2C1810]/10 bg-white px-4 py-3 transition-all hover:border-[#2C1810]/25 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <Link href={`/books/${book._id}/edit`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0 h-14 w-14 overflow-hidden rounded-lg bg-[#2C1810]/5 flex items-center justify-center">
            {book.coverImage ? (
              <img src={book.coverImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-semibold text-[#2C1810]/25">{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#2C1810] truncate">{book.title}</p>
            {book.description && (
              <p className="mt-0.5 line-clamp-1 text-sm text-[#2C1810]/50">{book.description}</p>
            )}
          </div>
        </Link>
        <div className="shrink-0 flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              book.published
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-[#2C1810]/5 text-[#2C1810]/40'
            }`}
          >
            {book.published ? '已分享' : '草稿'}
          </span>
          <button
            type="button"
            onClick={() => setShowTagInput((v) => !v)}
            className="text-xs text-[#2C1810]/40 hover:text-[#2C1810]/70 transition-colors px-1"
            title="新增標籤"
          >
            ＋標籤
          </button>
          {/* 保留原本的 PencilIcon 或其他 icon */}
        </div>
      </div>
      {showTagInput && (
        <div className="mt-3 pt-3 border-t border-[#2C1810]/8">
          <TagInput
            tags={book.tags}
            onAdd={handleAddTag}
            disabled={adding}
          />
        </div>
      )}
    </div>
  )
}
```

**注意：** 找到 `BookCard` 結尾的 `</Link>` 並確保替換完整，保留原本的 PencilIcon 元件（若存在）放在 `{/* 保留原本的 PencilIcon */}` 位置。

- [ ] **Step 5：更新父元件傳入 onTagAdded**

在使用 `<BookCard>` 的地方（在 `DashboardBooksClient` 或類似主元件裡的 map），加上 `onTagAdded` handler。

找到 `books.map(...)` 的渲染位置，在 state 中加入 tag 更新邏輯：

```typescript
// 在 DashboardBooksClient 主元件裡加 handler
const handleTagAdded = useCallback((bookId: string, tag: string) => {
  // 更新本地 books 陣列中對應 book 的 tags
  setBooks((prev) =>
    prev.map((b) =>
      b._id === bookId && !b.tags.includes(tag)
        ? { ...b, tags: [...b.tags, tag] }
        : b
    )
  )
}, [])
```

然後在渲染 BookCard 時傳入：

```typescript
<BookCard key={book._id} book={book} onTagAdded={handleTagAdded} />
```

**注意：** 若使用 `useInfiniteScroll` hook 管理 books 列表，需確認如何取得 `setBooks`。若無法直接 setBooks，可考慮在新增後 refetch 該書籍的資料。

- [ ] **Step 6：確認 useState import**

確認 `dashboard-books-client.tsx` 頂部已 import `useState`：

```typescript
import { useState, useCallback, ... } from 'react'
```

- [ ] **Step 7：手動測試**

1. 前往 Dashboard
2. 點擊某本書的「＋標籤」按鈕
3. 輸入標籤名稱，按 Enter
4. 確認 tag 出現在 TagInput 的 tag 列表中（但不顯示在 card 外部）
5. 再開 `/api/tags?q=` 確認新 tag 已寫入標籤庫

- [ ] **Step 8：提交**

```bash
git add forlove10grams/components/dashboard-books-client.tsx
git commit -m "feat: add quick-add tags to dashboard BookCard"
```

---

## Task 9：Book Editor — 完整標籤管理

**Files:**
- Modify: `forlove10grams/components/book-editor-client.tsx`

- [ ] **Step 1：讀取 book-editor-client.tsx 的 sidebar 結構**

讀取 `forlove10grams/components/book-editor-client.tsx`，找到：
1. `<aside>` 元素的完整 JSX（sidebar）
2. 元件 props（看有沒有 bookId、初始 tags 等）
3. 最上方的 props type 定義

- [ ] **Step 2：確認 props 有傳入 tags**

BookEditorClient 的 props type 找到後，若沒有 `tags` 欄位，新增：

```typescript
// 在現有 props 中加入
initialTags: string[]
```

同時在元件函數參數中解構：

```typescript
export default function BookEditorClient({
  bookId,
  // ...現有 props
  initialTags,
}: {
  bookId: string
  // ...現有 props types
  initialTags: string[]
}) {
```

- [ ] **Step 3：加入 tags state**

在元件 state 宣告區（有 `useState` 的地方附近）加入：

```typescript
const [tags, setTags] = useState<string[]>(initialTags)
```

- [ ] **Step 4：在元件頂部加 TagInput import**

```typescript
import TagInput from '@/components/tag-input'
```

- [ ] **Step 5：加入 handleAddTag 和 handleRemoveTag**

在現有的 handler 函數旁邊加：

```typescript
const handleAddTag = async (tag: string) => {
  const res = await fetch(`/api/books/${bookId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: tag }),
  })
  if (res.ok) {
    const data = await res.json()
    setTags(data.tags)
  }
}

const handleRemoveTag = async (tag: string) => {
  const res = await fetch(
    `/api/books/${bookId}/tags/${encodeURIComponent(tag)}`,
    { method: 'DELETE' }
  )
  if (res.ok) {
    const data = await res.json()
    setTags(data.tags)
  }
}
```

- [ ] **Step 6：在 sidebar 底部加入 Tags 區塊**

找到 `<aside>` 元素，在其最後（頁面列表和「新增頁面」按鈕之後）加入：

```tsx
{/* Tags 區塊 */}
<div className="border-t border-[#2C1810]/10 p-3">
  <p className="mb-2 text-xs text-[#2C1810]/50">標籤</p>
  <TagInput
    tags={tags}
    onAdd={handleAddTag}
    onRemove={handleRemoveTag}
  />
</div>
```

- [ ] **Step 7：更新父元件傳入 initialTags**

讀取 `forlove10grams/app/books/[bookId]/edit/page.tsx`，找到渲染 `<BookEditorClient>` 的地方。

確認 Book 資料已包含 `tags` 欄位（server side 應已透過 mongoose 查詢取得），並傳入：

```tsx
<BookEditorClient
  bookId={book._id.toString()}
  // ...現有 props
  initialTags={book.tags ?? []}
/>
```

- [ ] **Step 8：手動測試**

1. 前往書籍編輯頁 `/books/[bookId]/edit`
2. 確認 sidebar 底部出現「標籤」區塊
3. 輸入新標籤，按 Enter → 標籤出現
4. 點擊標籤的 ✕ 按鈕 → 標籤消失
5. 重新載入頁面確認標籤持久化

- [ ] **Step 9：提交**

```bash
git add forlove10grams/components/book-editor-client.tsx forlove10grams/app/books/[bookId]/edit/page.tsx
git commit -m "feat: add full tag management to book editor sidebar"
```

---

## 端對端驗證清單

完成所有 task 後，依序確認：

1. **標籤庫寫入**：在 Dashboard 新增 tag → MongoDB 的 `tags` collection 有新記錄，`authorId` 正確
2. **AutoComplete**：在 TagInput 輸入已存在的 tag → 下拉出現候選
3. **Dashboard 快速新增**：點「＋標籤」→ 可新增，不可刪除
4. **編輯頁完整管理**：新增 + ✕ 刪除均可操作，reload 後持久
5. **搜尋 by tag**：搜尋 tag 文字 → 對應書籍出現
6. **搜尋 by title**：原有行為不受影響
7. **Editor 權限**：editorId 使用者可新增/刪除標籤（非只有 owner）
