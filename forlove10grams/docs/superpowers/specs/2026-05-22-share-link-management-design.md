# 分享連結管理 Design

**日期**：2026-05-22
**分支**：refactor-2026-with-claude

---

## 背景

目前 `ShareButton` 只能「產生 + 複製連結」，無法查看現有連結或撤銷。同時 `book.published`（boolean）承擔了分享狀態的職責，語意不清且與實際 share link 狀態脫鉤。本次改動一併解決這兩個問題。

---

## 範圍

1. `book.published` → `book.shareStatus`（string enum）
2. Share API 補 GET + DELETE，POST 移除 `book.published` 副作用
3. 新增 `ShareLinkManager` 元件（編輯頁底部）
4. `ShareButton` 改文案 + 支援 disabled 狀態
5. `ShareStatusContext` 橋接 loading 狀態
6. Dashboard badge binding 改為 `shareStatus`

---

## 資料模型

### `book.shareStatus`

取代現有 `book.published: Boolean`。

```ts
shareStatus: {
  type: String,
  enum: ['private', 'shared', 'public'],
  default: 'private',
}
```

| 值 | Dashboard badge | 說明 |
|----|-----------------|------|
| `private` | 草稿 | 無 active share link |
| `shared` | 已分享 | 有 active share link |
| `public` | 公開 | 預留，未來功能 |

**Migration**：現有資料以 `published: true` → `shareStatus: 'shared'`，`published: false` → `shareStatus: 'private'` 轉換。

### `Share` collection（不變）

欄位：`bookId`, `token`, `createdBy`, `active`, `createdAt`, `updatedAt`。結構不動，語意依然是「一本書的 active share token 記錄」。

---

## API

### `GET /api/books/[bookId]/share`

回傳該書目前的 active share link。

**Response（有 active link）**：
```json
{
  "active": true,
  "token": "abc123",
  "shareUrl": "https://.../share/abc123",
  "createdAt": "2026-05-22T..."
}
```

**Response（無 active link）**：
```json
{ "active": false }
```

### `POST /api/books/[bookId]/share`（改動）

行為不變（deactivate 舊的，建新的，回傳 shareUrl）。移除 `book.published = true`，改為 `book.shareStatus = 'shared'`。

### `DELETE /api/books/[bookId]/share`（新增）

將該書所有 active share 設為 `active: false`，並將 `book.shareStatus` 設為 `'private'`。回傳 `204 No Content`。

---

## 元件設計

### `ShareStatusContext`

```ts
type ShareStatusContextValue = {
  isLoaded: boolean
  setLoaded: () => void
}
```

Client component `ShareStatusProvider` 包住編輯頁中需要共享狀態的區塊。`ShareButton` 讀取 `isLoaded`，`ShareLinkManager` fetch 完成後呼叫 `setLoaded()`。

### `ShareButton`（改動）

- 文案：`'分享 & 複製讀者連結'`（loading 中仍顯示原文案）
- 狀態：從 `ShareStatusContext` 讀 `isLoaded`，`false` 時 `disabled`
- 功能不變：POST → 複製 URL → 文字短暫變「✓ 已複製連結」

### `ShareLinkManager`（新增）

`components/share-link-manager.tsx`，client component。

**Mount 行為**：
1. `GET /api/books/[bookId]/share`
2. 完成後呼叫 `setLoaded()`

**有 active link 狀態**：
- 區塊標題：「分享連結」
- Readonly input 顯示 shareUrl + 複製按鈕
- 建立時間：`建立於 YYYY/MM/DD`
- 撤銷按鈕（紅色邊框）：呼叫 DELETE，成功後切換到無連結狀態

**無 active link 狀態**：
- 顯示「目前沒有分享連結」文字
- 不提供產生入口（由 header 的 ShareButton 負責）

---

## 編輯頁（`app/books/[bookId]/edit/page.tsx`）

```
<ShareStatusProvider>
  <header>
    ...
    <ShareButton bookId={bookId} />   ← 讀取 context
    ...
  </header>
  ...
  <section>
    <InviteLinkManager bookId={bookId} />
    <ShareLinkManager bookId={bookId} />  ← 寫入 context
  </section>
</ShareStatusProvider>
```

`ShareStatusProvider` 是 client component，包住 header 的 sharing 相關部分與底部 section。

---

## Dashboard

`DashboardBook` type 的 `published: boolean` 改為 `shareStatus: 'private' | 'shared' | 'public'`。

Badge 判斷：
```ts
shareStatus === 'shared' ? '已分享' : '草稿'
```

Dashboard 篩選器的「已分享 / 草稿」條件對應改為 `shareStatus`。

---

## Access Control 異動

`book.published` 目前在以下地方作為讀取權限判斷，需一併更新為 `book.shareStatus !== 'private'`（即 `shared` 或 `public`）：

| 檔案 | 用途 |
|------|------|
| `app/api/share/[token]/route.ts` | share link 讀取時確認書是否可讀 |
| `app/share/[token]/page.tsx` | share 頁面讀取 gate |
| `app/api/books/[bookId]/pages/route.ts` | reader 取得頁面的存取檢查 |
| `app/api/books/[bookId]/like/route.ts` | like 的存取檢查 |
| `app/api/progress/route.ts` | 讀取進度寫入的存取檢查 |
| `app/read/[bookId]/page.tsx` | 閱讀頁面讀取 gate |

---

## Migration 策略

部署時以 one-off script 更新既有文件：

```js
await Book.updateMany({ published: true }, { shareStatus: 'shared' })
await Book.updateMany({ published: false }, { shareStatus: 'private' })
```

`published` 欄位在 schema 移除後，MongoDB 文件中的殘留欄位不影響讀取，可在日後以 `$unset` 清理。

---

## 不在本次範圍

- `book.shareStatus = 'public'` 的實際功能
- Dashboard badge lazy loading（仍為 SSR，直接讀 `shareStatus`）
- 編輯者管理介面（已記錄至 backlog）
