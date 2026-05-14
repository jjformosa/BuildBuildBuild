## ADDED Requirements

### Requirement: 照片輪播元件（Carousel）

系統 SHALL 提供照片輪播元件，以 4:3 固定比例容器顯示多張照片。

#### Scenario: 多張照片輪播顯示

- **WHEN** 頁面的 `mediaBlock.type === 'carousel'` 且 `items` 有多張圖片
- **THEN** 照片輪播顯示第一張，底部有圓點指示器，用戶可左右滑動（手機）或點擊箭頭（桌機）切換

#### Scenario: 4:3 容器固定比例

- **WHEN** 照片輪播渲染
- **THEN** 容器維持 4:3 寬高比，使用 `object-fit: contain`，橫向照片兩側填暖色背景（`#FAF7F2`）

#### Scenario: 單張照片不顯示導覽

- **WHEN** `mediaBlock.items` 只有一張圖片
- **THEN** 不顯示圓點指示器和切換箭頭

#### Scenario: Polaroid 邊框感

- **WHEN** 照片輪播渲染
- **THEN** 照片容器有白色邊框（模擬 Polaroid 效果），soft vignette（box-shadow 內陰影）

### Requirement: 影片播放元件

系統 SHALL 提供影片播放元件，以 16:9 固定比例容器顯示單部影片。

#### Scenario: 影片顯示與播放

- **WHEN** 頁面的 `mediaBlock.type === 'video'`
- **THEN** 顯示 16:9 容器，HTML5 `<video>` 標籤，提供播放/暫停、進度條、音量控制

#### Scenario: 16:9 容器固定比例

- **WHEN** 影片播放元件渲染
- **THEN** 容器維持 16:9 寬高比，影片使用 `object-fit: contain`

#### Scenario: 影片自動暫停（非視野中）

- **WHEN** 讀者捲動使影片離開視野
- **THEN** 影片自動暫停，進入視野時不自動播放（由用戶控制）

### Requirement: Lightbox 全螢幕預覽

系統 SHALL 允許讀者點擊輪播照片後，以全螢幕 lightbox 顯示原始比例圖片。

#### Scenario: 點擊照片開啟 Lightbox

- **WHEN** 讀者點擊輪播中的照片
- **THEN** 螢幕顯示深色遮罩，圖片以原始比例置中顯示，最大化至螢幕範圍

#### Scenario: 關閉 Lightbox

- **WHEN** 讀者點擊遮罩或按 Escape
- **THEN** Lightbox 關閉，回到輪播視圖

#### Scenario: Lightbox 中切換照片

- **WHEN** Lightbox 開啟時，讀者點擊左右箭頭
- **THEN** 切換至同一頁的前/後一張照片

#### Scenario: 行動裝置手勢關閉

- **WHEN** 讀者在 Lightbox 中向下滑動
- **THEN** Lightbox 關閉

### Requirement: 媒體載入狀態

系統 SHALL 在媒體載入期間顯示佔位元素，避免版面跳動。

#### Scenario: 圖片載入中

- **WHEN** 圖片尚未載入完成
- **THEN** 顯示相同比例的暖色佔位框（skeleton），載入完成後淡入圖片

#### Scenario: 媒體載入失敗

- **WHEN** 圖片或影片 URL 無法存取
- **THEN** 顯示錯誤佔位圖（broken image icon）並保持容器比例不變形
