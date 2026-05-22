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

### 編輯者管理介面

**問題**：目前只有 `InviteEditorButton`（邀請），沒有「查看目前編輯者 / 移除編輯者」的管理 UI。`book.editorId` 只存一位 editor，無法從 UI 解除或替換。

**方向**：在編輯頁加入 editor 管理區塊，顯示目前 editor 名稱 + 移除按鈕，對應 `DELETE /api/books/[bookId]/editor`（待建）。

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

### 撤銷 / 管理分享連結

**問題**：目前只能「產生連結」，但無法查看有哪些連結是活的、什麼時候產生的，也無法讓特定連結失效。

**方向**：在編輯頁加入「目前的分享連結」列表，每條有建立時間和撤銷按鈕。`shares.active` 欄位已存在。

---

## 體驗改善

### 「把書交給她」的儀式感

**問題**：邀請 editor 的流程目前是純技術性操作（填 email）。沒有任何儀式感。

**方向**：Creator 邀請時可附上一段「交接信」。Editor 第一次進入書時，看到的不是直接跳進 dashboard，而是先看到這段話。

### 手機上傳體驗

**問題**：目前的媒體上傳流程未針對手機優化（相機直拍、多選、壓縮）。

**方向**：`<input type="file" accept="image/*" capture="environment">` 直接開啟相機，多檔上傳支援，上傳前 client-side 壓縮。

---

## 技術改善（不影響功能，但值得處理）

### ~~`next/image` 的 S3 `remotePatterns` 設定~~ ✅ 已完成

`next.config.ts` 已設定 `remotePatterns`，全站 `<img>` 已替換為 `<Image>`，取得自動 WebP 轉換和 resize。已合併至 `feature-hls-ande-next-image`。

### ~~Dashboard 書本排序 / 篩選~~ ✅ 已完成

排序（新→舊、舊→新、A→Z）、篩選（全部、已分享、草稿）、封面圖傳遞至前端。已合併至 `refactor-2026-with-claude`。
