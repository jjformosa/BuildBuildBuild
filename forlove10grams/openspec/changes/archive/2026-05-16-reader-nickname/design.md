## Context

forlove10grams 是單一 creator 的私密記憶本工具。作者希望在 page content 裡能用讀者的名字稱呼對方，增加親密感。需要：(1) 讓讀者首次登入時自行填入暱稱；(2) 在 read page 渲染時替換文案中的 slot。

現有 `IUser` 無任何暱稱欄位；auth redirect 固定導向 `/dashboard`。

## Goals / Non-Goals

**Goals:**
- 新增 `User.nickname` / `User.myNickname` 欄位
- 首次登入（`nickname === null`）redirect 到 `/hajimede`
- Page content 中的 `${Nickname}` / `${MyNickname}` 在 read page 正確替換
- Hajimede 頁面讓讀者填入暱稱（無 myNickname UI，作者直接設定 DB）

**Non-Goals:**
- myNickname 的管理 UI
- 讓讀者主動修改暱稱的入口（技術上可行，但本次不提供連結）
- Hajimede 頁面展示 myNickname（維持隱藏）

## Decisions

### 1. `null` vs `undefined` 表示「從未到過 hajimede」

`User.nickname: string | null`，schema 預設 `null`。

- `null` → 從未設定，觸發 hajimede redirect
- `""` 空字串 → 曾到過但選擇跳過，不再 redirect
- 非空字串 → 已設定暱稱

**Alternative considered:** 獨立 `hasSeenHajimede: boolean` flag — 多一個欄位且語意重複，捨棄。

### 2. Session 帶 `nicknameIsSet` 給 middleware 用

Middleware 跑在 Edge runtime，無法直接讀 MongoDB。解法：在 `auth.ts` session callback 加入 `nicknameIsSet: boolean`（`user.nickname !== null`），middleware 只看 session token，不碰 DB。

使用 NextAuth v5 database session：nickname 存入 DB 後，下一個 page load 的 session callback 會重新讀取 `user.nickname`，自動更新 `nicknameIsSet`，**不需要強制 session refresh**。

### 3. Slot 替換在 client side 做

Read page 的 content 有兩條路徑：(1) server 預載的前 5 頁，(2) 懶加載 API (`/api/books/[bookId]/pages`)。

- Server side 替換需要在兩個地方重複邏輯（page.tsx + API route）
- Client side 只需在 `ReadPageClient` 接收 `viewerNickname / viewerMyNickname` props，用純函式 `resolveSlots(content, nick, myNick)` 在 `<ReactMarkdown>` 前處理

`app/read/[bookId]/page.tsx` 從 DB 載入 viewer 的 User，取得兩個欄位後傳給 client。

**Alternative considered:** Server side 替換 — 需在 page.tsx 和 API route 兩處維護，捨棄。

### 4. Hajimede redirect 用 middleware，保留 callbackUrl

`middleware.ts` 攔截所有保護路由（排除 `/login`, `/hajimede`, `/api/auth/**`, `/_next/**`），若 `session.user.nicknameIsSet === false` 則 redirect 到 `/hajimede?callbackUrl=<原始路徑>`。

Hajimede 頁面送出後 redirect 到 `callbackUrl ?? '/dashboard'`。

### 5. Hajimede 頁面文案策略

使用無 myNickname 版本（不展示作者設定的稱呼）：

```
嗨，謝謝你來

我可以怎麼稱呼你？
[input — placeholder 使用第三方登入取得的 name，無則留白]

（空白也沒關係，之後只要知道網址就可以再來修改）
                                     [進入 →]
```

暱稱頁可重複訪問（直接前往 `/hajimede`），但 app 內不提供任何引導連結。

## Risks / Trade-offs

- **Session 延遲更新**：若使用者在 hajimede 提交後網路中斷，下次進入仍會被 redirect 回 hajimede（無害，重填即可）。
- **myNickname 需手動設定 DB**：早期操作繁瑣，但 scope 內可接受。
- **Slot syntax 與 Markdown 衝突**：`${}` 不是標準 Markdown 語法，ReactMarkdown 不會特殊處理，直接 string replace 安全。若 content 包含真正的 `${}` JS template literal 意圖，會誤替換——作者知情，可接受。
