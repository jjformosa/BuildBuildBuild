# forlove10grams — 測試案例規劃

> 依據 seed.cjs 現有資料的缺口分析，規劃更完整的測試資料與手動測試場景。

---

## 一、測試使用者設計

| 變數名稱 | role | 用途 |
|---------|------|------|
| `alice` | `admin` | 主要測試帳號（對應目前登入的 current user） |
| `bob` | `customer` | 被邀請擔任 editor 的人 |
| `carol` | `customer` | 只有 share token 閱讀權的人 |

> **注意**：現有 seed 是 `findOne({})` 抓第一個 user 當 alice。  
> 若要讓 bob/carol 真正存在於 users collection，seed 需調整為 upsert 或另外插入。

---

## 二、Books 測試資料一覽

| # | 書名 | owner | editorId | published | 頁數 | share token | ReadProgress |
|---|------|-------|----------|-----------|------|-------------|--------------|
| 1 | 空白草稿 | alice | — | false | 0 | — | — |
| 2 | 有頁面的草稿 | alice | — | false | 4 | — | — |
| 3 | 已發布並分享 | alice | — | true | 5 | active | — |
| 4 | Bob 邀請我當 Editor | bob | alice | false | 3 | — | — |
| 5 | Carol 的分享書（閱讀中） | carol | — | true | 4 | active | alice: 2/4 頁 |
| 6 | 失效分享連結 | carol | — | true | 2 | inactive | — |
| 7 | 全部讀完的書 | alice | — | true | 3 | — | alice: 3/3 頁 |
| 8 | 部分讀完的書 | alice | — | true | 5 | — | alice: 2/5 頁 |
| 9 | 無任何存取權 | bob | — | false | 2 | — | — |

### Share Token 對照

| token | bookId | active |
|-------|--------|--------|
| `test-token-book3` | Book 3 | ✅ |
| `test-token-book5` | Book 5 | ✅ |
| `test-token-book6` | Book 6 | ❌ |

---

## 三、手動測試場景

### 3.1 Dashboard（`/dashboard`）

| # | 前置條件 | 操作 | 預期結果 |
|---|---------|------|---------|
| D-01 | 以 alice 登入 | 進入 Dashboard | 顯示 Book 1, 2, 3, 7, 8（alice 為 owner 的書） |
| D-02 | 同上 | 看 Book 1 | 顯示「0 頁」或空狀態 badge |
| D-03 | 同上 | 看 Book 3 | 顯示「已發布」標記 |
| D-04 | 新帳號（0 本書） | 進入 Dashboard | 顯示空白引導畫面（Empty state） |

---

### 3.2 Book Editor（`/books/[bookId]/edit`）

| # | 前置條件 | 操作 | 預期結果 |
|---|---------|------|---------|
| E-01 | alice → Book 1 | 進入 edit 頁 | 空白畫布，可新增頁面 |
| E-02 | alice → Book 2 | 進入 edit 頁 | 顯示 4 頁，可拖拉排序 |
| E-03 | alice → Book 4 (editorId=alice) | 進入 edit 頁 | 成功，可新增/編輯/刪除頁面 |
| E-04 | alice → Book 9 (bob 的書，無任何關係) | 直接打 `/books/[bookId]/edit` | 應被 403 或重導向 |
| E-05 | alice → Book 2 | 新增 carousel 頁面 | 頁面出現在 pageOrder 末端 |
| E-06 | alice → Book 2 | 刪除某頁 | pageOrder 更新，頁面數減少 |
| E-07 | alice → Book 2 | PATCH 頁面內容 | 儲存後重整，內容持久化 |

---

### 3.3 Read View（`/read/[bookId]`）

| # | 前置條件 | 操作 | 預期結果 |
|---|---------|------|---------|
| R-01 | alice → Book 2（未發布，alice=owner） | 進入 read 頁 | 正常顯示所有頁面 |
| R-02 | alice → Book 7（全部讀完） | 進入 read 頁 | TOC 所有項目顯示已讀狀態 |
| R-03 | alice → Book 8（部分讀完） | 進入 read 頁 | TOC 顯示 2 頁已讀，3 頁未讀 |
| R-04 | alice → Book 8 | 滾動到未讀頁面 | Intersection Observer 觸發，POST /api/progress，TOC 更新 |
| R-05 | alice → Book 8 | 重複滾動同一頁 | 不報錯（upsert 不炸掉） |
| R-06 | alice → Book 1（0 頁） | 進入 read 頁 | 顯示空狀態，不崩潰 |

---

### 3.4 Share Token 流程（`/share/[token]`）

| # | 前置條件 | 操作 | 預期結果 |
|---|---------|------|---------|
| S-01 | — | 訪問 `/share/test-token-book3` | 導向 `/read/[book3Id]` |
| S-02 | — | 訪問 `/share/test-token-book6`（inactive） | 顯示「連結已失效」錯誤頁面 |
| S-03 | — | 訪問 `/share/nonexistent-token` | 404 錯誤頁面 |
| S-04 | alice → Book 3 | 在 editor 點擊「重新產生分享連結」 | 舊 token 被 deactivate，產生新 token |
| S-05 | 用舊 token（S-04 後）| 訪問舊 `/share/test-token-book3` | 404（已失效） |

---

### 3.5 Invite Editor 流程

| # | 前置條件 | 操作 | 預期結果 |
|---|---------|------|---------|
| I-01 | alice（admin）→ Book 2 | 邀請 bob 的 email | 200，Book 2 的 editorId = bob._id |
| I-02 | alice → Book 2 | 邀請不存在的 email | 404 "User not found" |
| I-03 | alice → Book 2 | 邀請另一個 admin 的 email | 404 "not a customer" |
| I-04 | 以 bob（customer）操作 | 嘗試邀請 → POST /api/books/[id]/invite | 403 Forbidden |

---

### 3.6 Progress API（純 API 層）

| # | 請求 | 前置條件 | 預期結果 |
|---|------|---------|---------|
| P-01 | `GET /api/progress?bookId=book7` | alice 登入 | `{ readPageIds: [所有 3 個 pageId] }` |
| P-02 | `GET /api/progress?bookId=book8` | alice 登入 | `{ readPageIds: [2 個已讀的 pageId] }` |
| P-03 | `GET /api/progress?bookId=book9` | alice 登入（無任何權限） | 403 |
| P-04 | `GET /api/progress` 沒有 bookId | alice 登入 | 400 "Missing bookId" |
| P-05 | `POST /api/progress` | alice, book8 的未讀 page | 200 `{ ok: true }`，ReadProgress 新增記錄 |
| P-06 | P-05 重複執行 | 同上 | 200（upsert，不重複插入） |
| P-07 | 未登入 | 任何 progress 請求 | 401 |

---

### 3.7 Books API（純 API 層）

| # | 方法 + 路徑 | 請求者 | 預期 |
|---|-----------|--------|------|
| A-01 | `GET /api/books/[book2]` | alice（owner） | 200 |
| A-02 | `GET /api/books/[book4]` | alice（editor） | 200 |
| A-03 | `GET /api/books/[book9]` | alice（無關係） | 403 |
| A-04 | `PATCH /api/books/[book2]` | alice（owner + admin） | 200 |
| A-05 | `PATCH /api/books/[book4]` | alice（editor，但非 admin） | 403 |
| A-06 | `DELETE /api/books/[book2]` | alice（owner + admin） | 200，pages 一併刪除 |
| A-07 | `DELETE /api/books/[book4]` | alice（editor，非 owner） | 403 |
| A-08 | `POST /api/books` | alice（admin） | 201 |
| A-09 | `POST /api/books` | bob（customer） | 403 |
| A-10 | `POST /api/books/[book3]/share` | alice（owner） | 200，舊 token 失效，新 token 產生 |
| A-11 | `POST /api/books/[book4]/share` | alice（editor，非 owner） | 403 |

---

## 四、現有 Seed 缺口對照

| 缺口 | 影響場景 | 建議補充 |
|------|---------|---------|
| 無 Share token 記錄 | S-01 ~ S-05 | 補充 3 筆 Share |
| Book B 無頁面 | R 系列 | Book 5/6 加 2-4 頁 |
| 無 ReadProgress 記錄 | R-02, R-03, P-01, P-02 | 補充 alice 對 book 7/8 的記錄 |
| 無真實 bob/carol user | I 系列、A 系列 | seed 改為 upsert 多個 user |
| 全部 mediaUrls: [] | carousel / video 顯示 | 選用 placeholder 或固定測試 URL |
| 無 coverImage | Dashboard 封面 | 選用 placeholder URL |
| 無「無任何存取權的書」 | A-03, P-03 | 新增 Book 9 |

---

## 五、待決策事項

1. **mediaUrls 用什麼 URL？**  
   選項 A：`https://picsum.photos/800/600?random=N`（隨機 placeholder 圖）  
   選項 B：專案 public 資料夾放測試圖  
   選項 C：S3 bucket 裡的固定測試檔案  

2. **seed 的使用者策略**  
   選項 A：seed 插入全新 `test-alice@example.com` 等測試帳號（不影響正式用戶）  
   選項 B：seed 找到 current user 後，額外 upsert bob/carol 為輔助測試帳號  

3. **測試形式的方向**  
   目前：手動 seed + 手動點擊  
   下一步可考慮：  
   - Playwright E2E（測 UI 流程）  
   - Vitest + MongoDB Memory Server（測 API route 邏輯）  
   - 兩者並行  

---

*最後更新：2026-05-15*
