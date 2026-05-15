## Why

舊版前端直接呼叫 AWS SDK（暴露 Account ID、S3 bucket），採用已棄用的 Facebook 登入，無法在 Server 端保護敏感憑證，且程式碼架構難以維護。現以 Next.js 15 App Router + Server Actions 全面重寫，修正安全問題，並提升閱讀體驗至「Film Diary」的溫暖風格。

## What Changes

- **全架構重寫**：從舊架構遷移至 Next.js 15 App Router，前後端合一，移除所有前端直接呼叫 AWS SDK 的程式碼
- **認證系統替換**：移除 Facebook 登入，改用 Google OAuth + LINE Login（NextAuth.js v5）
- **資料庫遷移**：從 DynamoDB 改用 MongoDB Atlas（Mongoose ODM），schema 支援巢狀文件結構
- **檔案上傳安全化**：S3 Presigned URL 流程由 Server 端簽發，AWS 憑證完全不進 client bundle
- **媒體元件重建**：照片輪播（4:3 容器）、影片播放（16:9 容器）、Lightbox 全螢幕預覽
- **讀者體驗新增**：Share token 機制、TOC 元件、cross-device 已讀追蹤
- **視覺重設計**：Film Diary 風格（暖白底色、Polaroid 邊框感、Framer Motion scroll-triggered 動畫）
- **移除功能**：~~YouTube 播放清單~~、~~Webcam 拍照~~、~~Facebook 登入~~、~~前端直接呼叫 AWS SDK~~

## Capabilities

### New Capabilities

- `auth`: Google OAuth + LINE Login（NextAuth.js v5），User schema 含 role（admin/reader）
- `book-management`: Admin CRUD books（標題、描述、封面圖），發布與 share token 產生
- `page-editor`: Admin 新增/排序/刪除頁面，媒體選擇（carousel/video）+ Markdown 文字編輯
- `media-upload`: S3 Presigned URL 簽發流程，照片/影片上傳，S3 路徑結構管理
- `reader-view`: Share link 驗證、Film Diary 閱讀介面、垂直捲動分頁閱讀
- `read-progress`: Intersection Observer 自動標記已讀，Server 端儲存，TOC 進度顯示
- `media-display`: 照片輪播元件（4:3）、影片播放元件（16:9）、Lightbox 全螢幕預覽

### Modified Capabilities

（無現有 spec，全部為新建）

## Impact

- **新增依賴**：`next@15`, `next-auth@5`, `mongoose`, `zod`, `@aws-sdk/s3-request-presigner`, `framer-motion`, `shadcn/ui`, `tailwindcss`
- **需設定第三方服務**：Google Cloud Console OAuth、LINE Developers Login Channel、MongoDB Atlas cluster、AWS S3 bucket + IAM user + CloudFront
- **部署平台**：Vercel（Next.js 官方平台）
- **環境變數**：`MONGODB_URI`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `LINE_CLIENT_ID/SECRET`, `AWS_*`, `AWS_S3_BUCKET`
