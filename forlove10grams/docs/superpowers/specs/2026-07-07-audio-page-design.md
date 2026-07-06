# 設計規格 — 語音備忘錄頁面（audio page）

> 狀態：已確認（2026-07-07 討論後將自動轉錄納入本次範圍），待實作
> 日期：2026-07-07

---

## 背景與目標

`docs/backlog.md`「語音備忘錄頁面」項目：文字需要打字，照片需要構圖，語音只需要開口——但目前沒有音訊頁面類型。

這是「捕捉優先於整理」精神的延伸：潛水上岸手還濕著、走在路上不方便打字的場景，語音是摩擦最低的記錄方式。

**產品定調（2026-07-07 討論結論）**：這個功能同時滿足兩個心智模型——「錄音是內容」（聲音本身是記憶：語氣、喘氣、背景的海浪聲，鍵盤聽寫給不了）與「錄音是輸入法」（開口代替打字，快速記錄）。做法是合流：**聲音保留下來成為頁面內容，同時自動轉錄成文字草稿填入 `content` 供修剪**。記錄者得到速度，讀者得到可讀可略讀的文字，聲音還在。

**本次包含：**
- `Page.type` 新增 `'audio'` 頁型
- 編輯頁的錄音介面（瀏覽器 `MediaRecorder API`）：錄音、試聽、重錄、上傳
- 音檔存入 S3，沿用既有 presign 上傳流程與 CloudFront Signed URL 保護
- **上傳完成後自動轉錄**（OpenAI Whisper 系列 API）：結果寫入 `content` 成為可編輯草稿；繁體處理（prompt 提示 + OpenCC 保險）；轉錄狀態與失敗重試
- 閱讀頁的音訊播放器
- `AddPageButton` 新增「+ 錄音」、`QuickCaptureBar` 新增「語音」入口

**不包含：**
- 邊錄邊轉（裝置內建聽寫 / Web Speech API）——已評估並否決，理由見「方案取捨：轉錄路徑」
- 音訊波形視覺化（先用原生播放器樣式）
- 上傳既有音檔（只做「當場錄」；從檔案挑音檔留到有需求再說）
- MediaConvert 音訊轉檔管道（見「方案取捨：錄音格式」）

---

## 使用者故事

- 作為 creator，我剛結束一段經歷（潛水上岸、飯局散場），想直接對手機說話記下當下的想法，不需要打字
- 作為 creator，我想在錄完後先試聽，不滿意可以重錄，滿意才存進書裡
- 作為 creator，我錄完上傳後，幾秒內看到系統轉錄出的文字草稿出現在說明欄，我只需要修剪口語贅字，不用從零打字
- 作為 creator，轉錄失敗時我想按一下重試，而不是重錄一次
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
6. 上傳完成後自動開始轉錄：文字說明欄顯示「轉錄中…」，數秒後轉錄草稿出現在 `content` textarea，游標可直接修剪；轉錄失敗顯示「轉錄失敗，重試」按鈕，不影響已存好的錄音
7. 已有錄音的頁面顯示播放器 + 「重新錄製」按鈕（覆蓋原檔需確認；重錄後重新轉錄，覆蓋規則見 API 節）

### UC-2：快速記錄（語音）
1. Dashboard 的 `QuickCaptureBar` 點「語音」→ 建立當日快速記錄書（沿用 quick-capture 邏輯）+ 一個 audio page，直接落在編輯頁的錄音介面
2. 之後同 UC-1 步驟 2–5；書名事後再補

### UC-3：閱讀語音頁
1. Reader 捲動到語音頁，看到文字說明（若有）+ 播放器（播放鍵、進度條、時長）
2. 點播放即聽；音檔 URL 為 CloudFront Signed URL，直接分享 URL 給第三者無法播放

---

## 方案取捨

### 轉錄路徑（2026-07-07 討論結論）

想同時得到「錄音檔＋文字」，網頁載具上只有一條穩的路：**先錄完，再送 API 轉錄**。裝置內建方案已評估並否決：

| 路徑 | 為什麼不行 / 為什麼行 |
|------|----------------------|
| 鍵盤聽寫（iOS 鍵盤 / Gboard 麥克風鍵） | OS 層執行，網頁只收得到文字、**永遠拿不到音檔**；聽寫進行中 OS 佔用麥克風，`MediaRecorder` 同時開會搶輸。它是「使用者懶得打字」的既有解，與本功能互補而非競爭 |
| Web Speech API（`SpeechRecognition`） | 與 `MediaRecorder` 在手機上搶麥克風，同時開極不可靠（尤其 Android Chrome）；遇停頓自動結束、iOS Safari 行為不一致。等於把功能建在最脆弱的瀏覽器 API 上 |
| **錄完後送轉錄 API（採用）** | 音檔已在 S3，server 端呼叫 OpenAI Whisper 系列轉錄，寫回 `content`。穩定、幾秒完成 |
| 自架 whisper.cpp | 隱私最佳（音檔不出門）但要多養一個服務，對個人工具不成比例；列為隱私考量升高時的替代路徑 |

**成本**：whisper-1 為 $0.006/分鐘——每月 30 則 × 3 分鐘 ≈ US$0.54，可忽略。**已知代價**：(1) 隱私——音檔會送到 OpenAI（API 資料預設不用於訓練，已權衡接受）；(2) Whisper 對國語常輸出簡體——request 帶繁體 prompt 提示＋OpenCC `s2twp` 轉換雙保險；(3) 口語轉出來是流水帳——所以轉錄結果定位是**可編輯草稿**，不是成品。

### 錄音格式

錄音格式與相容性是本功能另一個技術風險。三個方案：

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
  transcriptionStatus?: 'pending' | 'done' | 'error'  // 新增：轉錄狀態（audio 頁專用）
}
```

```ts
type: { type: String, enum: ['carousel', 'video', 'audio'], required: true },
durationSec: { type: Number },
transcriptionStatus: { type: String, enum: ['pending', 'done', 'error'] },
```

- 不需要 migration：既有頁面不受影響
- `durationSec` 讓清單與播放器能顯示時長，不用先下載音檔才知道
- 一頁一段錄音（`mediaUrls[0]`）。「一頁多段錄音」沒有對應的使用場景，不做
- 轉錄文字**直接寫入既有的 `content` 欄位**，不另設 transcript 欄位——轉錄結果就是草稿，使用者修剪後它就是頁面文字，沒有「原始逐字稿要另外保存」的需求（要重聽有音檔在）
- `transcriptionStatus` 與影片的 `transcodingStatus` 是兩件事，刻意分開命名；讓重新整理頁面後仍能顯示「轉錄中／失敗重試」

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

### 轉錄（新）

`POST /api/books/[bookId]/pages/[pageId]/transcribe`：

- 權限：creator / editor（同頁面編輯權）
- 前置：該頁 `type === 'audio'` 且 `mediaUrls[0]` 存在，否則 400
- 行為：設 `transcriptionStatus = 'pending'` → 從 S3 讀音檔 → 呼叫 OpenAI 轉錄（`whisper-1` 起步，帶繁體中文 prompt）→ OpenCC `s2twp` 轉換 → 寫入 `content` → `transcriptionStatus = 'done'`。失敗設 `'error'` 並回 5xx
- **`content` 覆蓋規則**：`content` 為空時直接寫入；已有文字時**附加在既有文字之後**（隔一空行）——使用者先打了幾個字再錄音的場景不該被轉錄覆蓋
- 音檔只有幾分鐘、轉錄通常數秒到數十秒完成，route 內同步 await 即可，不需要 webhook / queue；client 端 await 這支 API 的回應來更新 textarea
- 重試 = 前端再打一次同一支 API（狀態為 `'error'` 時 UI 露出重試按鈕）
- 新增環境變數：`OPENAI_API_KEY`；新增依賴：`openai`、`opencc-js`

### 部署考量（Vercel serverless，2026-07-07 討論結論）

無 VM、無 Lambda——transcribe route 在 Vercel function 內做完整趟（S3 讀檔 → whisper-1 → OpenCC → 寫 DB），timeout 靠以下設計壓住：

- **route 設 `export const maxDuration = 300`**（Hobby 方案上限）。時間預算：S3 抓 5–10MB 約 1–2 秒；whisper-1 轉 1–3 分鐘備忘錄約 5–20 秒（典型情境），頂格 10 分鐘錄音約 30–60 秒（最壞情境）——錄音的 10 分鐘上限同時就是 timeout 的天花板，兩個限制互相支撐
- **whisper-1 維持預設**：文件最全、行為最被驗證。它相對 Groq 的劣勢是尾端變異（OpenAI 負載高峰時偶有慢回應），但失敗本來就由 `transcriptionStatus = 'error'` ＋重試按鈕接住，代價是多按一次，不是丟資料
- **Groq 是一行設定的替換選項**：API 為 OpenAI 相容格式，共用同一個 SDK，換 base URL 與 model 名即可（`whisper-large-v3-turbo` 轉 10 分鐘音檔僅數秒，且更便宜）。哪天嫌慢了再切，不是架構決策
- **client 斷線無害**：server 先寫 DB 再回應，瀏覽器請求中斷（行動網路不穩、使用者關頁）不會中斷 function 執行，重新整理即看到結果。若實測發現行動網路上長 await 體感太脆，可把前端改為輪詢 `transcriptionStatus`（欄位已備），server 流程不變
- **升級路徑**：若真實使用出現超時，沿影片轉檔的既有模式（S3 trigger → Lambda → 回寫）把轉錄搬進 Lambda，`transcriptionStatus` 與重試介面都不用改

### 播放授權（沿用既有）

音檔是單一檔案（非 HLS 分段），比照圖片以 `signImageUrl`（canned policy Signed URL）在 server 端簽章後交給前端 `<audio>`，不需要 Signed Cookie。`lib/sign-media.ts` 的 `signImageUrl` 改名或加一個語意化 alias（`signMediaUrl`）皆可，簽章邏輯不變。

---

## 前端

### `AudioRecorder`（新元件 `components/audio-recorder.tsx`）

- 狀態機：`idle → recording → preview → uploading → done`
- `MediaRecorder` mimeType 偵測：`MediaRecorder.isTypeSupported('audio/mp4')` 優先，退 `'audio/webm'`
- 錄音上限 10 分鐘（`setTimeout` 自動 stop）；Opus/AAC 語音 10 分鐘約 2–10MB，遠低於影片
- preview 階段以 blob URL 試聽；「使用這段錄音」才 presign + PUT 上傳，成功後 PATCH `mediaUrls` + `durationSec`（比照 `MediaUploader` 的 fire-and-forget）
- 上傳成功後緊接著呼叫 `POST .../transcribe` 並 await：等待期間 content textarea 上方顯示「轉錄中…」，成功後把回傳文字塞入 textarea（走既有 debounce 儲存已不需要——server 已寫入，前端只同步顯示）；失敗顯示「轉錄失敗，重試」按鈕。錄音本身的成功與否**不受轉錄影響**——轉錄壞了音檔還是好好的
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
- 錄一段國語 → 轉錄結果為繁體中文，數秒內出現在 textarea
- content 已有文字時錄音 → 轉錄結果附加在原文之後，不覆蓋
- 中斷網路讓轉錄失敗 → 顯示重試按鈕，音檔仍可播放；按重試成功補上文字
- 轉錄中重新整理頁面 → 依 `transcriptionStatus` 正確顯示狀態，不卡在假的「轉錄中」
- 錄滿 10 分鐘上限的音檔（部署在 Vercel 後測）→ 轉錄在 `maxDuration` 內完成，不觸發 function timeout
- 轉錄等待中把頁面關掉 → 重新打開後文字已在（server 先寫 DB 的行為驗證）

---

## File Map

- `lib/models/page.ts`：`type` enum 加 `'audio'`、新增 `durationSec`、`transcriptionStatus`
- `app/api/upload/presign/route.ts`：`fileType` enum、contentType map
- `app/api/books/[bookId]/pages/route.ts`：`type` 驗證加 `'audio'`
- `app/api/books/[bookId]/pages/[pageId]/route.ts`：`PatchPageBody` 加 `durationSec`
- `app/api/books/[bookId]/pages/[pageId]/transcribe/route.ts`（新）：轉錄
- `lib/transcribe.ts`（新）：OpenAI 呼叫 + 繁體 prompt + OpenCC 轉換
- `lib/quick-capture.ts`、`app/api/books/quick/route.ts`：mode 加 `'audio'`
- `components/audio-recorder.tsx`（新）、`components/audio-player.tsx`（新）
- `components/add-page-button.tsx`、`components/quick-capture-bar.tsx`
- `components/book-editor-client.tsx`、`components/read-page-client.tsx`

---

## 後續演進

- **波形視覺化**：以 Web Audio API 畫靜態波形取代素進度條，強化「聲音的樣子」
- **MediaConvert 統一轉 AAC**：若相容性實測出問題，走方案 B 升級，`transcodingStatus` 欄位與 Lambda 管道皆現成
- **自架 whisper.cpp**：若對「音檔送第三方」的隱私權衡改變，轉錄可換成自架服務，API 介面不變
- **轉錄服務切換**：Groq（OpenAI 相容 API，換 base URL＋model 名即可）更快更便宜，`gpt-4o-mini-transcribe` 約半價；起步用 `whisper-1` 是為了文件與生態最省事，嫌慢或量大再切，見「部署考量」
- **Lambda 轉錄管道**：實際使用中若 Vercel function 超時成為常態，沿影片轉檔模式搬進 Lambda，前端介面不變
