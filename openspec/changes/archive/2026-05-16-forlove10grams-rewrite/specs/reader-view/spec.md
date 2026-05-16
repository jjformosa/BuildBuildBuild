## ADDED Requirements

### Requirement: Share Link 存取驗證

系統 SHALL 透過 share token 讓讀者存取 book，未登入者自動跳轉登入。

#### Scenario: 未登入讀者開啟 Share Link

- **WHEN** 未登入使用者開啟 `/share/{token}`
- **THEN** 系統將 `token` 儲存至 session（或 URL query），redirect 至 `/login`；登入完成後自動 redirect 至 `/read/[bookId]`

#### Scenario: 已登入讀者開啟 Share Link

- **WHEN** 已登入讀者開啟 `/share/{token}`
- **THEN** 系統驗證 token 有效性（查詢 `shares` collection），redirect 至 `/read/[bookId]`

#### Scenario: 無效或過期 Token

- **WHEN** Token 不存在於 `shares` collection
- **THEN** 系統顯示「連結無效或已過期」錯誤頁面

#### Scenario: 未發布 Book 的 Token

- **WHEN** 對應 book 的 `isPublished: false`
- **THEN** 系統顯示「此記憶書尚未發布」提示頁面

### Requirement: Film Diary 閱讀介面

系統 SHALL 以「Film Diary」視覺風格呈現 book 閱讀頁，提供溫暖的閱讀體驗。

#### Scenario: 頁面視覺樣式

- **WHEN** 讀者進入 `/read/[bookId]`
- **THEN** 背景色為暖白 `#FAF7F2`，主文字色為深褐 `#2C1810`，每頁媒體區塊有 Polaroid 邊框感

#### Scenario: 垂直捲動分頁佈局

- **WHEN** 讀者在手機（375px）閱讀
- **THEN** 每頁採堆疊式佈局：媒體區塊在上（4:3 或 16:9 容器），文字區塊在下，自然垂直捲動

#### Scenario: Scroll-triggered 淡入動畫

- **WHEN** 讀者捲動至新頁面進入視野
- **THEN** Framer Motion 執行淡入動畫（y: 20px→0, opacity: 0→1，duration: 0.5s），無彈跳效果

#### Scenario: 頁面導覽列

- **WHEN** 讀者閱讀任何頁面
- **THEN** 頂部顯示「← 第N章  ○ ○ ● ○ →」導覽列，點擊箭頭可切換頁面

### Requirement: 目錄（TOC）元件

系統 SHALL 提供 TOC，顯示所有頁面標題與已讀進度。

#### Scenario: 桌機 TOC 顯示

- **WHEN** 讀者在桌機（≥768px）閱讀
- **THEN** TOC 顯示於頁面左側固定欄，列出所有頁面標題，已讀頁面有勾選標記

#### Scenario: 手機 TOC 抽屜

- **WHEN** 讀者在手機（<768px）點擊 TOC 按鈕
- **THEN** 底部滑出抽屜（bottom sheet），顯示所有頁面標題與已讀狀態

#### Scenario: TOC 點擊跳轉

- **WHEN** 讀者點擊 TOC 中的頁面標題
- **THEN** 頁面平滑捲動至對應頁面位置

#### Scenario: TOC 已讀進度同步

- **WHEN** 讀者閱讀新頁面，Server 記錄已讀
- **THEN** TOC 中對應項目即時顯示已讀標記（樂觀更新）

### Requirement: 閱讀頁 RWD 支援

系統 SHALL 在桌機、平板、手機三種尺寸提供適切的閱讀佈局。

#### Scenario: 手機直向（375px）

- **WHEN** 讀者在 375px 寬度閱讀
- **THEN** 單欄堆疊佈局，媒體佔全寬，TOC 為底部抽屜

#### Scenario: 桌機（≥1024px）

- **WHEN** 讀者在桌機閱讀
- **THEN** 雙欄佈局：左側固定 TOC（~240px），右側閱讀區域
