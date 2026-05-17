## ADDED Requirements

### Requirement: TagManagerModal 元件

系統 SHALL 提供一個 `TagManagerModal` 共用元件，可從 dashboard 和書本編輯器開啟，用於新增和刪除書本標籤。

#### Scenario: 開啟 Modal

- **WHEN** 使用者點擊標籤管理按鈕（[＋ 標籤] 或 [標籤]）
- **THEN** 畫面中央出現模態對話盒，顯示該書本目前的所有標籤以及一個 `TagInput` 輸入欄位

#### Scenario: 關閉 Modal（點擊背景）

- **WHEN** 使用者點擊 Modal 背景遮罩
- **THEN** Modal 關閉，頁面回到正常狀態

#### Scenario: 關閉 Modal（Escape 鍵）

- **WHEN** 使用者按下 Escape 鍵
- **THEN** Modal 關閉

### Requirement: Modal 內新增標籤

系統 SHALL 允許任何具有編輯權限的使用者在 Modal 內新增標籤。

#### Scenario: 新增已存在於標籤庫的標籤

- **WHEN** 使用者在 TagInput 輸入文字，從下拉候選清單選擇一個標籤
- **THEN** 標籤立即加入書本，chips 列表更新，輸入框清空

#### Scenario: 新增全新標籤

- **WHEN** 使用者在 TagInput 輸入文字後按 Enter 或點擊「＋」按鈕
- **THEN** 標籤加入書本並同時寫入標籤庫，chips 列表更新

#### Scenario: 重複標籤不重複新增

- **WHEN** 使用者嘗試新增書本已有的標籤
- **THEN** 系統忽略此操作，不重複加入

### Requirement: Modal 內刪除標籤

系統 SHALL 允許任何具有編輯權限的使用者在 Modal 內刪除書本上的標籤。

#### Scenario: 刪除現有標籤

- **WHEN** 使用者點擊標籤 chip 旁的 ✕ 按鈕
- **THEN** 標籤從書本移除，chips 列表即時更新，標籤庫記錄保留

#### Scenario: Dashboard 上也可刪除

- **WHEN** Owner 或 Editor 從 Dashboard 開啟 Modal 並點擊 ✕
- **THEN** 標籤成功刪除（先前 Dashboard 只能新增，不可刪除）
