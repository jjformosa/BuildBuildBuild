## Context

For Love10Grams 是私人圖文記憶書平台。舊版在 client 端直接呼叫 AWS SDK，暴露 IAM 憑證與 S3 bucket 名稱；登入僅用已棄用的 Facebook；資料庫選用 DynamoDB 但巢狀媒體結構難以查詢。

新版全面重寫，以 Next.js 15 App Router 為核心，所有敏感操作移至 Server 端，採 MongoDB document model 更直觀地表達 book → page → mediaBlock 的巢狀結構。

開發環境：WSL + Docker（MongoDB local）。部署：Vercel（Next.js 官方平台，App Router SSR 完整支援）。

## Goals / Non-Goals

**Goals:**
- 修正所有前端洩漏 AWS 憑證的安全問題
- 建立完整的 admin 內容管理流程（建立 book、編輯 pages、上傳媒體、發布分享）
- 提供「Film Diary」溫暖閱讀體驗（scroll-triggered 動畫、Polaroid 風格、TOC 進度追蹤）
- 跨裝置同步已讀狀態
- 支援 Google OAuth + LINE Login

**Non-Goals:**
- 多租戶管理 UI（schema 預留 `tenantId` 但 MVP 不實作）
- 帳號跨 provider 身份綁定 UI
- 分享連結到期時間設定 UI
- 即時通知或多人協作

## Decisions

### 1. Next.js 15 App Router + Server Actions

**決策**：使用 App Router，API 路由保留給外部需要的 RESTful endpoint（NextAuth、Presign），其他 mutation 改用 Server Actions。

**理由**：Server Actions 直接在元件內呼叫，減少 boilerplate；App Router 的 RSC（React Server Components）讓資料讀取在 server 端完成，不需要額外的 API route。

**替代方案考慮**：Pages Router（熟悉但不支援 RSC，遷移成本更高）。

### 2. MongoDB Atlas + Mongoose ODM

**決策**：使用 MongoDB 而非 DynamoDB（舊版）。

**理由**：記憶書的資料天然是巢狀文件（book → pages → mediaBlock），MongoDB document model 比 DynamoDB key-value 更直觀，不需要額外 access patterns 設計。Mongoose 提供 schema 驗證，本地開發只需 `docker run mongo`。

**替代方案考慮**：PostgreSQL（relational 對巢狀 JSON 不友善）；DynamoDB（延續舊版，但巢狀查詢需 scan，且 local 開發較複雜）。

### 3. S3 Presigned URL 上傳流程

**決策**：Client 向 `/api/upload/presign` 請求簽名 URL，AWS SDK 只在 Server 端使用，Presigned URL 限時（15 分鐘）且指定 Content-Type。

**流程**：
```
Client → POST /api/upload/presign（帶認證 token + 檔案 metadata）
       → Server 驗證身份 + 產生 Presigned PUT URL
       → Client 直接 PUT 到 S3
       → Client → POST /api/books/[id]/pages/[id]（儲存 S3 URL 到 MongoDB）
```

**理由**：AWS 憑證完全不進 client bundle；上傳不佔 Server 頻寬。

### 4. NextAuth.js v5 + MongoDB Adapter

**決策**：使用 NextAuth.js v5（與 App Router 原生相容），搭配 MongoDB Adapter 自動管理 `accounts`、`sessions`、`verificationTokens` collections。

**User schema 擴充**：NextAuth 基礎欄位 + 自訂 `role`（admin/reader）+ `tenantId`（預留）。新 User 預設 `role: 'reader'`；第一個登入用戶或手動設定為 `admin`。

### 5. 頁面路由設計

```
/ (app/page.tsx)                   → redirect to /login or /dashboard
/login                             → Google / LINE 登入頁
/dashboard                         → Admin：book 列表
/books/[bookId]/edit               → Admin：book 編輯器（含 pages）
/read/[bookId]                     → 讀者：閱讀頁（需 book 存取權）
/share/[token]                     → 接受 share link，驗證後 redirect 到 /read/[bookId]
```

### 6. 已讀追蹤：Intersection Observer

**決策**：每個 page 元件用 `IntersectionObserver`（threshold: 0.5）偵測進入視野，觸發一次 `POST /api/progress`。Client 端先樂觀更新（localStorage cache），Server 端用 `upsert` 防重複寫入。

**理由**：無需使用者手動點擊，閱讀體驗自然；compound unique index `(userId, bookId, pageId)` 保證冪等。

### 7. 視覺設計系統

- 色彩：`--bg: #FAF7F2`（暖白）、`--text: #2C1810`（深褐）定義為 CSS custom properties
- Tailwind 擴充自訂色彩 token
- shadcn/ui 為 UI 基礎元件，風格覆寫為暖色系
- Framer Motion：`useInView` + `motion.div` 實作 scroll-triggered 淡入（y: 20px → 0, opacity: 0 → 1）

## Risks / Trade-offs

- **NextAuth.js v5 相對新**：API 與 v4 有差異，文件仍在演進。→ 鎖定版本，遵循官方 App Router migration guide
- **MongoDB Atlas free tier 限制**：512MB 儲存、連線數有上限。→ MVP 足夠；production 視需求升級 M10
- **Presigned URL 時效**：15 分鐘過期，大檔案上傳可能超時。→ 大檔案分段或延長 expiry；MVP 先設 15 分鐘
- **LINE Login 回調 URL 需 HTTPS**：本地開發需用 ngrok 或 Amplify preview URL 測試。→ Phase 3 再加入，Phase 1-2 先用 Google
- **Vercel 免費方案限制**：Hobby plan 有 Serverless Function 執行時間上限（10s）與頻寬限制。→ MVP 足夠；production 視流量需求升級 Pro

## Migration Plan

此為全新專案，無現有資料需遷移。

1. `create-next-app` 建立新專案
2. 設定 Docker MongoDB（local）
3. 設定 NextAuth.js v5 + Google Provider（LINE Phase 3 加入）
4. 依照 Phase 1-4 路線圖逐步開發
5. 部署：Vercel 連接 GitHub repo，設定環境變數，每次 push 自動部署

## Open Questions

- Admin 帳號管理：MVP 直接在 MongoDB 手動設定第一個 admin，或要有簡易的 role 升級介面？
- Presigned URL 的 S3 路徑：上傳前需先有 `pageId`（MongoDB `_id`），需確認建立 page 文件與取得 Presign URL 的順序
- CloudFront 分發設定：開發期間直接用 S3 URL，CloudFront 在 Phase 4 才設定
