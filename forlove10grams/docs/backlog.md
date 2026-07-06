# 功能建議 Backlog

> 這份文件記錄已識別但尚未實作的功能想法，以及已發現的程式缺口。
> 不是 roadmap，不代表一定要做，只是讓下次討論有地方開始。

---

## 高優先（已在 product-brief 確認）
### 如果有需要恢復session做修正 claude --resume 4cbd5cd1-eeb8-4054-b8ec-d083e3b85d56
### 快速記錄入口

**問題**：建書流程太重。結束一頓飯或一次潛水後，使用者需要：建書 → 填標題 → 新增頁面 → 選類型 → 才能上傳。這個摩擦足以讓人放棄。

**方向**：一個大按鈕直接進入「新的一頁」，書名可以事後補。預設開啟相機或相簿，文字是輔助。

---

## 程式缺口（功能已設計但 UI 缺失）

### ~~編輯者管理介面~~ ✅ 已完成

**原問題**：只有 `InviteEditorButton`（邀請），沒有查看 / 移除 editor 的管理 UI。

**實際實作**：編輯頁新增 editor row，顯示目前 editor 名稱 + 「移除編輯者」按鈕，呼叫 `DELETE /api/books/[bookId]/editor`。Dashboard owner 書本卡片亦顯示 editor 名稱。已合併至 `refactor-2026-with-claude`。

### `myNickname` 設定介面

**問題**：`User.myNickname` 欄位存在，`resolveSlots` 也已處理 `${MyNickname}`，但目前沒有任何頁面讓 creator 從 UI 設定「我怎麼稱呼自己」。只能靠直接改 DB。

**方向**：在 `/hajimede` 或個人設定頁加入 `myNickname` 輸入欄位，對應 `PUT /api/user/nickname`（或新增欄位）。

---

## 中優先（待討論中已列出）

### ~~輕量版已讀回執~~ ✅ 已完成

**原問題**：Creator 不知道朋友有沒有讀了自己寫的書。

**實際實作**：以 like 系統取代純閱讀計數。Reader 在閱讀頁末可按讚；dashboard 書本卡片顯示 `♡ N`，讓 creator 得知有人讀完並有所回應。Reader 的 shared books 清單也以 CheckCircle / Circle badge 反映自己的已讀狀態。`ReadProgress` collection 持續記錄逐頁閱讀進度供底層使用。已合併至 `refactor-2026-with-claude`。

### ~~書籍搜尋~~ ✅ 已完成

依標題關鍵字搜尋（server-side `$regex`），搜尋模式與排序篩選互斥，cursor 分頁 limit 10。已合併至 `refactor-2026-with-claude`。

### ~~撤銷 / 管理分享連結~~ ✅ 已完成

**原問題**：目前只能「產生連結」，但無法查看有哪些連結是活的、什麼時候產生的，也無法讓特定連結失效。

**實際實作**：以 `shareStatus` enum 取代 `book.published` boolean。`ShareLinkManager` 元件在編輯頁顯示目前的分享連結（URL、建立日期、撤銷按鈕）。`ShareStatusContext` 協調 `ShareButton`（header，載入前 disabled）與 `ShareLinkManager`（底部，mount 後 lazy fetch）的狀態。新增 `GET /api/books/[bookId]/share`（查詢連結）和 `DELETE /api/books/[bookId]/share`（撤銷）。已合併至 `refactor-2026-with-claude`。

### ~~分享連結時效管理~~ ✅ 已完成

**原問題**：分享連結永久有效，無法設定時效或在不換 URL 的前提下延長。

**實際實作**：`shared` 書本的分享連結新增 7 天有效期（`Share.expiresAt`）。POST 改為 upsert — 已有有效連結時只更新 `expiresAt`，token 不變（URL 恆不變）。`ShareLinkManager` 顯示「N 天後到期」/ 「連結已到期」，提供「延長七天」按鈕。`public` 書本不受時限（`expiresAt = null`）。已合併至 `refactor-2026-with-claude`。

### ~~Editor 分享權限 + Dashboard 整合~~ ✅ 已完成

**原問題**：Editor 無法操作分享連結；Dashboard 沒有 editor 角色的書本列表。

**實際實作**：編輯頁的 `ShareButton` 和 `ShareLinkManager` 對 editor 開放。Dashboard 新增「謝謝你，與我回憶」section，editor 書本以 `BookCard role='editor'` 渲染（「閱讀 / 編輯 ✎」雙按鈕，無全卡片 link）。`DashboardShell` 統一管理搜尋 state，owner 和 editor 兩個列表共享同一個搜尋輸入。`ReadProgress` 取代 `BookReader`，讀者存取改為純 `shareStatus` 判斷。已合併至 `refactor-2026-with-claude`。

---

## 體驗改善

### ~~Dashboard 編輯者導向調整~~ ✅ 已完成

**原問題**：editor 從 dashboard 點書時目前進入 edit 頁，若要讓交接信自然出現在 read 頁末尾，應改為導向 `/read/[bookId]`，讓 editor 先滑過書本內容再進入編輯。

**實際實作**：Editor 書本卡片改為「閱讀」/ 「編輯 ✎」雙按鈕（無全卡片 link），分別導向 `/read/[bookId]` 和 `/books/[bookId]/edit`，讓 editor 自行選擇入口。

### ~~「把書交給她」的儀式感~~ ✅ 已完成

**原問題**：邀請 editor 的流程目前是純技術性操作（填 email）。沒有任何儀式感。

**實際實作**：Creator 邀請 editor 時可附上一段「交接信」（`editorLetter`）。Editor 閱讀至書末最後一頁時，`HandoverLetter` 元件顯示「creatorName 想對你說」與留言內容（italic 引號格式），並附「進入編輯 →」連結導向編輯頁。

### ~~Reader 追蹤與管理~~ ✅ 已完成

**原問題**：Creator / editor 無法得知誰透過分享連結讀了書，也無法移除個別讀者。

**實際實作**：引入 `BookReader` model，讀者跟隨有效分享連結後被 upsert 記錄。管理者可在編輯頁透過 `ReaderList` 元件查看讀者清單（頭像、暱稱）並移除個別讀者，後端新增 `GET /api/books/[bookId]/readers` 及 `DELETE /api/books/[bookId]/readers/[userId]`。已合併至 `improve-ux`。

### ~~全屏圖片瀏覽~~ ✅ 已完成

**原問題**：圖片點擊後的 lightbox（`yet-another-react-lightbox`）在手機上未佔滿畫面，左右箭頭不明顯。

**實際實作**：以自訂 `FullscreenGallery` 元件取代 `yet-another-react-lightbox`，純 CSS fixed overlay 黑底全屏，支援左右箭頭（首末張自動隱藏）、dot indicators、觸控 swipe、鍵盤 Escape / ← / →、圖片載入 pulse placeholder。移除 `yet-another-react-lightbox` 套件。已合併至 `improve-ux`。

### ~~手機上傳體驗~~ ✅ 已完成

**原問題**：目前的媒體上傳流程未針對手機優化（相機直拍、多選、壓縮）。

**實際實作**：`MediaUploader` 的單一上傳按鈕拆成「拍照／拍攝影片」（`capture="environment"`，直接開相機）與「相簿／選擇影片」（原行為，多選）兩個按鈕，圖片與影片頁皆適用；多選與 client-side 壓縮原本就已具備，不需額外處理。上傳中的百分比文字改顯示在進度條旁，不再擠在按鈕上。順帶拿掉 `QuickCaptureBar` 的「影片」入口（只留「照片」「文字」），因為實際錄影動作仍要到編輯頁才發生，這個按鈕沒有帶來額外速度。已合併至 `refactor-2026-with-claude`。

**詳細設計**：[docs/superpowers/specs/2026-07-03-mobile-upload-experience-design.md](superpowers/specs/2026-07-03-mobile-upload-experience-design.md)

---

## 新功能方向（2026-05-28 探索）

### ~~頁面日期 / 時間軸~~ ✅ 部分完成

**原問題**：頁面沒有「這件事發生在什麼時候」的欄位，但記憶本的本質是時間性的。

**實際實作**：`Page` 新增 `happenedAt`（optional，完整日期）欄位，編輯頁頂部列（頁型徽章旁）可設定/清除，選了立即儲存（不經過 debounce）。已合併至 `refactor-2026-with-claude`。

**尚未做**：書封面時間範圍顯示、「N 年前的今天」功能——這兩項當初就決定留到 `happenedAt` 資料開始累積後再做，詳見設計文件的「後續演進」。

**詳細設計**：[docs/superpowers/specs/2026-07-03-page-happened-at-design.md](superpowers/specs/2026-07-03-page-happened-at-design.md)

---

### 語音備忘錄頁面

**問題**：文字需要打字，照片需要構圖，語音只需要開口——但目前沒有音訊頁面類型。

**方向**：新增 `audio` 頁面類型。瀏覽器 `MediaRecorder API` 錄音，存入 S3。可選：接 Whisper API 自動轉錄文字。最符合「捕捉優先於整理」精神，尤其適合手還濕著的潛水上岸場景。

**詳細設計**：[docs/superpowers/specs/2026-07-07-audio-page-design.md](superpowers/specs/2026-07-07-audio-page-design.md)（規劃完成，待實作）

---

### PDF / 匯出實體書

**問題**：產品比喻是「一本書」，但它只存在於螢幕上。無法印出來送給朋友。

**方向**：讀者或 creator 可從閱讀頁下載 PDF。版型保留書頁感（封面圖、每頁對應一頁）。技術選型：`@react-pdf/renderer` 或 `puppeteer` headless print。讓「把書交給她」的比喻在實體世界也能成立。

---

### 書本系列 / 收藏夾

**問題**：和同一個朋友有十次潛水經歷，Dashboard 就有十本散落的書，難以整理。

**方向**：新增 `Collection`（收藏夾）概念，多對多關聯 `Collection ↔ Book`。純個人整理工具，不影響分享機制。例如「和 Yuki 的潛水」收藏夾包含歷年的書。

**詳細設計**：[docs/superpowers/specs/2026-07-07-book-collection-design.md](superpowers/specs/2026-07-07-book-collection-design.md)（規劃完成，待實作）

---

### 閱讀結束體驗（最後一頁設計）

**問題**：閱讀結束的那一刻目前只有 Like 和 HandoverLetter，設計最薄，但情感上最重要。

**方向**（三個互斥選項，已選定 **Reader 私訊**）：
- **微動畫**：最後一頁滑完後出現「書本合起來」的視覺確認感
- **Reader 私訊** ✅ 選定：讀完可留一句話給 creator（不公開，creator 在 dashboard 看到）；打破 Like 匿名性，但帶來情感回應
- **無需改動**：保持現狀，現有 Like + HandoverLetter 已足夠

**詳細設計**：[docs/superpowers/specs/2026-07-07-reader-message-design.md](superpowers/specs/2026-07-07-reader-message-design.md)（規劃完成，待實作）

---

## 體驗實驗（待選型）

### 閱讀頁換頁動畫

**背景**：`/read/[bookId]` 以滾動為主要操作，目前每頁已有基本 `whileInView` 進場（opacity + translateY）。  
想在「頁與頁之間」加入更有儀式感的轉場，讓閱讀體驗更具沉浸感。

**已評估的三個方向**（sample HTML 放於 `docs/samples/`）：

| 選項 | 效果 | 檔案 | 備注 |
|------|------|------|------|
| **A — 聚光燈焦點** | 當前頁全亮，其他頁淡出 + 微縮（0.3 → 1.0 opacity，scale 0.975 → 1） | `option-a-spotlight.html` | 已有 `activePageId`，實作成本最低 |
| **B — 分鏡進場** | 每頁進入視野時圖片先出現，文字 300ms 後跟進 | `option-b-stagger.html` | 需拆 article 子結構；一次性觸發 |
| **C — 景深模糊** | 非當前頁套 blur(3px)，當前頁對焦清晰 | `option-c-blur.html` | 最電影感；`filter: blur` 在低階手機需測效能 |

**推薦**：Option A 為主，搭配強化現有 whileInView 進場動畫（加 scale 0.97 → 1）。  
`activePageId` 已追蹤完畢，改動只需在 `motion.article` 加 `animate` prop。

---

## 技術改善（不影響功能，但值得處理）

### ~~S3 / CloudFront 存取控制~~ ✅ 已完成

**原問題**：CloudFront URL 公開，知道連結就能讀取媒體資源。影片（HLS）全部 segment URL 暴露在 client 端。

**實際實作**：影片以 CloudFront Signed Cookie（custom policy，wildcard `books/{bookId}/*`，4 小時有效）保護；圖片以 CloudFront Signed URL（canned policy，stable UTC 午夜 expiry）保護。兩者皆在 CloudFront behavior 啟用 Restrict Viewer Access，直接存取 CF URL 回傳 403。已合併至 `refactor-2026-with-claude`。

**詳細設計與實作決策**：[docs/s3-access-control-memo.md](s3-access-control-memo.md)

---

### ~~`next/image` 的 S3 `remotePatterns` 設定~~ ✅ 已完成

`next.config.ts` 已設定 `remotePatterns`，全站 `<img>` 已替換為 `<Image>`，取得自動 WebP 轉換和 resize。已合併至 `feature-hls-ande-next-image`。

### ~~Dashboard 書本排序 / 篩選~~ ✅ 已完成

排序（新→舊、舊→新、A→Z）、篩選（全部、已分享、草稿）、封面圖傳遞至前端。已合併至 `refactor-2026-with-claude`。
