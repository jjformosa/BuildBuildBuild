# Proxy → callbacks.authorized Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all routing/auth logic out of `proxy.ts` into `auth.ts`'s `callbacks.authorized`, so `proxy.ts` becomes a minimal re-export stub.

**Architecture:** NextAuth v5's `authorized` callback fires inside the `auth(fn)` wrapper before the proxy function runs. It receives `{ request, auth }` and can return `true` (allow), `false` (redirect to `/login`), or a `Response` (custom response/redirect). Moving the logic there keeps all auth decisions in one place and removes the `nicknameIsSet`-redirect from the proxy function.

**Tech Stack:** NextAuth v5 beta, Next.js App Router, TypeScript

---

## File Map

| File | Change |
|------|--------|
| `auth.ts` | Add `authorized` callback with all routing logic |
| `proxy.ts` | Reduce to a re-export stub (`export { auth as default }`) |

---

### Task 1: Add `authorized` callback to `auth.ts`

**Files:**
- Modify: `auth.ts`

- [ ] **Step 1: Open `auth.ts` and add the `authorized` callback**

  Replace the existing `callbacks` block with:

  ```ts
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl
      const PUBLIC_PREFIXES = ['/login', '/api/auth', '/share', '/hajimede']
      if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true

      if (!auth) {
        if (pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return false
      }

      if (auth.user.nicknameIsSet === false && !pathname.startsWith('/api/')) {
        const url = request.nextUrl.clone()
        url.pathname = '/hajimede'
        url.search = `callbackUrl=${encodeURIComponent(pathname)}`
        return Response.redirect(url)
      }

      return true
    },
    session({ session, user }) {
      session.user.role = user.role ?? 'customer'
      session.user.nicknameIsSet = user.nickname !== null && user.nickname !== undefined
      return session
    },
  },
  ```

  The full `auth.ts` becomes:

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
      authorized({ request, auth }) {
        const { pathname } = request.nextUrl
        const PUBLIC_PREFIXES = ['/login', '/api/auth', '/share', '/hajimede']
        if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true

        if (!auth) {
          if (pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }
          return false
        }

        if (auth.user.nicknameIsSet === false && !pathname.startsWith('/api/')) {
          const url = request.nextUrl.clone()
          url.pathname = '/hajimede'
          url.search = `callbackUrl=${encodeURIComponent(pathname)}`
          return Response.redirect(url)
        }

        return true
      },
      session({ session, user }) {
        session.user.role = user.role ?? 'customer'
        session.user.nicknameIsSet = user.nickname !== null && user.nickname !== undefined
        return session
      },
    },
  })
  ```

- [ ] **Step 2: Verify TypeScript**

  Run: `npx tsc --noEmit`
  Expected: no errors

---

### Task 2: Simplify `proxy.ts` to a re-export stub

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Replace the entire contents of `proxy.ts`**

  ```ts
  export { auth as default } from '@/auth'

  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  }
  ```

  This file no longer needs `NextResponse`, `NextAuthRequest`, or `PUBLIC_PREFIXES` — all that logic now lives in `auth.ts`.

- [ ] **Step 2: Verify TypeScript again**

  Run: `npx tsc --noEmit`
  Expected: no errors

- [ ] **Step 3: Commit**

  ```bash
  git add auth.ts proxy.ts
  git commit -m "refactor: move proxy routing logic into auth callbacks.authorized"
  ```

---

### Task 3: Smoke-test the running app

- [ ] **Step 1: Start dev server**

  Run: `npm run dev`

- [ ] **Step 2: Verify unauthenticated access**

  - Visit `http://localhost:3000/dashboard` → should redirect to `/login`
  - Hit `GET http://localhost:3000/api/books` (unauthenticated) → should return `{"error":"Unauthorized"}` with status 401

- [ ] **Step 3: Verify nickname redirect**

  - Log in as a user whose `nickname` is `null` in MongoDB
  - Visit any non-public page → should redirect to `/hajimede?callbackUrl=...`
  - Confirm `/api/*` calls are NOT redirected (they pass through with the user's session)

- [ ] **Step 4: Verify normal flow**

  - Log in as a user with a nickname already set
  - Navigate to `/dashboard`, `/read/[bookId]` → no redirect to `/hajimede`
