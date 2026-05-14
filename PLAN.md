# For Love10Grams — 重寫計畫書

> **版本**：v0.1 — 2026-05-14  
> **狀態**：設計確認，待實作  
> **實作環境**：WSL / Docker

---

## 一、專案定位

**For Love10Grams** 是一個**私人圖文記憶書平台**。

Admin 建立並上傳內容（文字 + 照片輪播 / 影片），透過分享連結將記憶書送給讀者。讀者登入後可閱讀、追蹤進度。本質接近私人 photo blog，核心價值在於溫暖的閱讀體驗。

**設計原則**：越簡單越好，不為假想的擴充需求過度設計。

---

## 二、技術棧

| 層級 | 技術 | 備註 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | 前後端合一，Server Actions |
| 語言 | TypeScript | 全端型別安全 |
| UI | React 19 + Tailwind CSS + shadcn/ui | |
| 動畫 | Framer Motion | scroll-triggered，取代舊 animate.css |
| 認證 | NextAuth.js v5 | Google OAuth + LINE Login |
| 資料庫 | MongoDB Atlas | Mongoose ODM + Zod 驗證 |
| 檔案儲存 | Amazon S3 + CloudFront | Presigned URL 上傳，AWS 憑證不進前端 |
| 部署 | AWS Amplify | 支援 Next.js SSR，與 S3 同生態 |

### 為什麼選 MongoDB Atlas 而非 DynamoDB

舊版直接在前端呼叫 DynamoDB，是最嚴重的安全問題。新版改由 Next.js Server 端操作。

選 MongoDB 的原因：記憶書資料天然是巢狀文件結構（book → pages → mediaBlock），MongoDB document model 比 DynamoDB key-value 更直觀，schema 可自由演化，本地開發也更簡單（Docker 起一個 mongo 即可）。

---

## 三、資料模型

### MongoDB Collections

```typescript
// users  —  NextAuth base + 自訂欄位
{
  _id: ObjectId
  email: string         // 跨 provider 的主要 key
  name: string
  image: string
  role: 'admin' | 'reader'
  tenantId?: ObjectId   // 保留多租戶，MVP 可 null
  createdAt: Date
}

// accounts  —  NextAuth 自動管理（多 provider 綁定）
{
  userId: ObjectId      // → users._id
  provider: 'google' | 'line'
  providerAccountId: string
  // ... NextAuth 標準欄位
}

// sessions, verificationTokens  —  NextAuth 自動管理

// books
{
  _id: ObjectId
  tenantId?: ObjectId
  title: string
  description?: string
  coverImageUrl?: string    // S3 URL
  createdBy: ObjectId       // admin user._id
  pageOrder: ObjectId[]     // 維護頁面順序
  isPublished: boolean
  createdAt: Date
}

// pages
{
  _id: ObjectId
  bookId: ObjectId
  title: string
  order: number
  mediaBlock: {
    type: 'carousel' | 'video'
    items: string[]           // S3 URLs（carousel: 多張；video: 單一 .mp4）
  }
  textBlock: {
    content: string           // Markdown
  }
  createdAt: Date
}

// readProgress  —  compound unique index: (userId, bookId, pageId)
{
  _id: ObjectId
  userId: ObjectId
  bookId: ObjectId
  pageId: ObjectId
  readAt: Date
}

// shares
{
  _id: ObjectId
  bookId: ObjectId
  token: string               // URL-safe random string，unique
  createdBy: ObjectId         // admin user._id
  expiresAt?: Date
  createdAt: Date
}
```

### S3 路徑結構

```
s3://{bucket}/
  books/
    {bookId}/
      cover.jpg
      pages/
        {pageId}/
          carousel/
            image-1.jpg
            image-2.jpg
          video.mp4
```

> 多租戶時在最外層加 `tenants/{tenantId}/`

---

## 四、功能清單

### MVP 範圍

| 功能 | 說明 |
|------|------|
| Google / LINE 登入 | NextAuth.js v5 雙 Provider |
| 身份綁定（預留） | UI 暫不實作，schema 已支援 |
| Admin 建立 / 編輯 book | 標題、描述、封面圖 |
| Admin 管理 pages | 新增/排序/刪除頁面 |
| 媒體上傳 | 照片（輪播）或影片（單部），S3 Presigned URL |
| 文字編輯 | Markdown 輸入，即時預覽 |
| 發布與分享 | 產生 share token，生成可分享連結 |
| 讀者閱讀 | 透過 share link 登入後閱讀 |
| 目錄（TOC） | 顯示所有頁面標題與已讀進度 |
| 已讀 / 未讀追蹤 | 伺服器端記錄，跨裝置同步 |

### 保留但暫不做

- 多租戶管理介面（schema 已預留 `tenantId`）
- 身份綁定設定頁
- 分享連結到期設定

### 移除（相比舊版）

- ~~YouTube 播放清單~~（當初只是背景音樂用）
- ~~Webcam 拍照~~（改為標準檔案上傳）
- ~~Facebook 登入~~
- ~~前端直接呼叫 AWS SDK~~

---

## 五、用戶流程

### Admin

```
登入（Google / LINE）
→ Dashboard：看所有 books
→ 建立 book（標題、描述、封面）
→ 進入 book editor
→ 新增 page：選擇媒體類型（carousel / video）→ 上傳檔案 → 輸入文字
→ 拖曳排序頁面
→ 發布 → 產生 share token
→ 複製分享連結
```

### 讀者

```
收到 share link：https://app.com/share/{token}
→ 未登入 → 跳轉登入頁（Google / LINE）
→ 登入後自動取得 reader 身分，綁定 token 對應的 book
→ 進入 book 閱讀頁
→ 左側（桌機）/ 底部抽屜（手機）：TOC，顯示各頁標題與已讀標記
→ 垂直捲動閱讀，每頁 = 媒體區塊 + 文字區塊
→ 已讀自動記錄（進入頁面視野即標記）
```

---

## 六、視覺設計方向

**風格定義**：Film Diary — 「打開一封私人信件慢慢讀」

| 元素 | 決策 |
|------|------|
| 色調 | 暖白 / 奶茶 (#FAF7F2) 底色，深褐 (#2C1810) 文字 |
| 照片 | 微 Polaroid 邊框感，soft vignette，`object-fit: contain` |
| 字型 | 本文：清晰 sans-serif；標題/引言：手寫風 serif 點綴 |
| 動畫 | scroll-triggered 淡入（Framer Motion），無彈跳 |
| 留白 | 章節間大留白，呼吸感優先 |

### 頁面佈局（手機直向，375px）

採用**堆疊式**（方案 A）：媒體在上，文字在下，自然垂直捲動。

```
┌──────────────────────┐
│ ← 第3章  ○ ○ ● ○ →  │  頁面導覽列
├──────────────────────┤
│  ┌────────────────┐  │
│  │                │  │  照片輪播
│  │   Photo 2/3    │  │  固定 4:3 比例容器
│  │                │  │  object-fit: contain
│  └────────────────┘  │  橫向照片兩側填暖色
│       ○ ● ○          │  輪播點指示
├──────────────────────┤
│ 頁面標題              │
│ ─────────────────    │
│ 文字區塊，長度不限，   │
│ 自然向下展開。         │
│                      │
│    ▼ 下一頁           │
└──────────────────────┘
```

**媒體比例規則**：
- 照片輪播：**4:3** 容器（大多數手機照片的原生比例）
- 影片：**16:9** 容器
- 照片點擊：全版面 lightbox，展示原始比例

---

## 七、API 路由設計

```
/api/auth/[...nextauth]     — NextAuth 處理所有 OAuth 流程

/api/books                  GET  (admin) 列出自己的 books
                            POST (admin) 建立新 book

/api/books/[bookId]         GET  取得 book 詳情（需權限）
                            PATCH (admin) 更新 book
                            DELETE (admin) 刪除 book

/api/books/[bookId]/pages   GET  取得所有 pages（含 order）
                            POST (admin) 新增 page

/api/books/[bookId]/pages/[pageId]
                            PATCH (admin) 更新 page
                            DELETE (admin) 刪除 page

/api/books/[bookId]/share   POST (admin) 產生 / 更新 share token

/api/share/[token]          GET  驗證 token，取得對應 bookId

/api/upload/presign         POST 取得 S3 Presigned URL（需 admin）

/api/progress               POST 標記頁面已讀
                            GET  取得某 book 的已讀清單
```

---

## 八、開發路線圖

### Phase 1 — 基礎骨架（約 1 週）
- [ ] `create-next-app` + TypeScript + Tailwind + shadcn/ui 設定
- [ ] MongoDB Atlas 連線（Mongoose 設定）
- [ ] NextAuth.js v5 + Google Provider（LINE 之後加）
- [ ] 基本 User schema + role 設定

### Phase 2 — 內容管理（約 2 週）
- [ ] Admin dashboard（book 列表）
- [ ] Book 建立 / 編輯
- [ ] Page 編輯器（媒體 + 文字）
- [ ] S3 Presigned URL 上傳流程
- [ ] 照片輪播元件
- [ ] 影片播放元件

### Phase 3 — 閱讀體驗（約 1.5 週）
- [ ] Share token 產生與驗證
- [ ] 讀者閱讀頁面（Film Diary 視覺）
- [ ] TOC 元件
- [ ] 已讀 / 未讀追蹤
- [ ] LINE Login 加入

### Phase 4 — 精修（約 1 週）
- [ ] RWD 調整（桌機 / 平板 / 手機）
- [ ] Framer Motion 動畫
- [ ] Lightbox
- [ ] CloudFront CDN 設定
- [ ] AWS Amplify 部署

---

## 九、環境設定備忘

### 本地開發所需服務

```bash
# MongoDB（Docker）
docker run -d -p 27017:27017 --name mongo mongo:7

# 環境變數（.env.local）
MONGODB_URI=mongodb://localhost:27017/forlove10grams
NEXTAUTH_SECRET=<random-32-char>
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

LINE_CLIENT_ID=...
LINE_CLIENT_SECRET=...

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

### 第三方設定清單

- [ ] Google Cloud Console → OAuth 2.0 Client，加入 `http://localhost:3000/api/auth/callback/google`
- [ ] LINE Developers → LINE Login Channel，加入 callback URL
- [ ] MongoDB Atlas → 建立 cluster，取得 connection string
- [ ] AWS → 建立 S3 bucket，IAM user（只有 S3 權限），CloudFront distribution

---

## 十、安全性備忘

舊版直接在前端暴露的資訊（**新版這些都不應該出現在 client bundle**）：

- AWS Account ID / IAM Role ARN → 改由 Server 端 IAM Role 處理
- S3 bucket name → 只在 Server Action / API Route 中使用
- OAuth App ID → `NEXT_PUBLIC_` 前綴才會進前端，一律不加

上傳流程：
```
Client 請求 Presigned URL（帶認證）
→ Server 驗證身份 → 向 AWS 要 Presigned URL → 回傳給 Client
→ Client 直接 PUT 到 S3（不經過 Server，不佔頻寬）
→ 上傳完成 → Client 通知 Server 儲存 S3 URL 到 MongoDB
```
