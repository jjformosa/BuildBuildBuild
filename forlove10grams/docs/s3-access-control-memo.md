# S3 / CloudFront 存取控制備忘

> 目標：讓 S3 資源只有授權帳戶能讀取，而不是任何知道 URL 的人都能存取。
>
> **狀態：已完成（2026-05-30）**

---

## 最終實作

兩種媒體用不同機制保護，原因在於路徑到瀏覽器的方式不同：

| 媒體 | 機制 | 原因 |
|------|------|------|
| 圖片（carousel）| **CloudFront Signed URL**（query param 簽章，canned policy） | next/image 是 server-side fetch，無法帶 cookie；URL query param 簽章不受此限 |
| 影片 HLS（.m3u8 + .ts）| **CloudFront Signed Cookie**（custom policy，wildcard URL） | hls.js 直接在瀏覽器 fetch，cookie 跟著每個 segment 自動送出 |

兩者都需要 CloudFront 對應路徑啟用「Restrict Viewer Access」；IAM user 保留 S3 直讀權限，供 next/image server fetch 使用。

---

## 原始分析（設計階段）

- S3 bucket 搭配 CloudFront CDN，原本 CloudFront URL 是公開的
- **寫入**：已有保護（presigned PutObject URL 只有通過 `canEditBook()` 才拿得到）
- **讀取**：無保護，知道 CloudFront URL 就能讀

→ 首要目標：HLS 影片（全部 segment URL 暴露在 client）。圖片次之（next/image 已有 session 把關但 URL 仍可被直接存取）。

---

## AWS 設定（已完成）

1. **S3 Block Public Access**：確認 bucket 已關閉公開存取
2. **CloudFront OAC（Origin Access Control）**：
   - CloudFront OAC 已設定，S3 bucket policy 允許 OAC principal 的 `s3:GetObject`
   - IAM user（`AWS_ACCESS_KEY_ID`）保留 `s3:GetObject`，供 next/image server-side fetch 使用
3. **CloudFront Key Group**：
   - RSA 2048-bit key pair 已產生，Public key 上傳至 CloudFront
   - Key Pair ID：`KKMT4QYPYOE5W`，Key Group：`forlove10grams-key-group`
   - Private key 存入環境變數（`CLOUDFRONT_PRIVATE_KEY`、`CLOUDFRONT_KEY_PAIR_ID`）
4. **CloudFront Distribution Behaviors**（`media-keep-album.tsaipanmwws.name`）：
   - `/books/*/pages/*/video-hls/*` → Restrict Viewer Access：Trusted Key Groups
   - `/books/*/pages/*/carousel/*` → Restrict Viewer Access：Trusted Key Groups
5. **自訂網域**：
   - 使用 `media-keep-album.tsaipanmwws.name`（直接子網域），而非 `media.keep-album.tsaipanmwws.name`
   - 原因：`keep-album.tsaipanmwws.name` 的 CAA 記錄不含 `amazon.com`；直接子網域繼承 `tsaipanmwws.name` 的 CAA（含 `amazon.com`），同時可使用既有 `*.tsaipanmwws.name` 萬用憑證

---

## Next.js 程式碼（已完成）

### 影片：Signed Cookie

**`app/api/books/[bookId]/read-token/route.ts`**

- 驗 session + `canReadBook()`
- 使用 `@aws-sdk/cloudfront-signer` 的 `getSignedCookies`，帶入明確的 `policy` JSON（custom policy，wildcard：`${CLOUDFRONT_MEDIA_URL}/books/${bookId}/*`）
- 有效期 4 小時
- Set-Cookie 三個 header：`CloudFront-Policy`、`CloudFront-Signature`、`CloudFront-Key-Pair-Id`
- Cookie 設定：`HttpOnly; Secure; SameSite=None; Path=/; Domain=.tsaipanmwws.name`（共享父域，讓 keep-album app 與 media CF domain 都能用）

**`components/read-page-client.tsx`**

- mount 時 fetch `read-token` API，`tokenReady` state 設為 true 後才初始化 hls.js

**`components/video-player.tsx`**

```ts
new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = true } })
```

### 圖片：Signed URL

**`lib/sign-media.ts`**

- 使用 `@aws-sdk/cloudfront-signer` 的 `getSignedUrl`（canned policy）
- expiry 對齊下一個 UTC 午夜（stable expiry），讓 next/image 快取有效命中（相同 URL = 快取 hit）
- 環境變數缺失時 fallback 回原始 URL（graceful degradation）

**`app/read/[bookId]/page.tsx`** 與 **`app/api/books/[bookId]/pages/route.ts`**

- carousel 頁的 `mediaUrls` 在回傳前一律 `p.mediaUrls.map(signImageUrl)`

### 環境變數

```
CLOUDFRONT_MEDIA_URL=https://media-keep-album.tsaipanmwws.name
CLOUDFRONT_KEY_PAIR_ID=KKMT4QYPYOE5W
CLOUDFRONT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
CLOUDFRONT_COOKIE_DOMAIN=.tsaipanmwws.name
```

> `CLOUDFRONT_PRIVATE_KEY` 存入時換行以 `\n` 表示（單行字串），`sign-media.ts` 與 `read-token/route.ts` 讀取時再 `.replace(/\\n/g, '\n')` 還原。

### 套件

```
npm install @aws-sdk/cloudfront-signer
```

---

## 已解決的設計問題

| 問題 | 解法 |
|------|------|
| next/image 無法帶 cookie → Signed Cookie 對圖片無效 | 改用 Signed URL（query param），server 簽好後直接給 next/image |
| Signed URL 每次不同 → next/image 快取失效 | stable expiry 對齊 UTC 午夜，同一天內同一圖片 URL 相同 |
| 圖片 MongoDB ObjectID URL 夠隨機不怕猜測嗎 | ObjectID 有 96 bit entropy，隨機猜中機率可忽略；Signed URL 防的是「知道 URL 的人繞過 auth」 |
| Cookie domain 跨域（app domain ≠ media CF domain） | 兩者都是 `*.tsaipanmwws.name` 的子網域；設 `Domain=.tsaipanmwws.name` 共享 cookie |
| CAA 記錄導致 ACM 憑證申請失敗 | 改用直接子網域 `media-keep-album.tsaipanmwws.name`，繼承正確的 CAA |

---

## 未處理（已知）

- **封面圖**（`/books/*/cover*`）：目前未在 CloudFront behavior 中限制。封面僅在 dashboard 顯示，context 為已登入使用者，風險低；如需保護，補一條 behavior 並在封面讀取路徑加 `signImageUrl` 即可。
- **Editor 寫入**：presigned PutObject URL 機制已足夠，不需要改動。
