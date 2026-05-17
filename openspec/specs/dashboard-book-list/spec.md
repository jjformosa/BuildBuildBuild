## ADDED Requirements

### Requirement: 書本卡片封面圖

系統 SHALL 在 dashboard 書本列表中，以縮圖形式顯示每本書的封面圖；無封面圖時 SHALL 顯示佔位區塊。

#### Scenario: 有封面圖的書本

- **WHEN** Admin 進入 dashboard，且書本的 `coverImage` 欄位有值
- **THEN** 卡片左側顯示封面縮圖（56×56px，`object-cover`）

#### Scenario: 無封面圖的書本

- **WHEN** Admin 進入 dashboard，且書本的 `coverImage` 欄位為空
- **THEN** 卡片左側顯示灰色佔位區塊，並以書名第一個字元作為提示文字

### Requirement: 書本卡片詳細資訊

系統 SHALL 在每張書本卡片上顯示發布狀態，使 admin 不需進入編輯頁即可判斷書本狀態。

#### Scenario: 書本卡片資訊顯示

- **WHEN** Admin 進入 dashboard
- **THEN** 每張卡片顯示：書名、描述（若有）、發布狀態標籤（已發布 / 草稿）

#### Scenario: 已發布書本標籤

- **WHEN** 書本的 `published` 為 `true`
- **THEN** 狀態標籤顯示「已發布」，以綠色系樣式呈現

#### Scenario: 草稿書本標籤

- **WHEN** 書本的 `published` 為 `false`
- **THEN** 狀態標籤顯示「草稿」，以低對比樣式呈現

### Requirement: 書本列表排序

系統 SHALL 提供排序控制，讓 admin 依需求調整書本的顯示順序。

#### Scenario: 預設排序（新→舊）

- **WHEN** Admin 進入 dashboard，未選擇排序
- **THEN** 書本依建立時間由新至舊排列（`_id` 降冪）

#### Scenario: 切換至舊→新排序

- **WHEN** Admin 點擊「舊→新」排序按鈕
- **THEN** 書本依建立時間由舊至新排列，列表重置並重新載入

#### Scenario: 切換至標題排序

- **WHEN** Admin 點擊「A→Z」排序按鈕
- **THEN** 書本依書名字典序排列（locale-aware），列表重置並重新載入

### Requirement: 書本列表狀態篩選

系統 SHALL 提供篩選控制，讓 admin 只看到特定發布狀態的書本。

#### Scenario: 篩選「全部」（預設）

- **WHEN** Admin 選擇或保持「全部」篩選
- **THEN** 顯示所有書本，不依發布狀態過濾

#### Scenario: 篩選「已發布」

- **WHEN** Admin 點擊「已發布」篩選按鈕
- **THEN** 只顯示 `published: true` 的書本，列表重置並重新載入

#### Scenario: 篩選「草稿」

- **WHEN** Admin 點擊「草稿」篩選按鈕
- **THEN** 只顯示 `published: false`（或無此欄位）的書本，列表重置並重新載入

#### Scenario: 篩選結果為空

- **WHEN** 篩選後沒有符合條件的書本
- **THEN** 顯示提示文字「沒有符合條件的記憶書。」，不顯示空列表

### Requirement: 書本卡片標籤管理

系統 SHALL 在 dashboard 書本卡片上提供標籤管理入口，點擊後開啟 `TagManagerModal`，取代先前的內嵌 TagInput。

#### Scenario: 點擊標籤按鈕開啟 Modal

- **WHEN** 使用者點擊書本卡片上的「＋ 標籤」按鈕
- **THEN** `TagManagerModal` 開啟，顯示該書本目前的標籤及新增輸入框

#### Scenario: 在 Modal 新增標籤後卡片狀態更新

- **WHEN** 使用者在 Modal 內成功新增標籤後關閉 Modal
- **THEN** 書本卡片的本地 tags 狀態已反映最新標籤（不需重新載入頁面）

#### Scenario: 在 Modal 刪除標籤後狀態更新

- **WHEN** 使用者在 Modal 內刪除標籤後關閉 Modal
- **THEN** 書本卡片的本地 tags 狀態已反映刪除後的結果

#### Scenario: 書本卡片本身不顯示標籤

- **WHEN** 書本有標籤
- **THEN** 卡片正常顯示區域（書名、描述、狀態）不顯示 tag chips；標籤只在 Modal 內可見
