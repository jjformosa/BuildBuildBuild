# 設計規格 — 手機上傳體驗

> 狀態：已確認，待實作
> 日期：2026-07-03

---

## 背景與目標

`docs/backlog.md`「手機上傳體驗」項目：目前的媒體上傳流程未針對手機優化。實際檢視 `components/media-uploader.tsx` 後發現，client-side 壓縮（`browser-image-compression`）與多檔選取（carousel 頁 `multiple`）已經做了，真正缺的是「直接開相機拍照/錄影」——目前唯一的上傳按鈕開啟的是系統檔案選擇器，使用者還要多點一次「拍照」或「相機」才能真正開始拍。

這與剛合併的「快速記錄入口」（[2026-06-19 設計](2026-06-19-quick-capture-entry-design.md)）同一條產品邏輯：捕捉優先於整理，尤其是潛完水、吃完飯上岸馬上想記錄的場景。該設計的「後續演進」也提到「支援直接從手機相機開始，但需另行處理瀏覽器 user gesture 限制」——本次設計就是把這件事做掉：透過明確的按鈕點擊（合法 user gesture）觸發 `capture` 屬性，而不是嘗試在頁面跳轉後自動開相機。

順帶處理第二件事：重新檢視「快速記錄入口」的範圍後，`QuickCaptureBar` 的「影片」按鈕在實務上沒有帶來額外速度——實際錄影動作仍要到編輯頁才發生，且影片還要等 HLS 轉檔（最長 10 分鐘輪詢），與「快速」的訴求矛盾，也在三個按鈕的選單裡多一個決策點。這次一併拿掉。

**本次包含：**
- `MediaUploader` 圖片與影片頁都改成「拍照/錄影」+「相簿選擇」兩個按鈕
- `QuickCaptureBar` 移除「影片」入口，只保留「照片」、「文字」

**不包含：**
- 上傳失敗自動重試機制
- 多檔上傳進度回饋（第 N / 共 M 張）
- 移除「影片」頁面類型本身（編輯頁仍可手動新增影片頁、上傳影片）
- 修改 `POST /api/books/quick`、`lib/quick-capture.ts` 的 mode 型別或後端驗證邏輯

---

## part 1：MediaUploader 拍照/相簿分開

### 現況

`components/media-uploader.tsx` 目前只有一個 hidden `<input type="file">`（`inputRef`），無 `capture` 屬性：

- 圖片頁（`fileType === 'carousel'`）：`accept="image/*"`、`multiple`
- 影片頁（`fileType === 'video'`）：`accept="video/mp4,video/quicktime,video/x-m4v"`、單檔

點擊按鈕後開啟的是系統檔案選擇器，手機瀏覽器通常會列出「拍照」、「相機」、「檔案」等選項，但需要使用者再選一次。

### 改動

拆成兩個獨立 hidden input，各自固定 `capture` 有無，不用動態切換屬性：

- `cameraInputRef`：與現有 `accept` 邏輯相同，額外加 `capture="environment"`，`multiple` 恆為 `false`（相機一次只能拍一張/錄一段，不受 `fileType` 影響）
- `galleryInputRef`：完全沿用現有行為（無 `capture`，`multiple` 依 `fileType` 決定）

兩者 `onChange` 都呼叫既有 `handleFiles`，壓縮、簽章上傳、轉檔輪詢等邏輯完全不動。

### UI

原本單一按鈕改成並排兩個，沿用 `btn-outline-xs` 樣式：

| fileType | 按鈕 1（camera） | 按鈕 2（gallery） |
|---|---|---|
| `carousel` | `+ 拍照` | `+ 相簿` |
| `video` | `+ 拍攝影片` | `+ 選擇影片` |

既有狀態邏輯（`atImageLimit`、`isTranscoding`、`progress !== null` 時 disabled）套用到兩個按鈕上，行為一致。

### 為什麼分成兩個 input 而不是動態切換 capture 屬性

單一 input 動態加/拿掉 `capture` 屬性，需要在使用者點擊「拍照」或「相簿」按鈕的當下先改 DOM 屬性，再觸發 `.click()`，這牽涉 React state 更新與 DOM 屬性寫入的時序，容易因為 re-render 時機不對而拿到舊屬性值。兩個固定屬性的 input 各自對應各自按鈕，行為在瀏覽器層級是穩定、可預期的。

---

## part 2：QuickCaptureBar 移除影片入口

### 現況

`components/quick-capture-bar.tsx` 的 `OPTIONS` 有三項：`photo`、`video`、`text`。`lib/quick-capture.ts` 的 `QUICK_CAPTURE_MODES`、`isQuickCaptureMode`、`pageTypeForQuickCaptureMode` 與 `app/api/books/quick/route.ts` 都以這三個 mode 運作。

### 改動

只改 `components/quick-capture-bar.tsx` 的 `OPTIONS`，移除 `video` 項，只留 `photo`、`text`：

```ts
const OPTIONS: Array<{ mode: QuickCaptureMode; label: string }> = [
  { mode: 'photo', label: '照片' },
  { mode: 'text', label: '文字' },
]
```

**不動** `lib/quick-capture.ts` 的 `QUICK_CAPTURE_MODES` 型別、`isQuickCaptureMode`、`pageTypeForQuickCaptureMode`，也不動 `app/api/books/quick/route.ts` 的驗證邏輯與 `book-editor-client.tsx` 的 `quickMode` 處理。原因：

- `video` mode 與 `video` page type 本身仍然有效——只是不再從「快速記錄」這個入口建立，編輯頁仍可手動新增影片頁。
- 保留型別上的 `'video'` 選項是無害的：API 仍會驗證 `mode`，只是前端不再送出這個值。之後如果要重新開放，或是有其他呼叫端用到，改動成本最低。
- 縮小改動範圍，符合「只拿掉入口，不拿掉能力」的決定。

---

## 測試計畫

專案沒有自動化測試框架（無 jest/vitest 設定，`package.json` 只有 `dev/build/start/lint`）。`capture` 屬性是純瀏覽器行為，jsdom 或 headless 測試也測不出實際相機喚起，因此驗證方式是手動：

- 手機瀏覽器（iOS Safari + Android Chrome 各測一次）：
  - 圖片頁「+ 拍照」直接開相機，拍完自動走現有壓縮 + 上傳流程
  - 圖片頁「+ 相簿」維持原本選擇器行為，可多選
  - 影片頁「+ 拍攝影片」直接開相機錄影模式
  - 影片頁「+ 選擇影片」維持原本選擇器行為
  - 達 `IMAGE_LIMIT`／轉檔中時，兩個按鈕都正確隱藏或 disabled
- Dashboard（admin 帳號）：
  - 快速記錄列只顯示「照片」、「文字」兩個按鈕
  - 點「照片」後行為與現有一致（建立 carousel 頁並導向 edit）
  - 桌機瀏覽器（無相機權限彈窗時）確認「+ 拍照」按鈕點擊仍會嘗試開檔案選擇器（無 capture 支援時降級為一般選擇器，不應報錯）

---

## File Map

預期實作會涉及：

- `components/media-uploader.tsx`：拆分 camera/gallery input 與按鈕
- `components/quick-capture-bar.tsx`：`OPTIONS` 移除 `video` 項

---

## 後續演進

若這次驗證有效，可再考慮：

- 上傳失敗自動重試（指數退避）
- 多檔上傳時顯示「第 N / 共 M 張」進度
- 影片頁是否也要有「快速記錄」入口的其他形式（例如編輯頁內更明顯的「新增影片頁」捷徑）
