## MODIFIED Requirements

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
