## Why

這個工具是寫給特定的人看的——知道連結的人就是受邀者。hajimede 頁面讓讀者留下自己的暱稱，讓作者在文案裡可以用 `${Nickname}` 或 `${MyNickname}` 直接稱呼讀者，讓私密記憶本多了一份只有你們兩個才懂的親密感。

## What Changes

- **新增** `User.nickname` 欄位：讀者填入希望被稱呼的名字（可為空字串，代表曾到過 hajimede 並選擇跳過）
- **新增** `User.myNickname` 欄位：作者私下為這位讀者設定的稱呼（直接在 DB 設定，本次不提供 UI）
- **新增** `/hajimede` 頁面：首次登入（`nickname === null`）時，redirect 到此頁讓讀者設定暱稱
- **新增** Slot 替換機制：page content 中的 `${Nickname}` 與 `${MyNickname}` 在 read page 被替換為當前讀者的稱呼
- **修改** Auth redirect 邏輯：登入後，`nickname === null` 的使用者先導向 `/hajimede`，而非直接前往 dashboard 或目標頁

## Capabilities

### New Capabilities

- `reader-nickname`: Hajimede 初次登入暱稱設定頁，以及 page content 中的 slot 替換邏輯

### Modified Capabilities

- `auth`: 首次登入 redirect 行為改變——`nickname === null` 的使用者先到 `/hajimede`，再前往原目標頁

## Impact

- `lib/models/user.ts`：新增 `nickname`, `myNickname` 欄位
- `types/next-auth.d.ts`：session 型別擴充 `nicknameIsSet`
- `auth.ts`：session callback 加入 `nicknameIsSet`
- 新增 `app/hajimede/page.tsx` 與對應 API route
- `components/read-page-client.tsx`：接收 viewer nickname 並做 slot 替換
- `app/read/[bookId]/page.tsx`：從 session/DB 取得 viewer 的 nickname 傳給 client
- 新增 `middleware.ts`：攔截登入後的保護路由，若 `nicknameIsSet === false` 則 redirect to `/hajimede`
