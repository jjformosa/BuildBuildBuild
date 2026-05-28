# S3 / CloudFront 存取控制備忘

> 目標：讓 S3 資源只有授權帳戶能讀取，而不是任何知道 URL 的人都能存取。

---

## 現況

- S3 bucket 搭配 CloudFront CDN，目前 CloudFront URL 是公開的
- **寫入**：已有保護（presigned PutObject URL 只有通過 `canEditBook()` 才拿得到）
- **讀取**：無保護，知道 CloudFront URL 就能讀

## 媒體類型分析

| 媒體 | 到達瀏覽器的路徑 | 風險 |
|------|----------------|------|
| 圖片（carousel、封面）| 瀏覽器 → `/_next/image` → Next.js server fetch → 瀏覽器 | **低**：CF URL 不直接到瀏覽器，next/image 已有 session 把關 |
| 影片 HLS（.m3u8 + .ts）| hls.js 直接 fetch CloudFront | **高**：所有 segment URL 都在 client，完全公開 |

→ **首要目標**：保護 HLS 影片。圖片次之（next/image 已有一定程度的保護）。

---

## 選定方案：CloudFront Signed Cookies

### 為什麼選這個

- 不需要對每個 resource 個別簽章（不需要改 DB 結構或 URL）
- HLS 串流天然運作：cookie 跟著每個 `.ts` segment 請求自動發出
- CloudFront 內建功能，無額外 AWS 費用

### 方案不選的原因

| 方案 | 放棄原因 |
|------|---------|
| Presigned URL per resource | HLS m3u8 playlist 內的 segment URL 需全部重寫並簽章，非常複雜 |
| Next.js API Proxy | 所有頻寬走 server，失去 CDN，影片串流延遲高、成本高 |

---

## 需要做的事情

### AWS 設定（一次性）

1. **S3 Block Public Access**：確認 bucket 已關閉公開存取（通常已設定）
2. **CloudFront OAC（Origin Access Control）**：
   - 在 CloudFront 建立 OAC，取代舊的 OAI（如有）
   - 更新 S3 bucket policy，允許 CloudFront OAC principal 的 `s3:GetObject`
   - **保留** IAM user（`AWS_ACCESS_KEY_ID`）的 `s3:GetObject` 權限，供 next/image server-side fetch 使用
3. **CloudFront Key Group**：
   - 產生 RSA 2048-bit key pair（`openssl genrsa 2048`）
   - Public key 上傳至 CloudFront → 建立 Key Group
   - Private key 存入環境變數（`CLOUDFRONT_PRIVATE_KEY`、`CLOUDFRONT_KEY_PAIR_ID`）
4. **CloudFront Distribution 設定**：
   - 對影片路徑（`/books/*/pages/*/video-hls/*`）啟用「Restrict Viewer Access」→ Trusted Key Groups
   - 圖片路徑（`/books/*/pages/*/carousel/*`、`/books/*/cover*`）**暫時不限制**（next/image 已保護）

### Next.js 程式碼

1. **新增 API endpoint**：`GET /api/books/[bookId]/read-token`
   - 驗 session + `canReadBook()`
   - 使用 `@aws-sdk/cloudfront-signer` 產生 signed cookie
   - Cookie policy：`Resource: https://<CF_DOMAIN>/books/<bookId>/*`，有效期 4 小時
   - `Set-Cookie` 三個 header：`CloudFront-Policy`、`CloudFront-Signature`、`CloudFront-Key-Pair-Id`
   - Cookie 設定：`HttpOnly; Secure; SameSite=None; Path=/`

2. **Read page**：頁面載入時呼叫 read-token API，cookie 設好後再初始化 hls.js

3. **hls.js config**：
   ```ts
   new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = true } })
   ```

4. **環境變數新增**：
   ```
   CLOUDFRONT_PRIVATE_KEY=<RSA private key PEM>
   CLOUDFRONT_KEY_PAIR_ID=<CloudFront key pair ID>
   ```

### 套件

```
npm install @aws-sdk/cloudfront-signer
```

---

## 後續考慮（未決）

- **圖片是否也要鎖**：目前 next/image 保護了大多數情境，但直接知道 CF URL 的人還是能讀。若要完全鎖，可對所有路徑都啟用 Signed Cookie，但需要確認 next/image server-side fetch 的行為（需要讓 server 用 IAM 直接讀 S3，而不是走 CloudFront）。
- **Cookie SameSite**：若 CloudFront domain 與 Next.js domain 不同（subdomain），需要確認 `SameSite=None` 搭配 HTTPS 是否在所有瀏覽器正常運作。
- **Editor 寫入**：目前 presigned PutObject URL 機制已足夠，暫不需要改動。
