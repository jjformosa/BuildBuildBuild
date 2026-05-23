# Share Link Expiry — Design Spec

**Date:** 2026-05-24
**Branch:** feature-editor-management

---

## 目標

為 `shareStatus === 'shared'` 的書本分享連結加入七天有效期，對齊原 reader-invite 設計的三個原則：

1. **連結恆不變** — 延長時效時 token 不換，URL 不變
2. **七天有效** — 建立或延長時 `expiresAt = now + 7 days`
3. **可延長時效** — 呼叫 POST 重置 `expiresAt`，不產生新連結

`shareStatus === 'public'` 的書本不受限制（`expiresAt = null`）。

---

## 存取行為

- 過期只影響 `/share/<token>` 入口（新讀者無法透過連結進入）
- `book.shareStatus` 不因到期自動改變
- 已知 `/read/<bookId>` 的讀者仍可繼續閱讀（`shareStatus` 維持 `'shared'`）
- 真正撤銷讀取權的唯一方式：DELETE share → shareStatus → `'private'`

---

## Section 1：資料模型

### `lib/models/share.ts`

新增欄位：

```typescript
expiresAt?: Date  // null = 無限期（public）；有值 = 到期時間
```

完整 interface：

```typescript
export interface IShare extends Document {
  bookId: Types.ObjectId
  token: string
  createdBy: Types.ObjectId
  active: boolean
  expiresAt?: Date | null
}
```

Schema：

```typescript
expiresAt: { type: Date, default: null },
```

**有效性條件：**

```
valid = active === true
     && (expiresAt == null || expiresAt > now)
```

`active` 表示「未被撤銷」；`expiresAt` 控制時效。兩者獨立，client 根據兩者組合判斷顯示狀態。

---

## Section 2：API

### `POST /api/books/[bookId]/share` — 改為 upsert

```
expiresAt = book.shareStatus === 'public' ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

if 已有 active share (Share.findOne({ bookId, active: true })):
  Share.updateOne({ _id: share._id }, { $set: { expiresAt } })
  // token 不變，連結 URL 不變
else:
  await Share.create({ bookId, token: nanoid(12), createdBy, active: true, expiresAt })
  book.shareStatus = 'shared'  // 若原本是 'private'
  await book.save()

return { token, shareUrl: `${origin}/share/${token}`, expiresAt }
```

`ShareButton` 的「分享 & 複製讀者連結」行為不變，語意升級為「建立或延長 & 複製」。

### `GET /api/books/[bookId]/share` — 加 `expiresAt`

```typescript
// 有連結
return Response.json({
  active: true,
  token: share.token,
  shareUrl: `${origin}/share/${share.token}`,
  createdAt: share.createdAt,
  expiresAt: share.expiresAt ?? null,  // 新增
})

// 無連結
return Response.json({ active: false })
```

API 不在伺服器端判斷是否過期，`isExpired` 由 client 計算：

```typescript
const isExpired = expiresAt != null && new Date(expiresAt) < new Date()
```

### `DELETE /api/books/[bookId]/share` — 不變

行為維持：`active: false`，`book.shareStatus = 'private'`。

### `/share/<token>` page — 加過期判斷

```typescript
const share = await Share.findOne({ token, active: true })

if (!share) {
  // 顯示「連結無效或已過期」（現有訊息不變）
}

if (share.expiresAt != null && share.expiresAt < new Date()) {
  // 顯示「連結已到期」
}

// 有效 → 檢查 book → redirect /read/<bookId>
```

---

## Section 3：ShareLinkManager UI

### ShareState 型別更新

```typescript
interface ShareState {
  active: boolean
  shareUrl: string | null
  createdAt: string | null
  expiresAt: string | null  // 新增
}
```

Client 計算：

```typescript
const isExpired = !!share.expiresAt && new Date(share.expiresAt) < new Date()
const daysLeft = share.expiresAt
  ? Math.ceil((new Date(share.expiresAt).getTime() - Date.now()) / 86400000)
  : null
```

### 三種顯示狀態

**① `active: false` — 無連結**

現有行為不變，顯示「目前沒有分享連結」。建立由 header `ShareButton` 負責。

**② `active: true && !isExpired` — 有效連結**

現有 URL input + 複製 + 撤銷按鈕不變，新增：

```tsx
// 到期資訊
{share.expiresAt
  ? <p className="text-xs text-[#2C1810]/50">{daysLeft} 天後到期</p>
  : <p className="text-xs text-[#2C1810]/50">永久有效</p>
}

// 延長按鈕
<button onClick={handleExtend} disabled={actionLoading}>
  延長七天
</button>
```

**③ `active: true && isExpired` — 已過期**

```tsx
<p className="text-xs text-amber-600">連結已到期</p>

// 不顯示 URL input（過期連結不應被複製）

<button onClick={handleExtend} disabled={actionLoading}>
  延長七天
</button>

<button onClick={handleRevoke} disabled={actionLoading}>
  撤銷
</button>
```

### `handleExtend`

```typescript
async function handleExtend() {
  setActionLoading(true)
  setError('')
  try {
    const res = await fetch(`/api/books/${bookId}/share`, { method: 'POST' })
    if (!res.ok) throw new Error('延長失敗')
    const data = await res.json()
    setShare((prev) => ({
      ...prev!,
      active: true,
      shareUrl: data.shareUrl,
      expiresAt: data.expiresAt ?? null,
    }))
  } catch (err) {
    setError(err instanceof Error ? err.message : '延長失敗')
  } finally {
    setActionLoading(false)
  }
}
```

---

## File Map

### 修改（4 個檔案）

| 檔案 | 變更 |
|------|------|
| `lib/models/share.ts` | 加 `expiresAt?: Date \| null` |
| `app/api/books/[bookId]/share/route.ts` | POST 改 upsert；GET 加 expiresAt |
| `app/share/[token]/page.tsx` | 加 expiresAt 過期判斷 |
| `components/share-link-manager.tsx` | ShareState 加 expiresAt；三種狀態 UI；handleExtend |
