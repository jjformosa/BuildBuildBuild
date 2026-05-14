## 1. Phase 1 — 基礎骨架

- [x] 1.1 `create-next-app` 建立專案（TypeScript、Tailwind CSS、App Router）
- [x] 1.2 安裝並設定 shadcn/ui（暖色系 CSS variables：`--background: #FAF7F2`、`--foreground: #2C1810`）
- [x] 1.3 設定 Docker Compose（MongoDB 7 local）並確認連線（改用 MongoDB Atlas + X.509，連線已確認）
- [x] 1.4 建立 `lib/mongoose.ts`：MongoDB 連線 singleton，支援 `MONGODB_URI` 環境變數
- [x] 1.5 定義 Mongoose schemas：`User`、`Account`（NextAuth 欄位 + `role: 'admin' | 'customer'`；email optional + sparse unique index；cert 抽離至 `lib/cert.ts`；新增 `lib/mongodb-client.ts` 供 NextAuth Adapter 使用）
- [x] 1.6 安裝 NextAuth.js v5 並設定 `auth.ts`（Google Provider、MongoDB Adapter）
- [x] 1.7 建立 `app/api/auth/[...nextauth]/route.ts` 處理 OAuth 回調
- [x] 1.8 實作 session callback：將 `user.role`（admin | customer）注入 `session.user`（⚠ 同步完成 book-member-roles 4.1）
- [x] 1.9 建立 `/login` 頁面（Google 登入按鈕）
- [x] 1.10 建立 middleware：未登入跳轉 `/login`，customer 存取 admin 路由回傳 403（⚠ 同步完成 book-member-roles 4.2）
- [x] 1.11 實作 `POST /api/books/[bookId]/invite`：admin 邀請 customer 為 editor（book-member-roles 5.1）
- [x] 1.12 新增「邀請編輯者」UI 入口（Book 編輯器頂部，admin 專屬）（book-member-roles 5.2）

## 2. Phase 2 — 內容管理

- [x] 2.1 定義 Mongoose schemas：`Book`（含 `editorId`，已建）、`Page`、`Share`
- [x] 2.2 建立 `/dashboard` 頁面（Server Component）：查詢並列出當前 admin 的 books
- [x] 2.3 實作 `POST /api/books`：建立 book（驗證 admin role、Zod schema 驗證）
- [x] 2.4 實作 `GET /api/books/[bookId]`、`PATCH /api/books/[bookId]`、`DELETE /api/books/[bookId]`（含擁有者驗證）
- [x] 2.5 建立 `/books/[bookId]/edit` 頁面：左側 page 列表 + 右側 page 編輯器骨架
- [x] 2.6 實作 `POST /api/books/[bookId]/pages`：新增 page（選擇 carousel/video 類型）
- [x] 2.7 實作 `PATCH /api/books/[bookId]/pages/[pageId]`、`DELETE /api/books/[bookId]/pages/[pageId]`
- [x] 2.8 實作拖曳排序（dnd-kit）：更新 `books.pageOrder`
- [x] 2.9 Markdown 編輯器（react-md-editor 或 @uiw/react-md-editor）：輸入 + 即時預覽
- [x] 2.10 實作 `POST /api/upload/presign`：Server 端簽發 S3 Presigned PUT URL（驗證 admin + book 擁有權）
- [x] 2.11 實作 Client 端上傳元件：進度條 + 直接 PUT 至 S3 + 完成後呼叫 Server Action 儲存 URL
- [x] 2.12 實作 `POST /api/books/[bookId]/share`：產生 share token，寫入 `shares` collection
- [x] 2.13 新增「發布 & 複製連結」UI（Book 編輯器頂部）

## 3. Phase 3 — 閱讀體驗

- [x] 3.1 定義 Mongoose schema：`ReadProgress`（compound unique index: userId + bookId + pageId）
- [x] 3.2 實作 `GET /api/share/[token]`：驗證 token，回傳 bookId
- [x] 3.3 建立 `/share/[token]` route handler：驗證 token 後 redirect 至 `/read/[bookId]`（未登入先存 token 再跳 `/login`）
- [ ] 3.4 建立 `/read/[bookId]` 頁面：Film Diary 視覺佈局（暖白底色、深褐文字）
- [ ] 3.5 實作 TOC 元件：桌機左側固定欄 + 手機底部 bottom sheet
- [ ] 3.6 實作 `GET /api/progress?bookId=`：查詢已讀 pageId 清單
- [ ] 3.7 實作 `POST /api/progress`：upsert 已讀記錄（驗證身份 + book 存取權）
- [ ] 3.8 實作 Intersection Observer hook（`useReadProgress`）：進入視野觸發已讀，樂觀更新 + API 失敗回滾
- [ ] 3.9 加入 LINE Login Provider（NextAuth v5 自訂 provider），設定 LINE Developers callback URL
- [ ] 3.10 登入頁新增 LINE Login 按鈕

## 4. Phase 3 — 媒體展示元件

- [ ] 4.1 實作 Carousel 元件：4:3 容器、`object-fit: contain`、Polaroid 邊框、圓點指示器、手機滑動 / 桌機箭頭
- [ ] 4.2 實作 Video 元件：16:9 容器、HTML5 video、Intersection Observer 自動暫停
- [ ] 4.3 實作 Lightbox 元件：深色遮罩、原始比例圖片、左右切換、ESC / 點擊遮罩 / 下滑關閉
- [ ] 4.4 實作媒體 skeleton 佔位元素（載入中）與錯誤佔位圖

## 5. Phase 4 — 精修與部署

- [ ] 5.1 RWD 調整：手機（375px）、平板（768px）、桌機（1024px+）三個 breakpoint 完整測試
- [ ] 5.2 加入 Framer Motion：每個 Page 元件的 scroll-triggered 淡入動畫（y: 20→0, opacity: 0→1）
- [ ] 5.3 設定 AWS CloudFront distribution，媒體 URL 改用 CloudFront domain
- [ ] 5.4 設定 AWS Amplify：連接 GitHub repo，設定所有環境變數，確認 Next.js SSR 部署
- [ ] 5.5 設定 Google Cloud Console OAuth callback URL（production domain）
- [ ] 5.6 設定 LINE Developers callback URL（production domain）
- [ ] 5.7 建立 `.env.local.example` 列出所有必要環境變數（不含實際值）
- [ ] 5.8 完整 E2E 測試：Admin 建立 book → 上傳媒體 → 發布 → 讀者透過 share link 閱讀 → 已讀追蹤
