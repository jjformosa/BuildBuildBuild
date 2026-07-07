# 設計規格 — 快速記錄入口

> 狀態：已完成（2026-07-08 同步；後續 2026-07-03 已移除 Dashboard 的「影片」快速入口，API 仍保留 video mode）
> 日期：2026-06-19

---

## 背景與目標

目前建立記憶書的流程太重：使用者需要先建立書、填標題、進入編輯頁、新增頁面、選頁面類型，才開始上傳或打字。這不符合 product brief 裡「捕捉優先於整理」的原則。

本設計的目標是讓 creator 從 dashboard 最多兩次主動操作，就能進入可上傳或可打字的狀態。

**本次包含：**
- Dashboard 搜尋列下方的快速記錄捕捉列
- `photo / video / text` 三種入口
- 建立快速草稿書與第一頁的專用 API
- 編輯器依 quick mode 提供對應焦點
- 基本錯誤處理與防重複提交

**不包含：**
- 合併快速草稿
- 自動開啟相機或檔案選擇器
- 獨立 `/quick` 捕捉頁
- 新增文字專用 page type
- 語音備忘錄
- 非 admin 使用者建立書本

---

## 首版使用者流程

Dashboard 搜尋列下方新增一條輕量捕捉列，不做大型 banner。捕捉列顯示短句與三個動作：`照片`、`影片`、`文字`。

流程：

1. 使用者進入 dashboard。
2. 點 `照片`、`影片`、`文字` 任一項。
3. 系統建立一本新草稿書，標題為 `快速記錄 YYYY/MM/DD HH:mm`。
4. 系統同時建立第一頁。
5. 前端導向 `/books/[bookId]/edit?quick=photo|video|text`。
6. 編輯器自動選中第一頁，讓使用者能立即上傳或打字。

成功標準：從 dashboard 到可開始上傳或打字，最多兩次主動操作。

---

## 入口位置與 UI

採用「搜尋下方捕捉列」設計。

位置：
- `DashboardShell` 中，搜尋表單之後
- owner 書本 section 之前
- 只在 `isAdmin === true` 時顯示

元件：

```tsx
<QuickCaptureBar />
```

視覺與互動：
- 左側文案：`現在記一筆`
- 右側三個按鈕：`照片`、`影片`、`文字`
- 點擊後該 mode 進入 pending，所有按鈕 disabled
- pending 文字顯示為 `建立中…`
- 成功後 `router.push(data.redirectTo)`
- 失敗時在捕捉列內顯示 `建立失敗，請再試一次`
- 手機上三個按鈕等寬排列或換行，避免壓縮文字

不使用右下浮動按鈕，避免遮住 dashboard 列表，也避免和目前安靜的 dashboard 風格衝突。

---

## 資料模型

不新增資料模型，也不新增 page type。

沿用現有模型：

- `Book`
- `Page`
- `Page.type = 'carousel' | 'video'`

mode 對應：

| mode | Book | Page |
|------|------|------|
| `photo` | 新草稿書 | `type: 'carousel'` |
| `video` | 新草稿書 | `type: 'video'` |
| `text` | 新草稿書 | `type: 'carousel'`，不放圖片 |

`text` 首版借用 `carousel` 頁，因為現有 carousel 頁已支援 markdown 內容與 optional media。這避免為第一版新增 page type。

---

## API 設計

新增專用 API：

```http
POST /api/books/quick
```

Request：

```json
{
  "mode": "photo"
}
```

`mode` 可為：

```ts
'photo' | 'video' | 'text'
```

Response：

```json
{
  "_id": "bookId",
  "pageId": "pageId",
  "mode": "photo",
  "redirectTo": "/books/bookId/edit?quick=photo"
}
```

### 後端行為

1. 驗證登入；未登入回 `401 Unauthorized`。
2. 驗證使用者有建立書本權限；首版沿用 `POST /api/books` 規則，只有 `admin` 可建立，非 admin 回 `403 Forbidden`。
3. 驗證 `mode`，不是 `photo | video | text` 回 `400`。
4. 以 `Asia/Taipei` 時區產生標題：`快速記錄 YYYY/MM/DD HH:mm`。
5. 建立 `Book`：
   - `title`: 上述快速標題
   - `createdBy`: `session.user.id`
   - `shareStatus`: 預設 `private`
6. 建立第一個 `Page`：
   - `photo`: `type: 'carousel'`
   - `video`: `type: 'video'`
   - `text`: `type: 'carousel'`
   - `content`: `''`
   - `mediaUrls`: `[]`
7. 將 page `_id` push 到 `book.pageOrder` 並儲存 book。
8. 回傳 `bookId`、`pageId`、`mode`、`redirectTo`。

### 失敗清理

如果 `Book` 建立成功，但 `Page` 建立或 `book.pageOrder` 更新失敗，API 需刪除剛建立的 `Book`，避免留下沒有頁面的快速草稿。清理後回 `500` 與通用錯誤訊息。

### 為什麼不擴充 `POST /api/books`

`POST /api/books` 目前語意是「建立一本書」。快速記錄是「建立書 + 建立第一頁 + 導向對應捕捉狀態」的複合動作。獨立 `/api/books/quick` 讓權限、測試與回滾範圍更清楚。

---

## 編輯器行為

編輯頁支援 query：

```text
?quick=photo
?quick=video
?quick=text
```

`BookEditorClient` 接收或讀取 quick mode 後：

- 保持第一頁為 selected page。
- `quick=text`：讓文字編輯區成為第一注意焦點，使用者可以直接開始打字。
- `quick=photo` 或 `quick=video`：讓媒體上傳區成為第一注意焦點，例如短暫 highlight，並將畫面滾到上傳區附近。
- invalid quick value：忽略，維持一般編輯器行為。

首版不自動開啟 file picker。跨頁導轉後自動開檔案選擇器通常不被瀏覽器視為使用者手勢，行為不穩定。首版只確保上傳按鈕在第一屏清楚可見。

---

## 權限

首版只支援 admin/creator 建立快速草稿。

- Dashboard：`isAdmin === true` 才顯示 `QuickCaptureBar`
- API：即使前端隱藏，`POST /api/books/quick` 仍檢查 `session.user.role === 'admin'`
- Editor 和 Reader 不顯示快速記錄入口，也不能透過 API 建立書

這與現有 `POST /api/books` 權限一致。

---

## 錯誤處理

| 情境 | 行為 |
|------|------|
| 未登入 | API 回 `401`，前端顯示建立失敗 |
| 非 admin | API 回 `403`，前端正常不顯示捕捉列 |
| mode 無效 | API 回 `400` |
| Book 成功但 Page 失敗 | 刪除新建 Book，回 `500` |
| 前端連點 | pending 期間 disabled 全部按鈕 |
| redirectTo 缺失 | 前端顯示建立失敗，不導向 |
| quick query 無效 | 編輯器忽略 query |

---

## 測試計畫

### API 測試

- `photo` 會建立 `Book` 與 `carousel Page`
- `video` 會建立 `Book` 與 `video Page`
- `text` 會建立 `Book` 與 `carousel Page`
- 建立後 `book.pageOrder` 包含第一頁 `_id`
- response 包含 `_id`、`pageId`、`mode`、`redirectTo`
- invalid mode 回 `400`
- 未登入回 `401`
- 非 admin 回 `403`
- page 建立失敗時清理剛建立的 book

### 前端測試或手動驗證

- Dashboard admin 使用者可看到捕捉列
- 非 admin dashboard 不顯示捕捉列
- 點 `照片` 後呼叫 `/api/books/quick`，成功導向 edit URL
- pending 時三個按鈕 disabled
- API 失敗時顯示錯誤
- 手機寬度下捕捉列不擠壓、不遮住搜尋
- `photo/video/text` 三種 redirect 後都能立即開始對應操作

---

## File Map

預期實作會涉及：

- `app/api/books/quick/route.ts`：新增快速記錄 API
- `components/quick-capture-bar.tsx`：新增 dashboard 捕捉列
- `components/dashboard-books-client.tsx`：將捕捉列插入搜尋列下方
- `app/books/[bookId]/edit/page.tsx`：讀取 `quick` search param 並傳給 editor client
- `components/book-editor-client.tsx`：依 quick mode focus 或 highlight 對應區塊

---

## 後續演進

若首版驗證有效，可再考慮：

- 將 `photo / video / text` 合併成更自由的「照片 + 文字同場」捕捉頁
- 支援加入最近草稿，而不是每次建立新書
- 新增語音備忘錄入口
- 支援直接從手機相機開始，但需另行處理瀏覽器 user gesture 限制
