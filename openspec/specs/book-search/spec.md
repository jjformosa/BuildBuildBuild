## ADDED Requirements

### Requirement: Dashboard 書名關鍵字搜尋

系統 SHALL 在 dashboard 提供搜尋輸入框，允許 creator 依標題關鍵字搜尋自己建立的書。搜尋模式與排序 / 篩選模式互斥：有關鍵字時隱藏 sort/status 控制，清空後恢復。

#### Scenario: 輸入關鍵字顯示搜尋結果

- **WHEN** 使用者在搜尋框輸入關鍵字（debounce 300ms 後）
- **THEN** 系統呼叫 `/api/books?q=<keyword>&limit=10`，顯示符合**書名或標籤**的結果列表；sort/status 控制列隱藏

#### Scenario: 搜尋結果分頁

- **WHEN** 搜尋結果超過 10 筆，使用者捲動到底部
- **THEN** 系統呼叫 `/api/books?q=<keyword>&limit=10&after=<cursor>` 載入下一頁，結果追加至列表

#### Scenario: 無符合結果

- **WHEN** 關鍵字搜尋結果為空
- **THEN** 系統顯示「找不到符合「{keyword}」的記憶書。」提示，不顯示書本列表

#### Scenario: 清空關鍵字回到原列表

- **WHEN** 使用者清空搜尋框（或 backspace 刪到空）
- **THEN** 搜尋模式結束，sort/status 控制列恢復，書本列表回到清空前的排序 / 篩選狀態

#### Scenario: 搜尋進行中顯示 loading

- **WHEN** API 請求發出但尚未回應
- **THEN** 顯示「載入中…」提示，書本列表不顯示舊結果
