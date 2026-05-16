## 1. Data Model

- [x] 1.1 `lib/models/user.ts`：`IUser` 新增 `nickname: string | null` 與 `myNickname: string | null`，schema 預設均為 `null`
- [x] 1.2 `types/next-auth.d.ts`：`User` interface 新增 `nickname?: string | null`；`Session.user` 新增 `nicknameIsSet: boolean`
- [x] 1.3 `auth.ts` session callback：加入 `session.user.nicknameIsSet = user.nickname !== null && user.nickname !== undefined`

## 2. API

- [x] 2.1 建立 `app/api/user/nickname/route.ts`：`PATCH` endpoint，讀取 body `{ nickname: string }`，更新當前 session user 的 `User.nickname`，回傳 200

## 3. Middleware

- [ ] 3.1 建立 `middleware.ts`：攔截保護路由（排除 `/login`, `/hajimede`, `/api/auth/**`, `/_next/**`, `/favicon.ico`）；若 session 存在且 `nicknameIsSet === false`，redirect 到 `/hajimede?callbackUrl=<request.nextUrl.pathname>`；未登入者照常 redirect `/login`

## 4. Hajimede 頁面

- [ ] 4.1 建立 `app/hajimede/page.tsx`：server component，從 session 取得 `user.name` 作為 placeholder 傳給 client
- [ ] 4.2 建立 `components/hajimede-client.tsx`：client component，包含暱稱輸入框（placeholder = session name 或空白）、送出後呼叫 `PATCH /api/user/nickname`，完成後 redirect 到 `callbackUrl ?? '/dashboard'`
- [ ] 4.3 Hajimede 頁面文案與 layout：依照 design.md 設計（暖色調，與現有 app 風格一致）

## 5. Read Page Slot 替換

- [ ] 5.1 建立 `lib/resolve-slots.ts`：純函式 `resolveSlots(content: string, nickname: string | null, myNickname: string | null): string`，實作 `${Nickname}` 與 `${MyNickname}` 替換規則
- [ ] 5.2 `app/read/[bookId]/page.tsx`：從 DB 載入 viewer 的 `User`（`nickname`, `myNickname`），傳入 `ReadPageClient` 作為 `viewerNickname` / `viewerMyNickname` props
- [ ] 5.3 `components/read-page-client.tsx`：接收 `viewerNickname` / `viewerMyNickname` props，在每個 page 的 `page.content` 傳入 `<ReactMarkdown>` 前先呼叫 `resolveSlots`
