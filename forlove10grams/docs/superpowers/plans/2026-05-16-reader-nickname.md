# Reader Nickname Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let readers set a display name on first login, and let page authors embed `${Nickname}` / `${MyNickname}` slots in content that resolve to that name at read time.

**Architecture:** Nickname state lives in `User.nickname` (null = never set, "" = skipped, non-empty = set). The `auth.ts` session callback derives `nicknameIsSet` from this field so `proxy.ts` can gate redirects to `/hajimede` without touching MongoDB. Slot replacement is a pure client-side transform applied to `page.content` in `ReadPageClient` just before Markdown rendering.

**Tech Stack:** Next.js 16.2.6 App Router · MongoDB + Mongoose · next-auth v5 beta (database sessions, `MongoDBAdapter`) · TypeScript · Tailwind CSS

> **Note:** This project has no test framework. TypeScript compilation (`npx tsc --noEmit`) is used as the correctness gate. Manual browser verification is specified at each integration point.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `lib/models/user.ts` | Add `nickname` and `myNickname` fields |
| Modify | `types/next-auth.d.ts` | Expose `nicknameIsSet` on Session, `nickname` on User |
| Modify | `auth.ts` | Compute `nicknameIsSet` in session callback |
| Create | `app/api/user/nickname/route.ts` | PATCH: save nickname for current user |
| Modify | `proxy.ts` | Add `/hajimede` to public routes; redirect when `nicknameIsSet === false` |
| Create | `app/hajimede/page.tsx` | Server component shell for first-visit page |
| Create | `components/hajimede-client.tsx` | Client form — collects nickname, calls API, redirects |
| Create | `lib/resolve-slots.ts` | Pure function: `${Nickname}` / `${MyNickname}` → viewer name |
| Modify | `app/read/[bookId]/page.tsx` | Load viewer's `nickname` + `myNickname`, pass to client |
| Modify | `components/read-page-client.tsx` | Apply `resolveSlots` to each page's content |

---

## Task 1: User Model — Add Nickname Fields

**Files:**
- Modify: `lib/models/user.ts`

- [ ] **Step 1.1: Update `IUser` interface and schema**

  Replace the contents of `lib/models/user.ts` with:

  ```ts
  import mongoose, { Schema, type Document, type Model } from 'mongoose'

  export interface IUser extends Document {
    name?: string
    email?: string
    emailVerified?: Date
    image?: string
    role: 'admin' | 'customer'
    tenantId?: string
    nickname: string | null
    myNickname: string | null
  }

  const UserSchema = new Schema<IUser>(
    {
      name: String,
      email: { type: String, sparse: true, unique: true },
      emailVerified: Date,
      image: String,
      role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
      tenantId: String,
      nickname: { type: String, default: null },
      myNickname: { type: String, default: null },
    },
    { timestamps: true }
  )

  const User: Model<IUser> =
    mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)

  export default User
  ```

- [ ] **Step 1.2: Verify types compile**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors. If there are errors, they'll be about the new fields not matching downstream usage — fix them before proceeding.

- [ ] **Step 1.3: Commit**

  ```bash
  git add lib/models/user.ts
  git commit -m "feat: add nickname and myNickname fields to User model"
  ```

---

## Task 2: NextAuth Types — Expose `nicknameIsSet` on Session

**Files:**
- Modify: `types/next-auth.d.ts`
- Modify: `auth.ts`

- [ ] **Step 2.1: Extend NextAuth type declarations**

  Replace the contents of `types/next-auth.d.ts` with:

  ```ts
  import type { DefaultSession } from 'next-auth'

  declare module 'next-auth' {
    interface Session {
      user: {
        role: 'admin' | 'customer'
        nicknameIsSet: boolean
      } & DefaultSession['user']
    }

    interface User {
      role?: 'admin' | 'customer'
      nickname?: string | null
    }
  }
  ```

- [ ] **Step 2.2: Update `auth.ts` session callback**

  Replace the `callbacks` block in `auth.ts` with:

  ```ts
  callbacks: {
    session({ session, user }) {
      session.user.role = user.role ?? 'customer'
      session.user.nicknameIsSet = user.nickname !== null && user.nickname !== undefined
      return session
    },
  },
  ```

  Full file after the change:

  ```ts
  import NextAuth from 'next-auth'
  import Google from 'next-auth/providers/google'
  import Line from 'next-auth/providers/line'
  import { MongoDBAdapter } from '@auth/mongodb-adapter'
  import clientPromise from './lib/mongodb-client'

  export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    providers: [
      Google,
      Line({
        clientId: process.env.LINE_LOGIN_CHANNEL_ID!,
        clientSecret: process.env.LINE_LOGIN_CLIENT_SECRET!,
      }),
    ],
    session: { strategy: 'database' },
    pages: {
      signIn: '/login',
    },
    callbacks: {
      session({ session, user }) {
        session.user.role = user.role ?? 'customer'
        session.user.nicknameIsSet = user.nickname !== null && user.nickname !== undefined
        return session
      },
    },
  })
  ```

- [ ] **Step 2.3: Verify types compile**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 2.4: Commit**

  ```bash
  git add types/next-auth.d.ts auth.ts
  git commit -m "feat: add nicknameIsSet to session via auth callback"
  ```

---

## Task 3: PATCH `/api/user/nickname` Endpoint

**Files:**
- Create: `app/api/user/nickname/route.ts`

- [ ] **Step 3.1: Create the API route**

  Create `app/api/user/nickname/route.ts`:

  ```ts
  import type { NextRequest } from 'next/server'
  import { z } from 'zod'
  import { auth } from '@/auth'
  import { dbConnect } from '@/lib/mongoose'
  import User from '@/lib/models/user'

  const Body = z.object({
    nickname: z.string(),
  })

  export async function PATCH(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = Body.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues }, { status: 400 })
    }

    await dbConnect()
    await User.findByIdAndUpdate(session.user.id, { nickname: parsed.data.nickname })

    return Response.json({ ok: true })
  }
  ```

- [ ] **Step 3.2: Verify types compile**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3.3: Commit**

  ```bash
  git add app/api/user/nickname/route.ts
  git commit -m "feat: add PATCH /api/user/nickname endpoint"
  ```

---

## Task 4: Proxy — Hajimede Redirect

**Files:**
- Modify: `proxy.ts`

The existing `proxy.ts` wraps `auth()` from next-auth, so `req.auth` already contains the full session including the `nicknameIsSet` field we added in Task 2. We need to:
1. Add `/hajimede` to `PUBLIC_PREFIXES` so the page itself isn't redirect-looped
2. After the unauthenticated check, add a redirect when `nicknameIsSet === false`

- [ ] **Step 4.1: Update `proxy.ts`**

  Replace the contents of `proxy.ts` with:

  ```ts
  import { auth } from '@/auth'
  import { NextResponse } from 'next/server'
  import type { NextAuthRequest } from 'next-auth'

  const PUBLIC_PREFIXES = ['/login', '/api/auth', '/share', '/hajimede']

  export default auth(function proxy(req: NextAuthRequest) {
    const { pathname } = req.nextUrl
    if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    if (!req.auth) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }

    if (req.auth.user.nicknameIsSet === false) {
      const callbackUrl = encodeURIComponent(pathname)
      return NextResponse.redirect(
        new URL(`/hajimede?callbackUrl=${callbackUrl}`, req.nextUrl)
      )
    }

    return NextResponse.next()
  })

  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  }
  ```

- [ ] **Step 4.2: Verify types compile**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors. `req.auth.user.nicknameIsSet` should resolve from the updated Session type.

- [ ] **Step 4.3: Commit**

  ```bash
  git add proxy.ts
  git commit -m "feat: redirect to /hajimede when nicknameIsSet is false"
  ```

---

## Task 5: Hajimede Page

**Files:**
- Create: `app/hajimede/page.tsx`
- Create: `components/hajimede-client.tsx`

- [ ] **Step 5.1: Create the client component**

  Create `components/hajimede-client.tsx`:

  ```tsx
  'use client'

  import { useState } from 'react'
  import { useRouter } from 'next/navigation'

  type Props = {
    defaultPlaceholder: string
    callbackUrl: string
  }

  export function HajimedeClient({ defaultPlaceholder, callbackUrl }: Props) {
    const router = useRouter()
    const [nickname, setNickname] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      setIsSubmitting(true)

      await fetch('/api/user/nickname', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })

      router.push(callbackUrl)
    }

    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="nickname" className="text-sm text-[#2C1810]/60">
            我可以怎麼稱呼你？
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={defaultPlaceholder}
            disabled={isSubmitting}
            className="rounded-lg border border-[#2C1810]/20 bg-white px-4 py-3 text-[#2C1810] placeholder:text-[#2C1810]/30 focus:border-[#2C1810]/40 focus:outline-none focus:ring-1 focus:ring-[#2C1810]/20"
          />
          <p className="text-xs text-[#2C1810]/40">
            空白也沒關係，之後只要知道網址就可以再來修改
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-end rounded-lg bg-[#2C1810] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {isSubmitting ? '...' : '進入 →'}
        </button>
      </form>
    )
  }
  ```

- [ ] **Step 5.2: Create the server page**

  Create `app/hajimede/page.tsx`:

  ```tsx
  import { auth } from '@/auth'
  import { redirect } from 'next/navigation'
  import { HajimedeClient } from '@/components/hajimede-client'

  export default async function HajimePage({
    searchParams,
  }: {
    searchParams: Promise<{ callbackUrl?: string }>
  }) {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const { callbackUrl } = await searchParams
    const destination =
      callbackUrl?.startsWith('/') ? callbackUrl : '/dashboard'

    const placeholder = session.user.name ?? ''

    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="w-full max-w-sm px-6 flex flex-col gap-8">
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-[#2C1810]">嗨，謝謝你來</h1>
          </div>

          <HajimedeClient
            defaultPlaceholder={placeholder}
            callbackUrl={destination}
          />
        </div>
      </main>
    )
  }
  ```

- [ ] **Step 5.3: Verify types compile**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5.4: Commit**

  ```bash
  git add app/hajimede/page.tsx components/hajimede-client.tsx
  git commit -m "feat: add /hajimede nickname setup page"
  ```

---

## Task 6: Manual Integration Test — Redirect + Nickname Flow

Before building the slot replacement, verify the redirect/save flow works end-to-end.

- [ ] **Step 6.1: Start dev server**

  ```bash
  npm run dev
  ```

- [ ] **Step 6.2: Test new-user redirect**

  1. Open a private browser window and navigate to `http://localhost:3000`
  2. Log in with Google or LINE
  3. Expected: redirected to `/hajimede` (not `/dashboard`)
  4. Enter a nickname and click 進入 →
  5. Expected: redirected to `/dashboard`
  6. Log out, log in again
  7. Expected: goes directly to `/dashboard` (no redirect to `/hajimede`)

- [ ] **Step 6.3: Test skip (empty nickname)**

  1. In a private window, log in with a fresh account
  2. On `/hajimede`, leave the input empty and click 進入 →
  3. Expected: redirected to `/dashboard`
  4. Log out, log in again
  5. Expected: goes directly to `/dashboard` (empty string = "seen hajimede", no redirect)

- [ ] **Step 6.4: Test callbackUrl preservation**

  1. In a private window, open a direct book URL: `http://localhost:3000/read/<some-bookId>`
  2. Log in
  3. Expected: redirected to `/hajimede?callbackUrl=%2Fread%2F<bookId>`
  4. Submit nickname
  5. Expected: lands on `/read/<bookId>` (not `/dashboard`)

- [ ] **Step 6.5: Test `/hajimede` is re-enterable**

  1. While logged in (nicknameIsSet = true), navigate directly to `http://localhost:3000/hajimede`
  2. Expected: page loads (not redirected away)

---

## Task 7: Slot Resolver — Pure Function

**Files:**
- Create: `lib/resolve-slots.ts`

- [ ] **Step 7.1: Create the resolver**

  Create `lib/resolve-slots.ts`:

  ```ts
  export function resolveSlots(
    content: string,
    nickname: string | null,
    myNickname: string | null
  ): string {
    const effectiveMyNickname = myNickname || nickname || '你'
    const effectiveNickname = nickname || '你'

    return content
      .replaceAll('${MyNickname}', effectiveMyNickname)
      .replaceAll('${Nickname}', effectiveNickname)
  }
  ```

  Replacement rules:
  - `${MyNickname}` → `myNickname` if non-empty, else `nickname` if non-empty, else `'你'`
  - `${Nickname}` → `nickname` if non-empty, else `'你'`
  - Content with no slots is returned unchanged (replaceAll is a no-op when no match)

- [ ] **Step 7.2: Verify types compile**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 7.3: Commit**

  ```bash
  git add lib/resolve-slots.ts
  git commit -m "feat: add resolveSlots pure function for nickname substitution"
  ```

---

## Task 8: Read Page — Load and Apply Nicknames

**Files:**
- Modify: `app/read/[bookId]/page.tsx`
- Modify: `components/read-page-client.tsx`

### Step 8A: Update `ReadPageClient` to accept and apply nicknames

- [ ] **Step 8A.1: Update `ReadPageClient` Props type and usage**

  In `components/read-page-client.tsx`, add the two new props and apply `resolveSlots`. The changed sections are:

  1. **Add import** at the top:
     ```ts
     import { resolveSlots } from '@/lib/resolve-slots'
     ```

  2. **Update Props type** (add two new fields):
     ```ts
     type Props = {
       bookId: string
       bookTitle: string
       initialPages: ReadPageData[]
       totalCount: number
       viewerNickname: string | null
       viewerMyNickname: string | null
     }
     ```

  3. **Destructure the new props** in the function signature:
     ```ts
     export function ReadPageClient({
       bookId,
       bookTitle,
       initialPages,
       totalCount,
       viewerNickname,
       viewerMyNickname,
     }: Props) {
     ```

  4. **Apply `resolveSlots` in the render** — find the block that renders `page.content` inside `<ReactMarkdown>` and wrap it:
     ```tsx
     {page.content && (
       <div className="mt-6 text-sm leading-relaxed text-[#2C1810]/80 [&_blockquote]:border-l-2 [&_blockquote]:border-[#2C1810]/20 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:mb-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-[#2C1810] [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-medium [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
         <ReactMarkdown remarkPlugins={[remarkGfm]}>
           {resolveSlots(page.content, viewerNickname, viewerMyNickname)}
         </ReactMarkdown>
       </div>
     )}
     ```

- [ ] **Step 8A.2: Verify types compile**

  ```bash
  npx tsc --noEmit
  ```

  Expected: error about `ReadPageClient` missing props in `app/read/[bookId]/page.tsx` — that's expected and will be resolved in the next step.

### Step 8B: Pass nicknames from server page

- [ ] **Step 8B.1: Load viewer's nickname fields in the server page**

  In `app/read/[bookId]/page.tsx`, add a User import and fetch the viewer's nickname fields, then pass them as props. The updated file:

  ```tsx
  import { notFound, redirect } from 'next/navigation'
  import { auth } from '@/auth'
  import { dbConnect } from '@/lib/mongoose'
  import Book from '@/lib/models/book'
  import Page from '@/lib/models/page'
  import User from '@/lib/models/user'
  import { canEditBook } from '@/lib/access'
  import { ReadPageClient, type ReadPageData } from '@/components/read-page-client'

  export default async function ReadBookPage({
    params,
  }: {
    params: Promise<{ bookId: string }>
  }) {
    const { bookId } = await params
    const session = await auth()

    if (!session?.user?.id) redirect('/login')

    await dbConnect()
    const book = await Book.findById(bookId)
    if (!book) notFound()

    const userId = session.user.id
    const canAccess = canEditBook(userId, book) || book.published
    if (!canAccess) redirect('/dashboard')

    const viewer = await User.findById(userId).lean()
    const viewerNickname = viewer?.nickname ?? null
    const viewerMyNickname = viewer?.myNickname ?? null

    const pageIds = book.pageOrder.map((id) => id.toString())
    const totalCount = pageIds.length
    const firstBatchIds = pageIds.slice(0, 5)
    const rawPages = firstBatchIds.length > 0
      ? await Page.find({ _id: { $in: firstBatchIds } }).lean()
      : []
    rawPages.sort(
      (a, b) => firstBatchIds.indexOf(a._id.toString()) - firstBatchIds.indexOf(b._id.toString())
    )

    const initialPages: ReadPageData[] = rawPages.map((p) => ({
      _id: p._id.toString(),
      type: p.type,
      content: p.content ?? '',
      mediaUrls: p.mediaUrls,
    }))

    return (
      <ReadPageClient
        bookId={bookId}
        bookTitle={book.title}
        initialPages={initialPages}
        totalCount={totalCount}
        viewerNickname={viewerNickname}
        viewerMyNickname={viewerMyNickname}
      />
    )
  }
  ```

- [ ] **Step 8B.2: Verify types compile with no errors**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 8B.3: Commit**

  ```bash
  git add components/read-page-client.tsx app/read/[bookId]/page.tsx
  git commit -m "feat: apply nickname slot replacement on read page"
  ```

---

## Task 9: Manual Integration Test — Slot Replacement

- [ ] **Step 9.1: Set up test content**

  Using the admin editor, create a page with content like:

  ```
  嗨，${Nickname}，你好！
  
  這本書是特別為 ${MyNickname} 寫的。
  ```

- [ ] **Step 9.2: Test as a user with nickname set**

  1. Log in as a reader who has set their nickname (e.g. "小花")
  2. Open the book's read URL
  3. Expected: renders `嗨，小花，你好！` and `這本書是特別為 小花 寫的。`
  4. (Both `${Nickname}` and `${MyNickname}` resolve to "小花" since `myNickname` is null)

- [ ] **Step 9.3: Test as a user with no nickname (skipped)**

  1. Log in as a reader who skipped hajimede (nickname = "")
  2. Open the same book
  3. Expected: renders `嗨，你，你好！` and `這本書是特別為 你 寫的。`

- [ ] **Step 9.4: Test content without slots**

  1. Open a book page that has no `${...}` tokens in its content
  2. Expected: content renders exactly as authored, no changes

- [ ] **Step 9.5: Test with `myNickname` set in DB**

  1. Manually set `myNickname` to "阿花" for a test user in MongoDB
  2. Open the same book as that user
  3. Expected: `${MyNickname}` → "阿花", `${Nickname}` → whatever their nickname is (or "你")

---

## Self-Review Checklist

- [x] **Spec coverage**
  - `User.nickname` + `User.myNickname` → Task 1
  - Session `nicknameIsSet` → Task 2
  - PATCH API → Task 3
  - Proxy/redirect → Task 4
  - `/hajimede` page → Task 5
  - `resolveSlots` → Task 7
  - Read page slot replacement → Task 8
  - All four slot scenarios (myNickname set, only nickname set, no nickname, no slot) → Task 9

- [x] **No placeholders** — every step has full code

- [x] **Type consistency**
  - `viewerNickname: string | null` defined in Task 8A props, used in 8B JSX ✓
  - `resolveSlots(content, nickname, myNickname)` — signature defined in Task 7, called in 8A ✓
  - `nicknameIsSet` added to `Session` type in Task 2, read in proxy in Task 4 ✓
  - `IUser.nickname` / `IUser.myNickname` defined in Task 1, read via `.lean()` in Task 8B ✓
