## ADDED Requirements

### Requirement: Admin 新增 Page

系統 SHALL 允許 admin 在 book 中新增頁面，每頁包含媒體區塊（carousel 或 video）與文字區塊（Markdown）。

#### Scenario: 新增 Page 成功

- **WHEN** Admin 點擊「新增頁面」，填寫標題並選擇媒體類型
- **THEN** 系統在 `pages` collection 建立文件，`order` 設為目前最大 order + 1，`bookId` 對應當前 book

#### Scenario: 選擇 Carousel 類型

- **WHEN** Admin 選擇「照片輪播」媒體類型
- **THEN** `mediaBlock.type` 設為 `carousel`，顯示多張照片上傳介面

#### Scenario: 選擇 Video 類型

- **WHEN** Admin 選擇「影片」媒體類型
- **THEN** `mediaBlock.type` 設為 `video`，顯示單一影片上傳介面

### Requirement: Admin 編輯 Page 內容

系統 SHALL 允許 admin 編輯頁面的媒體與文字內容。

#### Scenario: 更新 Markdown 文字

- **WHEN** Admin 在文字編輯器輸入 Markdown 並儲存
- **THEN** `pages.textBlock.content` 更新，讀者頁面顯示渲染後的 HTML

#### Scenario: 即時 Markdown 預覽

- **WHEN** Admin 在文字編輯器輸入內容
- **THEN** 右側（桌機）或下方（手機）即時顯示渲染後的預覽

#### Scenario: 新增圖片至 Carousel

- **WHEN** Admin 在 carousel 頁面上傳新圖片
- **THEN** 圖片 S3 URL 加入 `mediaBlock.items` 陣列，預覽縮圖顯示於編輯器

#### Scenario: 刪除 Carousel 中的圖片

- **WHEN** Admin 點擊圖片縮圖上的刪除按鈕
- **THEN** 對應 URL 從 `mediaBlock.items` 移除，S3 物件 SHOULD 標記刪除（非同步清理）

### Requirement: Admin 刪除 Page

系統 SHALL 允許 admin 刪除頁面，連同相關的 readProgress。

#### Scenario: 刪除 Page

- **WHEN** Admin 確認刪除頁面
- **THEN** `pages` 文件刪除，`books.pageOrder` 移除對應 ID，相關 `readProgress` 文件刪除

### Requirement: Page 排序（拖曳）

系統 SHALL 允許 admin 透過拖曳方式重新排序 book 中的頁面。

#### Scenario: 拖曳重新排序

- **WHEN** Admin 拖曳頁面卡片至新位置後放開
- **THEN** `books.pageOrder` 陣列更新為新順序，讀者閱讀頁依新順序顯示

#### Scenario: 排序持久化

- **WHEN** Admin 完成拖曳排序後離開頁面再返回
- **THEN** 頁面仍以新排序顯示

### Requirement: Page 編輯器介面

系統 SHALL 提供清晰的編輯器介面，顯示當前 book 所有頁面的概覽。

#### Scenario: Book 編輯器頁面概覽

- **WHEN** Admin 進入 `/books/[bookId]/edit`
- **THEN** 左側顯示所有頁面的可排序列表，右側顯示選中頁面的編輯器

#### Scenario: 未儲存變更提示

- **WHEN** Admin 有未儲存變更時嘗試離開頁面
- **THEN** 瀏覽器顯示「確定要離開？您有未儲存的變更」確認對話框
