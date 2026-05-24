# 功能建議 Backlog

> 這份文件記錄已識別但尚未實作的功能想法，以及已發現的程式缺口。
> 不是 roadmap，不代表一定要做，只是讓下次討論有地方開始。

---

## 高優先（已在 product-brief 確認）

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

### 手機上傳體驗

**問題**：目前的媒體上傳流程未針對手機優化（相機直拍、多選、壓縮）。

**方向**：`<input type="file" accept="image/*" capture="environment">` 直接開啟相機，多檔上傳支援，上傳前 client-side 壓縮。

---

## 技術改善（不影響功能，但值得處理）

### ~~`next/image` 的 S3 `remotePatterns` 設定~~ ✅ 已完成

`next.config.ts` 已設定 `remotePatterns`，全站 `<img>` 已替換為 `<Image>`，取得自動 WebP 轉換和 resize。已合併至 `feature-hls-ande-next-image`。

### ~~Dashboard 書本排序 / 篩選~~ ✅ 已完成

排序（新→舊、舊→新、A→Z）、篩選（全部、已分享、草稿）、封面圖傳遞至前端。已合併至 `refactor-2026-with-claude`。
