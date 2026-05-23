# Role Permission + Dashboard Redesign — Design Spec

**Date:** 2026-05-23
**Branch:** feature-editor-management

---

## Goals

1. **Editor 可分享**：根據 `role_permission.md`，editor 可觸發 `private → shared` 狀態轉換。
2. **Edit 頁 UI 同步**：ShareButton、ShareLinkManager 對 editor 開放；移除 InviteLinkManager。
3. **Dashboard editor 書本**：用 `BookCard role='editor'` 渲染，支援標籤管理、讚數、雙按鈕（閱讀/編輯）。
4. **移除 invite reader 系統**：以 `share` 為唯一分享機制，簡化存取模型。

### 本次不在範圍

- `private → public` publish 功能
- 讀者管理介面（reader list、移除讀者）

---

## 存取模型（簡化後）

移除 `BookReader` 關係後，read 頁的存取判斷變為：

```
canAccess = canEditBook(userId, book)
         || book.shareStatus === 'shared'
         || book.shareStatus === 'public'
```

讀者透過 share link 進入書本，`ReadProgress` 隱式記錄閱讀關係。Dashboard 的讀者 section 仍透過 ReadProgress 顯示。若 share 被撤銷（shareStatus → 'private'），讀者失去存取權——符合「link-only access」的設計初衷。

---

## Section 1：API — `requireOwner` → `requireManager`

`POST /api/books/[bookId]/share` 和 `DELETE /api/books/[bookId]/share` 改用新的 helper：

```typescript
async function requireManager(
  bookId: string,
  userId: string,
): Promise<{ book: IBook; err: null } | { book: null; err: Response }> {
  const book = await Book.findById(bookId)
  if (!book) return { book: null, err: Response.json({ error: 'Not found' }, { status: 404 }) }
  const isOwner = book.createdBy.toString() === userId
  const isEditor = book.editorId?.toString() === userId
  if (!isOwner && !isEditor) return { book: null, err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { book, err: null }
}
```

`GET /api/books/[bookId]/share` 維持 `requireOwner`（管理介面仍為 owner-only）。

---

## Section 2：Edit 頁調整

`app/books/[bookId]/edit/page.tsx`：

**ShareButton、ShareLinkManager 對 editor 開放：**

```tsx
{/* Header */}
{(isOwner || isEditor) && <ShareButton bookId={bookId} />}
{isOwner && <InviteEditorButton bookId={bookId} />}   {/* owner only */}

{/* 底部 section */}
{(isOwner || isEditor) && <ShareLinkManager bookId={bookId} />}
{/* InviteLinkManager 移除 */}
```

`CoverImageButton` 維持 `isOwner` only。`ShareStatusProvider` 不動。

---

## Section 3：Dashboard — BookCard role prop

### `BookCard` 新增 `role` prop

```typescript
function BookCard({
  book,
  role = 'owner',
  onTagsChanged,
}: {
  book: DashboardBook
  role?: 'owner' | 'editor'
  onTagsChanged: (bookId: string, tags: string[]) => void
})
```

`role='editor'` 與 `role='owner'` 的差異：

| 功能 | owner | editor |
|------|:-----:|:------:|
| 整張卡片 Link → /edit | ✓ | ✗ |
| 右側兩個按鈕（閱讀 / 編輯 ✎） | ✗ | ✓ |
| ShareStatus badge | ✓ | ✓ |
| 讚數 | ✓ | ✓ |
| 標籤管理 | ✓ | ✓ |
| Editor row（移除編輯者） | ✓ | ✗ |

Editor 卡片右側按鈕（Option A，兩個並排 border 按鈕）：

```tsx
<div className="flex gap-2 ml-4 shrink-0">
  <Link href={`/read/${book._id}`}
    className="text-xs border border-[#2C1810]/20 rounded-md px-2.5 py-1 text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors">
    閱讀
  </Link>
  <Link href={`/books/${book._id}/edit`}
    className="text-xs border border-[#2C1810]/20 rounded-md px-2.5 py-1 text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors">
    編輯 ✎
  </Link>
</div>
```

`BookCard` 從 `dashboard-books-client.tsx` export，供 `dashboard/page.tsx` 使用。

### `dashboard-books-client.tsx` 新增 `EditorBooksClient`

`BookCard` 需要 `onTagsChanged` callback（function prop），server component 無法直接傳遞。在 `dashboard-books-client.tsx`（已是 `'use client'`）加入一個薄 wrapper：

```typescript
export function EditorBooksClient({ books }: { books: DashboardBook[] }) {
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})
  const handleTagsChanged = (bookId: string, tags: string[]) =>
    setTagOverrides((prev) => ({ ...prev, [bookId]: tags }))

  return (
    <ul className="space-y-3">
      {books.map((book) => (
        <li key={book._id}>
          <BookCard
            book={{ ...book, tags: tagOverrides[book._id] ?? book.tags }}
            role="editor"
            onTagsChanged={handleTagsChanged}
          />
        </li>
      ))}
    </ul>
  )
}
```

### `dashboard/page.tsx` 變更

**Editor books 加 like counts：**

```typescript
const editorLikeCounts = editorBooksRaw.length > 0
  ? await getLikeCountsByBook(editorBooksRaw.map((b) => b._id as mongoose.Types.ObjectId))
  : new Map<string, number>()

const editorBooks = editorBooksRaw.map((b) =>
  toBook(b, editorLikeCounts.get(b._id.toString()) ?? 0)
)
```

**Reader section** 維持透過 ReadProgress 查詢（不變）。`SharedBookList` 只剩 reader items，`SharedBookItem` 不再有 `editHref`。

**移除：**
- `BookReader` import 與 `isBookReader` 相關 import
- `InviteLinkManager` import 與使用

**Dashboard 版面結構：**

```
[謝謝你，幫我記住]   ← admin only，DashboardBooksClient（owner books）
[謝謝你，與我回憶]   ← EditorBooksClient（editor books，BookCard role='editor'）
                     + SharedBookList（reader books，整張卡片 link）
```

Editor books 和 reader books 在同一個 section，editor books 優先。

---

## Section 4：移除 invite reader 系統

### 刪除

| 檔案 | 說明 |
|------|------|
| `lib/models/book-invite.ts` | BookInvite model |
| `lib/models/book-reader.ts` | BookReader model |
| `app/api/books/[bookId]/invite-link/route.ts` | 讀者邀請連結 API |
| `app/api/books/[bookId]/readers/route.ts` | 讀者列表 GET |
| `app/api/books/[bookId]/readers/[userId]/route.ts` | 移除讀者 DELETE |
| `app/api/invite/[token]/route.ts` | 邀請 token 查詢 |
| `app/api/invite/[token]/accept/route.ts` | 接受邀請 |
| `app/invite/[token]/page.tsx` | 邀請頁面 |
| `app/invite/[token]/accept-button.tsx` | 接受按鈕 |
| `components/invite-link-manager.tsx` | 讀者邀請管理 UI |

> **注意：** `app/api/books/[bookId]/invite/route.ts`（邀請 editor）和 `components/invite-editor-button.tsx` **不刪除**，與讀者邀請系統無關。

### 修改

**`lib/access.ts`**：移除 `isBookReader` 函式與 `BookReader` import。

**`app/read/[bookId]/page.tsx`**：移除 `isBookReader` 呼叫：

```typescript
// before
const canAccess =
  canEditBook(userId, book) ||
  book.shareStatus === 'shared' ||
  book.shareStatus === 'public' ||
  (await isBookReader(userId, bookId))

// after
const canAccess =
  canEditBook(userId, book) ||
  book.shareStatus === 'shared' ||
  book.shareStatus === 'public'
```

---

## Section 5：Dashboard 搜尋共用

### 目標

搜尋輸入觸發時，owner books 和 editor books 同步過濾，使用相同關鍵字。Reader books（`SharedBookList`）不參與搜尋（通常只有少數幾本，且無 title/description 可搜）。

### 實作方式：提升 search state 至共用 wrapper

新增 `DashboardShell` client component，放在 `dashboard-books-client.tsx`：

```typescript
export function DashboardShell({
  ownerBooks,
  editorBooks,
  readerBooks,
}: {
  ownerBooks: DashboardBook[]      // 空陣列 = 無 owner section
  editorBooks: DashboardBook[]
  readerBooks: SharedBook[]
}) {
  const [search, setSearch] = useState('')

  return (
    <>
      {ownerBooks.length > 0 && (
        <DashboardBooksClient books={ownerBooks} search={search} onSearchChange={setSearch} />
      )}
      <EditorBooksClient books={editorBooks} search={search} onSearchChange={ownerBooks.length === 0 ? setSearch : undefined} />
      {readerBooks.length > 0 && <SharedBookList books={readerBooks} />}
    </>
  )
}
```

- `DashboardBooksClient` 改為接受 `search` / `onSearchChange` props，將搜尋輸入框移至 props 控制（外部提供 state）。
- `EditorBooksClient` 接受 `search` prop，過濾 `book.title`。若 `onSearchChange` 有傳入（owner section 不存在時），也渲染搜尋輸入。
- 搜尋比對：`book.title.toLowerCase().includes(search.toLowerCase())`；空字串不過濾。
- `dashboard/page.tsx` 改用 `DashboardShell` 取代直接渲染 `DashboardBooksClient` + `EditorBooksClient`。

### 使用者只有 editor 角色時

```
[謝謝你，與我回憶]
  搜尋輸入（由 EditorBooksClient 渲染）
  editor books（過濾）
  reader books（不過濾）
```

`ownerBooks` 傳入空陣列，`DashboardBooksClient` 不渲染，搜尋輸入由 `EditorBooksClient` 接管。

---

## File Map

### 刪除（10 個檔案）

- `forlove10grams/lib/models/book-invite.ts`
- `forlove10grams/lib/models/book-reader.ts`
- `forlove10grams/app/api/books/[bookId]/invite-link/route.ts`
- `forlove10grams/app/api/books/[bookId]/readers/route.ts`
- `forlove10grams/app/api/books/[bookId]/readers/[userId]/route.ts`
- `forlove10grams/app/api/invite/[token]/route.ts`
- `forlove10grams/app/api/invite/[token]/accept/route.ts`
- `forlove10grams/app/api/invite/[token]/page.tsx`
- `forlove10grams/app/invite/[token]/accept-button.tsx`
- `forlove10grams/components/invite-link-manager.tsx`

### 修改（6 個檔案）

- `forlove10grams/app/api/books/[bookId]/share/route.ts` — requireOwner → requireManager
- `forlove10grams/app/books/[bookId]/edit/page.tsx` — editor 看到 ShareButton + ShareLinkManager；移除 InviteLinkManager
- `forlove10grams/components/dashboard-books-client.tsx` — BookCard role prop、EditorBooksClient、DashboardShell；DashboardBooksClient 改接受外部 search state
- `forlove10grams/app/dashboard/page.tsx` — 改用 DashboardShell；editor books like counts；移除 BookReader/invite 相關
- `forlove10grams/app/read/[bookId]/page.tsx` — 移除 isBookReader 存取判斷
- `forlove10grams/lib/access.ts` — 移除 isBookReader 函式
