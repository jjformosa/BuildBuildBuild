# 設計規格 — 語音備忘錄頁面（audio page）

> 狀態：規劃完成，待討論確認
> 日期：2026-07-07

---

## 背景與目標

`docs/backlog.md`「語音備忘錄頁面」項目：文字需要打字，照片需要構圖，語音只需要開口——但目前沒有音訊頁面類型。

這是「捕捉優先於整理」精神的延伸：潛水上岸手還濕著、走在路上不方便打字的場景，語音是摩擦最低的記錄方式。

**本次包含：**
- `Page.type` 新增 `'audio'` 頁型
- 編輯頁的錄音介面（瀏覽器 `MediaRecorder API`）：錄音、試聽、重錄、上傳
- 音檔存入 S3，沿用既有 presign 上傳流程與 CloudFront Signed URL 保護
- 閱讀頁的音訊播放器
- `AddPageButton` 新增「+ 錄音」、`QuickCaptureBar` 新增「語音」入口

**不包含：**
- Whisper / 語音轉文字（留到後續演進）
- 音訊波形視覺化（先用原生播放器樣式）
- 上傳既有音檔（只做「當場錄」；從檔案挑音檔留到有需求再說）
- MediaConvert 音訊轉檔管道（見「方案取捨」）

---

## 使用者故事

- 作為 creator，我剛結束一段經歷（潛水上岸、飯局散場），想直接對手機說話記下當下的想法，不需要打字
- 作為 creator，我想在錄完後先試聽，不滿意可以重錄，滿意才存進書裡
- 作為 creator，我想在語音頁附一段文字說明（optional），讓之後翻到時知道這段錄音的脈絡
- 作為 editor，我想在受邀的書裡用語音補充我的記憶，跟照片、影片頁一樣自然
- 作為 reader，我讀到語音頁時，可以按播放聽到作者當時的聲音，感受文字傳達不了的語氣
- 作為 creator，我想替語音頁設定 `happenedAt` 日期，跟其他頁型一致

## 操作流程（use case）

### UC-1：編輯頁新增語音頁
1. Creator/editor 在編輯頁點「+ 錄音」→ 建立一個空的 audio page，進入該頁
2. 頁面中央顯示大的「● 開始錄音」按鈕；點擊後瀏覽器請求麥克風權限
3. 錄音中顯示計時（mm:ss）與「■ 停止」按鈕；達 10 分鐘上限自動停止
4. 停止後顯示試聽播放器 + 「重錄」「使用這段錄音」兩個按鈕
5. 點「使用這段錄音」→ 走 presign 上傳 → 進度條 → 完成後頁面顯示正式播放器
6. 已有錄音的頁面顯示播放器 + 「重新錄製」按鈕（覆蓋原檔需確認）

### UC-2：快速記錄（語音）
1. Dashboard 的 `QuickCaptureBar` 點「語音」→ 建立當日快速記錄書（沿用 quick-capture 邏輯）+ 一個 audio page，直接落在編輯頁的錄音介面
2. 之後同 UC-1 步驟 2–5；書名事後再補

### UC-3：閱讀語音頁
1. Reader 捲動到語音頁，看到文字說明（若有）+ 播放器（播放鍵、進度條、時長）
2. 點播放即聽；音檔 URL 為 CloudFront Signed URL，直接分享 URL 給第三者無法播放

---

## 方案取捨

錄音格式與相容性是本功能唯一的技術風險。三個方案：

| 方案 | 說明 | 取捨 |
|------|------|------|
| **A — MediaRecorder 直傳（推薦）** | 前端以 `MediaRecorder` 錄音，優先 `audio/mp4`（AAC），不支援時退到 `audio/webm`（Opus），原檔直傳 S3 | 零後端改動、零轉檔成本。風險：舊 Chrome 錄的 webm 在舊 Safari 可能無法播。2026 年的 Safari 17+/Chrome 126+ 皆支援 `audio/mp4` 錄製與 webm/opus 播放，實際風險已很低 |
| B — 重用 MediaConvert 管道 | 上傳原檔後走 Lambda → MediaConvert 轉 AAC/m4a，同影片管道 | 相容性最穩，但為個位數使用者的個人工具引入轉檔延遲（錄完不能立刻聽到正式檔）與 pipeline 維護成本，不成比例 |
| C — 前端 wasm 轉 mp3 | `lamejs` 等在 client 轉碼 | 增加 bundle 與手機 CPU 負擔，解決的問題 A 已幾乎不存在 |

**採 A**。若日後實測發現特定裝置播不了，再把 B 當成升級路徑（`transcodingStatus` 欄位已存在，管道也現成）。

---

## 資料模型

`lib/models/page.ts`：

```ts
export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video' | 'audio'   // 新增 'audio'
  content?: string
  mediaUrls: string[]                    // audio 頁只放一個元素：音檔 URL
  transcodingStatus?: TranscodingStatus  // audio 頁不使用（方案 A 不轉檔）
  happenedAt?: Date
  durationSec?: number                   // 新增：錄音長度（秒），錄完由前端帶入
}
```

```ts
type: { type: String, enum: ['carousel', 'video', 'audio'], required: true },
durationSec: { type: Number },
```

- 不需要 migration：既有頁面不受影響
- `durationSec` 讓清單與播放器能顯示時長，不用先下載音檔才知道
- 一頁一段錄音（`mediaUrls[0]`）。「一頁多段錄音」沒有對應的使用場景，不做

## API 設計

### 上傳（改既有）

`app/api/upload/presign/route.ts`：

```ts
fileType: z.enum(['carousel', 'video', 'cover', 'audio']),
```

`extFromContentType` map 新增：

```ts
'audio/mp4': 'm4a',
'audio/webm': 'weba',
'audio/mpeg': 'mp3',
```

S3 key 沿用 `books/{bookId}/...` 前綴，自動被既有 CloudFront 行為保護。

### 頁面 CRUD（改既有）

- `POST /api/books/[bookId]/pages`：`type` enum 接受 `'audio'`
- `PATCH /api/books/[bookId]/pages/[pageId]`：`PatchPageBody` 新增 `durationSec: z.number().optional()`；`mediaUrls` 沿用既有欄位寫入音檔 URL
- Quick capture（`lib/quick-capture.ts` + `POST /api/books/quick`）：`QUICK_CAPTURE_MODES` 新增 `'audio'`，`pageTypeForMode` 回傳 `'audio'`

### 播放授權（沿用既有）

音檔是單一檔案（非 HLS 分段），比照圖片以 `signImageUrl`（canned policy Signed URL）在 server 端簽章後交給前端 `<audio>`，不需要 Signed Cookie。`lib/sign-media.ts` 的 `signImageUrl` 改名或加一個語意化 alias（`signMediaUrl`）皆可，簽章邏輯不變。

---

## 前端

### `AudioRecorder`（新元件 `components/audio-recorder.tsx`）

- 狀態機：`idle → recording → preview → uploading → done`
- `MediaRecorder` mimeType 偵測：`MediaRecorder.isTypeSupported('audio/mp4')` 優先，退 `'audio/webm'`
- 錄音上限 10 分鐘（`setTimeout` 自動 stop）；Opus/AAC 語音 10 分鐘約 2–10MB，遠低於影片
- preview 階段以 blob URL 試聽；「使用這段錄音」才 presign + PUT 上傳，成功後 PATCH `mediaUrls` + `durationSec`（比照 `MediaUploader` 的 fire-and-forget）
- 麥克風權限被拒時顯示引導文字（「請在瀏覽器設定允許麥克風」），不 crash

### `AudioPlayer`（新元件 `components/audio-player.tsx`）

- 原生 `<audio>` 包一層自訂外觀：播放/暫停鍵、進度條、`durationSec` 顯示
- 編輯頁（`book-editor-client.tsx`）與閱讀頁（`read-page-client.tsx`）共用

### 接線

- `components/add-page-button.tsx`：新增「+ 錄音」按鈕（loading state 同既有模式）
- `components/book-editor-client.tsx`：`PageData.type` 加 `'audio'`、`durationSec?: number`；`selectedPage.type === 'audio'` 時渲染 `AudioRecorder`（頁型徽章顯示「錄音頁」）；文字說明沿用既有 `content` textarea 與 debounce 儲存
- `components/quick-capture-bar.tsx`：`OPTIONS` 新增 `{ mode: 'audio', label: '語音' }`。註：先前拿掉「影片」入口是因為錄影仍要到編輯頁才發生；「語音」不同——落地即是錄音介面，一步就能開錄，符合入口存在的理由
- `components/read-page-client.tsx`：`type === 'audio'` 渲染文字 + `AudioPlayer`；TOC 摘要沿用 content 文字

---

## 權限

沿用頁面既有規則，無新增權限概念：

| 動作 | Creator | Editor | Reader |
|------|---------|--------|--------|
| 新增/錄製/重錄 audio 頁 | ✓ | ✓ | ✗ |
| 播放 | ✓ | ✓ | ✓（有閱讀權時） |

---

## 測試計畫

專案沒有自動化測試框架，驗證方式為手動：

- Chrome（Android）與 Safari（iOS）各錄一段 → 對方瀏覽器可播放
- 錄音 → 重錄 → 上傳，S3 只留最終檔案路徑對應的 URL 寫入 page
- 拒絕麥克風權限 → 顯示引導文字，不白屏
- 錄到 10 分鐘自動停止並進入試聽
- Quick capture「語音」→ 落在錄音介面，書名為當日預設名
- Reader 開分享連結可播放；直接複製音檔 URL 貼到無痕視窗 → 403
- audio 頁可設定 `happenedAt`、可拖曳排序、可刪除（與其他頁型一致）

---

## File Map

- `lib/models/page.ts`：`type` enum 加 `'audio'`、新增 `durationSec`
- `app/api/upload/presign/route.ts`：`fileType` enum、contentType map
- `app/api/books/[bookId]/pages/route.ts`：`type` 驗證加 `'audio'`
- `app/api/books/[bookId]/pages/[pageId]/route.ts`：`PatchPageBody` 加 `durationSec`
- `lib/quick-capture.ts`、`app/api/books/quick/route.ts`：mode 加 `'audio'`
- `components/audio-recorder.tsx`（新）、`components/audio-player.tsx`（新）
- `components/add-page-button.tsx`、`components/quick-capture-bar.tsx`
- `components/book-editor-client.tsx`、`components/read-page-client.tsx`

---

## 後續演進

- **Whisper 自動轉錄**：錄音上傳後呼叫轉錄 API，結果填入 `content` 供編輯——讓語音備忘錄能被搜尋（標題/標籤搜尋之外的全文脈絡）
- **波形視覺化**：以 Web Audio API 畫靜態波形取代素進度條，強化「聲音的樣子」
- **MediaConvert 統一轉 AAC**：若相容性實測出問題，走方案 B 升級，`transcodingStatus` 欄位與 Lambda 管道皆現成
