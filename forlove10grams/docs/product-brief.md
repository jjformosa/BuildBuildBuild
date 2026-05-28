# Product Brief — forlove10grams

## 一句話定位

一本可以傳遞的私密記憶本：你記錄、邀請參與的朋友共同寫入、以連結形式分享給知道的人。

---

## 背景與動機

這個專案來自 9 年前的一個實踐：為每一位參與某段共同經歷的朋友各寫一本書，記錄那段時光，再把書「交給」她，讓她繼續寫她自己的視角和心得。

現在的 forlove10grams 是這個概念的數位化延伸，同時也是作者練習 AI 輔助開發工作流程（Claude Code）的實驗場域。

---

## 核心使用情境

### 情境一：純個人記錄
你一個人記錄一段經歷（潛水、一頓飯、一次散步、食譜測試），附上照片和影片，存起來給自己看，或選擇不分享。

### 情境二：傳遞給參與的朋友
你為參與某段共同經歷的朋友寫了一本書，記錄你的視角。  
然後把書「交給」她（邀請她為 editor），讓她繼續補充她的記憶、她的心得。

### 情境三：以連結分享
書完成後，你（或 editor）產生一個分享連結，傳給知道這段故事的人。  
沒有公開頁面，沒有搜尋，只有知道連結的人才能讀。

---

## 角色定義

| 角色 | 描述 | 可以做什麼 |
|------|------|-----------|
| **Creator** | 建立書本的人（通常是作者本人） | 建立、編輯、邀請 editor（附交接信）、產生 / 撤銷 / 延長分享連結、查看與移除讀者、在 dashboard 看到 like 數、永遠保有完整存取權 |
| **Editor** | 受邀的共同協作者（參與那段經歷的朋友） | 繼續寫入內容、管理標籤、產生 / 撤銷 / 延長分享連結、查看與移除讀者；在書末可看到 creator 的交接信；不能移除 creator |
| **Reader** | 透過分享連結進入的讀者 | 閱讀；在書末可 Like；第一次透過分享連結進入後即被記錄，之後可從 dashboard 再次找到此書 |

### 所有權模型

書永遠屬於 creator。即使把書「交給」朋友（設定 editor），creator 仍保有完整存取與編輯權，且不可被 editor 排除。  
類比：這是 creator 的 blog，只是接受共同協作者。

---

## 分享機制

- 分享 = 產生一個不公開的 token 連結
- 知道連結的人才能讀（需登入）
- 沒有公開索引、沒有搜尋、沒有 feed
- Creator 和 Editor 都可以產生 / 撤銷 / 延長分享連結
- 連結預設 **7 天有效**，可延長（URL 不變，只更新到期時間）；到期或撤銷後連結失效
- 首次透過分享連結進入的讀者，系統自動建立讀者記錄；之後可從 dashboard 直接找到這本書
- Creator 和 Editor 可在編輯頁查看讀者名單、移除特定讀者（移除後讀者失去閱讀權限）
- 如果朋友願意把連結再傳出去，是歡迎的，但不是目標

---

## 已解決的痛點

### ~~2. 所有登入者的 Dashboard~~（2026-05-16 完成）

所有登入者（creator / editor / reader）登入後都可以在 dashboard 看到與自己有關的書，不再需要靠連結才能找到。

### ~~3. Editor 角色與書籍層級存取~~（2026-05-16 完成）

每位使用者（customer）可以被邀請成為特定書的 editor，擁有新增/編輯頁面與產生分享連結的權限，不影響 creator 的所有權。

### ~~4. 讀者暱稱設定與個人化內容~~（2026-05-16 完成）

新使用者首次登入後進入 `/hajimede`，可選擇性設定顯示名稱（nickname）。Creator 可在頁面內容中使用 `${Nickname}` / `${MyNickname}` 佔位符，讓內容在每位讀者閱讀時顯示其專屬稱呼。

### ~~7. 影片 HLS 串流轉檔 + next/image 最佳化~~（2026-05-19 完成）

上傳影片後自動透過 AWS MediaConvert 轉為 HLS 格式，支援 iPhone MOV/HEVC，跨瀏覽器播放（Chrome/Firefox 用 hls.js，Safari 原生）。前端顯示轉檔進度（pending → ready），轉檔完成後自動切換至播放器。全站圖片從 `<img>` 升級為 `<Image>`（next/image），取得 WebP 自動轉換與 size negotiation。

- **轉檔管道**：S3 upload → Lambda trigger → MediaConvert job → HLS → Lambda callback → webhook → DB 更新
- **next/image**：`remotePatterns` 動態讀取 `CLOUDFRONT_URL`/`S3_BUCKET_NAME`，Dashboard、Carousel、封面選擇器、上傳預覽全面升級

### ~~6. 書本標籤系統與 Modal 管理介面~~（2026-05-17 完成）

Creator 和 Editor 都可以為書本加上自由文字標籤，並透過標籤搜尋書本。

- **標籤庫（Tag Collection）**：記錄所有曾出現的標籤，新增時自動寫入；輸入框支援 AutoComplete 下拉
- **搜尋升級**：`GET /api/books?q=` 從只比對標題改為同時比對標題與標籤
- **TagManagerModal**：統一的標籤管理入口，從 Dashboard 卡片或書本編輯器側欄都可開啟；支援新增（含 AutoComplete）與刪除；等待 API 期間顯示「儲存中…」
- **權限對等**：Owner 和 Editor 都可從兩個入口管理標籤

### ~~5. 閱讀體驗改善~~（2026-05-16 完成）

- 頁面間插入 `· · ·` 分隔符，強化「翻頁感」
- 每頁最小高度 ≥75vh，製造視覺節奏
- 頁面內容以 infinite scroll 懶載入（首批 SSR，後續 client fetch）
- 桌機 TOC 即時高亮目前閱讀頁（active page indicator）

### ~~8. Book Like 功能~~（2026-05-21 完成）

讀者可在書末 Like 一本書；Creator 在 dashboard 書本卡片看到匿名 like 數（N=0 時不顯示）。

- **Like toggle**：書末顯示 🤍 → ❤️，支援取消；optimistic update
- **Creator 端**：dashboard 書卡顯示 `♡ N`，不揭露誰 like 了

### ~~9. 分享連結管理（shareStatus + ShareLinkManager）~~（2026-05-22 完成）

將 `book.published: Boolean` 重構為 `book.shareStatus: 'private' | 'shared' | 'public'` enum，並新增分享連結管理介面。

- **ShareLinkManager**：編輯頁底部可查看現有連結（URL、建立時間）、一鍵撤銷
- **ShareStatusContext**：協調 ShareButton 的 disabled 狀態，避免在連結狀態載入前誤操作
- **Dashboard badge**：依 `shareStatus` 顯示「已分享 / 草稿」

### ~~10. Editor 管理與交接信儀式~~（2026-05-23 完成）

邀請 editor 時必須附上一封交接信；editor 閱讀書末時會看到 creator 寫的信。Dashboard 新增 editor 資訊列與移除按鈕。

- **交接信（HandoverLetter）**：書末 Like 按鈕之後，editor 專屬區塊顯示「creator 想對你說」+ 信件內容 + 進入編輯的連結
- **邀請表單**：InviteEditorButton 新增必填的「交接信」textarea
- **Dashboard editor 列**：書卡底部顯示 `✎ editor 名稱（編輯中）` + 移除按鈕；creator 可直接從 dashboard 解除邀請

### ~~11. 角色權限重設計與 Dashboard 重構~~（2026-05-23 完成）

開放 Editor 也能管理分享連結；移除舊的 reader invite 系統；Dashboard 重構為 DashboardShell，搜尋欄橫跨 owner 和 editor 書單。

- **Editor 權限擴充**：Editor 可產生 / 撤銷分享連結，可看到 ShareLinkManager
- **移除 reader invite 系統**：BookInvite / BookReader（舊）模型、invite-link API、/invite/[token] 頁面全數移除；改以分享連結作為唯一閱讀入口
- **DashboardShell**：全域搜尋欄（debounced），owner books 和 editor books 共用同一個搜尋框；editor books 以獨立的 EditorBooksClient 呈現，每張卡片有「閱讀」和「編輯 ✎」兩個按鈕
- **BookCard role prop**：owner 卡點擊進編輯頁；editor 卡不整張可點，改用右側兩個按鈕

### ~~12. 全螢幕 Gallery~~（2026-05-24 完成）

移除 `yet-another-react-lightbox`，改用自訂 `FullscreenGallery` 元件，手機上真正佔滿畫面。

- **FullscreenGallery**：純 CSS fixed overlay，左右箭頭 + dot indicators，支援觸控 swipe 與鍵盤導航
- 移除第三方依賴，減少 bundle size

### ~~13. 分享連結到期管理~~（2026-05-24 完成）

Share 連結加上 7 天有效期，可延長（upsert — URL 不變，只更新 expiresAt）。

- **Share 模型**：新增 `expiresAt?: Date | null`
- **ShareLinkManager**：三態 UI（有效 / 到期 / 無連結）+ 「延長七天」按鈕 + 倒數天數顯示
- **share page**：過期連結顯示「連結已到期」，不再跳轉

### ~~14. 讀者追蹤與名單管理~~（2026-05-24 完成）

透過分享連結進入的讀者自動被記錄（BookReader model）；Manager 可在編輯頁查看讀者名單並移除讀者。

- **BookReader 模型**：記錄 `bookId + userId + joinedAt`，透過 share page upsert 寫入
- **Access control 升級**：`shared` 書的閱讀權限改為 BookReader 記錄判斷（而非 shareStatus 本身），移除後立即失去存取
- **ReaderList 元件**：編輯頁底部顯示讀者清單（顯示名稱 + 加入日期）+ 個別移除按鈕

---

## 確認的痛點（待解）

### 1. 快速記錄入口

**問題**：現在的建立流程太重。使用者剛結束一頓飯、一次潛水、一段散步，當下想記錄，但必須先建書 → 填標題 → 新增頁面 → 選類型 → 才能開始上傳或打字。這個摩擦足以讓人放棄。

**典型場景**：
- 在餐廳剛結束飯局，站在門口，手機掏出來想記一下今晚聊了什麼
- 潛水上岸，教練剛說完從影片看到的改善點，想馬上記下來
- 散步中有個念頭，不想讓它消失

**期待的體驗**：
- 最多兩步進入記錄狀態——例如點一個大按鈕，直接進入「新的一頁」，書名可以之後補
- 預設使用手機鏡頭或相簿，文字是輔助，不是前提
- 先記下來，整理是之後的事

**設計原則**：捕捉優先於整理。記錄的摩擦必須低於打開相簿 app 隨手拍的摩擦。

---

## 明確不做的事

- 公開搜尋或發現機制
- 社群功能（按讚、留言、追蹤）
- 推播通知
- 多人即時協作（不是 Google Docs）
- 商業化 / 多租戶 / 訂閱制

---

## 技術背景

- Next.js（App Router）
- MongoDB（資料儲存）
- NextAuth v5（Google / LINE OAuth）
- AWS S3（媒體儲存）+ CloudFront（CDN）
- AWS MediaConvert（影片轉 HLS）+ Lambda（觸發轉檔、回寫狀態）
- hls.js（跨瀏覽器 HLS 播放）
- 內容個人化：`${Nickname}` / `${MyNickname}` slot，於 read page client 端替換
- 作者的 AI 工具練習場域，使用 Claude Code 輔助開發
