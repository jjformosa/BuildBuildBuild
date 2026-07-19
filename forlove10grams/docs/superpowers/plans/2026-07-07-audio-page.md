# Audio Page (語音備忘錄頁面) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `'audio'` page type so creators/editors can record a voice memo in the browser, store it in S3, auto-transcribe it into an editable text draft, and let readers play it back.

**Architecture:** Extend the existing `Page` model with `'audio'` in its `type` enum plus `durationSec` and `transcriptionStatus` fields. Reuse the existing presign → S3 PUT → PATCH `mediaUrls` upload flow (same as `MediaUploader`) with a new `MediaRecorder`-based `AudioRecorder` component. After upload, the client calls a new synchronous `transcribe` route that reads the audio from S3, calls OpenAI Whisper, converts to Traditional Chinese with OpenCC, and writes the draft into the page's existing `content` field. Playback uses a new `AudioPlayer` wrapping native `<audio>`, with the URL signed by the existing `signImageUrl` (canned-policy CloudFront Signed URL — audio is a single file, no HLS/Signed-Cookie needed).

**Tech Stack:** Next.js App Router, React 19, TypeScript, Mongoose, Zod, browser `MediaRecorder API`, OpenAI SDK (`openai`), `opencc-js`. No test framework — verification is `npx tsc --noEmit`, `npm run lint`, and manual browser checks.

## Global Constraints

- No automated test framework exists in this project — do not add one. Verification is `cd forlove10grams && npx tsc --noEmit`, `npm run lint`, and manual browser checks. (This mirrors the established `2026-07-03-*` plans.)
- All paths below are relative to the repo root; source lives under `forlove10grams/`.
- One page = one recording. Store the audio URL in `mediaUrls[0]` (do NOT add a new field for it).
- Transcription writes into the **existing `content` field**, not a new field. When `content` is non-empty, **append** the transcript after the existing text separated by a blank line — never overwrite.
- Recording cap is **10 minutes** (client auto-stops). This cap is also the transcription time-budget ceiling.
- Recording format: use `MediaRecorder` with `audio/mp4` preferred, fall back to `audio/webm` — direct upload, **no** transcoding pipeline. `transcodingStatus` is NOT used for audio pages.
- `transcriptionStatus` (`'pending' | 'done' | 'error'`) is a separate field from video's `transcodingStatus` — do not conflate them.
- Only use transcription services that explicitly state "API data is not used for model training" (OpenAI API and Groq both qualify). Start with OpenAI `whisper-1`.
- **Privacy policy update (Task 12) and the feature must ship together** — do not merge the feature without the policy change.
- Audio playback URLs must be signed server-side (never expose a raw public URL): use `signImageUrl` for `type === 'audio'` exactly where carousel images are signed today.
- Spec: `docs/superpowers/specs/2026-07-07-audio-page-design.md`

---

### Task 1: Add `'audio'` type + audio fields to the Page model

**Files:**
- Modify: `forlove10grams/lib/models/page.ts`

**Interfaces:**
- Produces: `IPage.type` now includes `'audio'`; `IPage.durationSec?: number`; `IPage.transcriptionStatus?: 'pending' | 'done' | 'error'`. Later tasks read/write these by name.

- [ ] **Step 1: Extend the interface**

Find:

```ts
export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
  happenedAt?: Date
}
```

Replace with:

```ts
export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video' | 'audio'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
  happenedAt?: Date
  durationSec?: number
  transcriptionStatus?: 'pending' | 'done' | 'error'
}
```

- [ ] **Step 2: Extend the schema**

Find:

```ts
    type: { type: String, enum: ['carousel', 'video'], required: true },
    content: String,
    mediaUrls: [{ type: String }],
    transcodingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'error'],
    },
    happenedAt: { type: Date },
```

Replace with:

```ts
    type: { type: String, enum: ['carousel', 'video', 'audio'], required: true },
    content: String,
    mediaUrls: [{ type: String }],
    transcodingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'error'],
    },
    happenedAt: { type: Date },
    durationSec: { type: Number },
    transcriptionStatus: {
      type: String,
      enum: ['pending', 'done', 'error'],
    },
```

- [ ] **Step 3: Typecheck**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to `lib/models/page.ts`. (Other files referencing the narrower `'carousel' | 'video'` union will be updated in later tasks — if any pre-existing file errors here, note it; none should since the union only widened.)

- [ ] **Step 4: Commit**

```bash
git add forlove10grams/lib/models/page.ts
git commit -m "feat: add audio page type and audio fields to Page model"
```

---

### Task 2: Support audio uploads in the presign route

**Files:**
- Modify: `forlove10grams/app/api/upload/presign/route.ts`

**Interfaces:**
- Consumes: `IPage` audio type from Task 1.
- Produces: `POST /api/upload/presign` accepts `fileType: 'audio'` (requires `pageId`) and returns `{ presignedUrl, s3Key, s3Url, signedUrl }` for an audio S3 key `books/{bookId}/pages/{pageId}/audio.{ext}`.

- [ ] **Step 1: Add `'audio'` to the `fileType` enum**

Find:

```ts
  fileType: z.enum(['carousel', 'video', 'cover']),
```

Replace with:

```ts
  fileType: z.enum(['carousel', 'video', 'cover', 'audio']),
```

- [ ] **Step 2: Add audio content types to `extFromContentType`**

Find:

```ts
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
  }
```

Replace with:

```ts
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'audio/mp4': 'm4a',
    'audio/webm': 'weba',
    'audio/mpeg': 'mp3',
  }
```

- [ ] **Step 3: Add the audio branch to the S3 key builder**

Find:

```ts
  } else if (fileType === 'video') {
    if (!pageId) return Response.json({ error: 'pageId required for video' }, { status: 400 })
    s3Key = `books/${bookId}/pages/${pageId}/video-raw.${ext}`
  } else {
```

Replace with:

```ts
  } else if (fileType === 'video') {
    if (!pageId) return Response.json({ error: 'pageId required for video' }, { status: 400 })
    s3Key = `books/${bookId}/pages/${pageId}/video-raw.${ext}`
  } else if (fileType === 'audio') {
    if (!pageId) return Response.json({ error: 'pageId required for audio' }, { status: 400 })
    s3Key = `books/${bookId}/pages/${pageId}/audio.${ext}`
  } else {
```

The existing `if (fileType === 'video' && pageId)` block that sets `transcodingStatus: 'pending'` is left untouched — audio does not transcode, so it correctly skips that block.

- [ ] **Step 4: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to `app/api/upload/presign/route.ts`.

- [ ] **Step 5: Commit**

```bash
git add "forlove10grams/app/api/upload/presign/route.ts"
git commit -m "feat: presign audio uploads"
```

---

### Task 3: Accept audio in page CRUD routes and sign audio URLs on read

**Files:**
- Modify: `forlove10grams/app/api/books/[bookId]/pages/route.ts`
- Modify: `forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts`

**Interfaces:**
- Consumes: `IPage` audio fields from Task 1.
- Produces:
  - `POST /api/books/[bookId]/pages` accepts `type: 'audio'`.
  - `PATCH /api/books/[bookId]/pages/[pageId]` accepts `durationSec: number` (optional).
  - Both `GET`s return audio pages with `mediaUrls` signed and include `durationSec` and `transcriptionStatus`.

- [ ] **Step 1: `pages/route.ts` — accept `'audio'` in `CreatePageBody`**

Find:

```ts
const CreatePageBody = z.object({
  type: z.enum(['carousel', 'video']),
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
})
```

Replace with:

```ts
const CreatePageBody = z.object({
  type: z.enum(['carousel', 'video', 'audio']),
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
})
```

- [ ] **Step 2: `pages/route.ts` — sign audio URLs and expose audio fields in the batch `GET`**

Find:

```ts
    .map((p) => ({
      _id: p!._id.toString(),
      type: p!.type,
      content: p!.content ?? '',
      mediaUrls: p!.type === 'carousel' ? p!.mediaUrls.map(signImageUrl) : p!.mediaUrls,
      transcodingStatus: p!.transcodingStatus ?? null,
    }))
```

Replace with:

```ts
    .map((p) => ({
      _id: p!._id.toString(),
      type: p!.type,
      content: p!.content ?? '',
      mediaUrls: p!.type === 'video' ? p!.mediaUrls : p!.mediaUrls.map(signImageUrl),
      transcodingStatus: p!.transcodingStatus ?? null,
      durationSec: p!.durationSec ?? null,
      transcriptionStatus: p!.transcriptionStatus ?? null,
    }))
```

(The ternary flips from "sign only carousel" to "sign everything except video" so `audio` gets a signed CloudFront URL. Carousel behavior is unchanged.)

- [ ] **Step 3: `pages/[pageId]/route.ts` — sign audio URLs and expose audio fields in the single-page `GET`**

Find:

```ts
  return Response.json({
    _id: page._id.toString(),
    transcodingStatus: page.transcodingStatus ?? null,
    mediaUrls: page.type === 'carousel' ? page.mediaUrls.map(signImageUrl) : page.mediaUrls,
  })
```

Replace with:

```ts
  return Response.json({
    _id: page._id.toString(),
    transcodingStatus: page.transcodingStatus ?? null,
    transcriptionStatus: page.transcriptionStatus ?? null,
    durationSec: page.durationSec ?? null,
    content: page.content ?? '',
    mediaUrls: page.type === 'video' ? page.mediaUrls : page.mediaUrls.map(signImageUrl),
  })
```

- [ ] **Step 4: `pages/[pageId]/route.ts` — accept `durationSec` in `PatchPageBody`**

Find:

```ts
const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  happenedAt: z.string().nullable().optional(),
})
```

Replace with:

```ts
const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  happenedAt: z.string().nullable().optional(),
  durationSec: z.number().optional(),
})
```

`Object.assign(page, parsed.data)` (already present) writes `durationSec` the same way it writes `mediaUrls`.

- [ ] **Step 5: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to either route file.

- [ ] **Step 6: Commit**

```bash
git add "forlove10grams/app/api/books/[bookId]/pages/route.ts" "forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts"
git commit -m "feat: accept audio pages and sign audio URLs in page routes"
```

---

### Task 4: Add the transcription library

**Files:**
- Create: `forlove10grams/lib/transcribe.ts`
- Modify: `forlove10grams/package.json` (via install command)

**Interfaces:**
- Produces: `transcribeAudio(audioUrl: string): Promise<string>` — fetches the audio at `audioUrl`, transcribes it with OpenAI Whisper, returns Traditional-Chinese text. Throws on failure.

- [ ] **Step 1: Install dependencies (manual — do NOT run for the user)**

Provide this command for the user to run:

```bash
cd forlove10grams && npm install openai opencc-js && npm install -D @types/opencc-js
```

Wait for confirmation that install succeeded before continuing. (`opencc-js` ships without bundled types in some versions; if `@types/opencc-js` fails to resolve, add a one-line module declaration in Step 3's note instead.)

- [ ] **Step 2: Create `lib/transcribe.ts`**

```ts
import OpenAI from 'openai'
import * as OpenCC from 'opencc-js'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Simplified/other → Traditional Chinese (Taiwan) with phrase conversion.
const toTraditional = OpenCC.Converter({ from: 'cn', to: 'twp' })

/**
 * Fetches the audio at `audioUrl` and returns a Traditional-Chinese transcript.
 * Throws if the fetch or the OpenAI call fails.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const res = await fetch(audioUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch audio for transcription: ${res.status}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'audio/mp4'
  const file = new File([arrayBuffer], 'audio', { type: contentType })

  const result = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'zh',
    // Prompt nudges Whisper toward Traditional Chinese; OpenCC is the safety net.
    prompt: '以下是一段繁體中文的語音備忘錄，請以繁體中文轉錄。',
  })

  return toTraditional(result.text)
}
```

- [ ] **Step 3: Typecheck**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to `lib/transcribe.ts`. If TypeScript reports "Could not find a declaration file for module 'opencc-js'", create `forlove10grams/types/opencc-js.d.ts` with:

```ts
declare module 'opencc-js' {
  export function Converter(opts: { from: string; to: string }): (text: string) => string
}
```

and re-run the typecheck.

- [ ] **Step 4: Commit**

```bash
git add forlove10grams/lib/transcribe.ts forlove10grams/package.json forlove10grams/package-lock.json
git add forlove10grams/types/opencc-js.d.ts 2>/dev/null || true
git commit -m "feat: add audio transcription library (OpenAI Whisper + OpenCC)"
```

---

### Task 5: Add the transcription API route

**Files:**
- Create: `forlove10grams/app/api/books/[bookId]/pages/[pageId]/transcribe/route.ts`

**Interfaces:**
- Consumes: `transcribeAudio` (Task 4), `IPage.transcriptionStatus`/`durationSec` (Task 1), `signImageUrl` (existing).
- Produces: `POST /api/books/[bookId]/pages/[pageId]/transcribe` → on success `{ content: string, transcriptionStatus: 'done' }`; on failure `{ error }` with 5xx and `transcriptionStatus` set to `'error'` in the DB.

- [ ] **Step 1: Create the route**

```ts
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { canEditBook } from '@/lib/access'
import { signImageUrl } from '@/lib/sign-media'
import { transcribeAudio } from '@/lib/transcribe'

// Whole trip (S3 read → Whisper → OpenCC → DB write) runs in one function.
// 10-min recording cap keeps this comfortably under the Hobby-plan ceiling.
export const maxDuration = 300

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string; pageId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, pageId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!canEditBook(session.user.id!, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const page = await Page.findOne({ _id: pageId, bookId: book._id })
  if (!page) return Response.json({ error: 'Page not found' }, { status: 404 })
  if (page.type !== 'audio' || !page.mediaUrls[0]) {
    return Response.json({ error: 'Page has no audio to transcribe' }, { status: 400 })
  }

  page.transcriptionStatus = 'pending'
  await page.save()

  try {
    // Re-sign from the stored URL so the fetch always uses a fresh, valid Signed URL.
    const audioUrl = signImageUrl(page.mediaUrls[0])
    const transcript = await transcribeAudio(audioUrl)

    const existing = (page.content ?? '').trim()
    const merged = existing ? `${existing}\n\n${transcript}` : transcript

    page.content = merged
    page.transcriptionStatus = 'done'
    await page.save()

    return Response.json({ content: merged, transcriptionStatus: 'done' })
  } catch (err) {
    console.error('transcribe failed:', err)
    page.transcriptionStatus = 'error'
    await page.save()
    return Response.json({ error: '轉錄失敗，請重試' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Add the env var placeholder (manual)**

Tell the user to add `OPENAI_API_KEY=...` to `forlove10grams/.env.local` (and to the Vercel project env). Do not commit real keys.

- [ ] **Step 3: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to the new route.

- [ ] **Step 4: Commit**

```bash
git add "forlove10grams/app/api/books/[bookId]/pages/[pageId]/transcribe/route.ts"
git commit -m "feat: add audio transcription route"
```

---

### Task 6: Add the `'audio'` quick-capture mode

**Files:**
- Modify: `forlove10grams/lib/quick-capture.ts`
- Modify: `forlove10grams/components/quick-capture-bar.tsx`

**Interfaces:**
- Consumes: `POST /api/books/quick` (unchanged — it already calls `pageTypeForQuickCaptureMode`).
- Produces: `QuickCaptureMode` includes `'audio'`; `pageTypeForQuickCaptureMode('audio') === 'audio'`.

- [ ] **Step 1: `lib/quick-capture.ts` — add `'audio'` to modes and the page-type mapping**

Find:

```ts
export const QUICK_CAPTURE_MODES = ['photo', 'video', 'text'] as const

export type QuickCaptureMode = (typeof QUICK_CAPTURE_MODES)[number]
export type QuickCapturePageType = 'carousel' | 'video'
```

Replace with:

```ts
export const QUICK_CAPTURE_MODES = ['photo', 'video', 'text', 'audio'] as const

export type QuickCaptureMode = (typeof QUICK_CAPTURE_MODES)[number]
export type QuickCapturePageType = 'carousel' | 'video' | 'audio'
```

Then find:

```ts
export function pageTypeForQuickCaptureMode(
  mode: QuickCaptureMode,
): QuickCapturePageType {
  return mode === 'video' ? 'video' : 'carousel'
}
```

Replace with:

```ts
export function pageTypeForQuickCaptureMode(
  mode: QuickCaptureMode,
): QuickCapturePageType {
  if (mode === 'video') return 'video'
  if (mode === 'audio') return 'audio'
  return 'carousel'
}
```

- [ ] **Step 2: `components/quick-capture-bar.tsx` — add the 語音 entry**

Find:

```ts
const OPTIONS: Array<{ mode: QuickCaptureMode; label: string }> = [
  { mode: 'photo', label: '照片' },
  { mode: 'text', label: '文字' },
]
```

Replace with:

```ts
const OPTIONS: Array<{ mode: QuickCaptureMode; label: string }> = [
  { mode: 'photo', label: '照片' },
  { mode: 'text', label: '文字' },
  { mode: 'audio', label: '語音' },
]
```

(The buttons render in a `grid-cols-3` on mobile — three options fit the existing grid exactly.)

- [ ] **Step 3: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to either file.

- [ ] **Step 4: Commit**

```bash
git add forlove10grams/lib/quick-capture.ts forlove10grams/components/quick-capture-bar.tsx
git commit -m "feat: add audio quick-capture mode and 語音 entry"
```

---

### Task 7: Build the `AudioPlayer` component

**Files:**
- Create: `forlove10grams/components/audio-player.tsx`

**Interfaces:**
- Produces: `AudioPlayer` — `export function AudioPlayer({ url, durationSec }: { url: string; durationSec?: number | null }): JSX.Element`. Used by both the editor and the reader.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useRef, useState } from 'react'

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AudioPlayer({
  url,
  durationSec,
}: {
  url: string
  durationSec?: number | null
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(durationSec ?? 0)

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (playing) el.pause()
    else el.play()
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current
    if (!el) return
    const t = Number(e.target.value)
    el.currentTime = t
    setCurrent(t)
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-card px-4 py-3">
      <button
        onClick={toggle}
        aria-label={playing ? '暫停' : '播放'}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={current}
        onChange={onSeek}
        className="flex-1 accent-primary"
        aria-label="播放進度"
      />
      <span className="flex-none text-xs tabular-nums text-muted-foreground">
        {formatTime(current)} / {formatTime(duration)}
      </span>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to `components/audio-player.tsx`.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/components/audio-player.tsx
git commit -m "feat: add AudioPlayer component"
```

---

### Task 8: Build the `AudioRecorder` component

**Files:**
- Create: `forlove10grams/components/audio-recorder.tsx`

**Interfaces:**
- Consumes: `POST /api/upload/presign` (audio, Task 2), `PATCH /api/books/[bookId]/pages/[pageId]` (`mediaUrls` + `durationSec`, Task 3), `POST .../transcribe` (Task 5), `AudioPlayer` (Task 7).
- Produces: `AudioRecorder` — `export function AudioRecorder({ bookId, pageId, mediaUrls, durationSec, onSaved, onTranscribed }: { bookId: string; pageId: string; mediaUrls: string[]; durationSec?: number | null; onSaved: (url: string, durationSec: number) => void; onTranscribed: (content: string) => void }): JSX.Element`.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AudioPlayer } from '@/components/audio-player'

type State = 'idle' | 'recording' | 'preview' | 'uploading' | 'done'

const MAX_MS = 10 * 60 * 1000 // 10-minute cap

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return ''
}

export function AudioRecorder({
  bookId,
  pageId,
  mediaUrls,
  durationSec,
  onSaved,
  onTranscribed,
}: {
  bookId: string
  pageId: string
  mediaUrls: string[]
  durationSec?: number | null
  onSaved: (url: string, durationSec: number) => void
  onTranscribed: (content: string) => void
}) {
  const hasAudio = mediaUrls.length > 0
  const [state, setState] = useState<State>(hasAudio ? 'done' : 'idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const startedAtRef = useRef<number>(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  async function startRecording() {
    setError(null)
    const mimeType = pickMimeType()
    if (!mimeType) {
      setError('這個瀏覽器不支援錄音')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('請在瀏覽器設定允許麥克風')
      return
    }
    streamRef.current = stream
    chunksRef.current = []
    const recorder = new MediaRecorder(stream, { mimeType })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      blobRef.current = blob
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = URL.createObjectURL(blob)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setState('preview')
    }
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    setElapsed(0)
    recorder.start()
    setState('recording')
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 250)
    stopTimerRef.current = setTimeout(stopRecording, MAX_MS)
  }

  function stopRecording() {
    if (tickRef.current) clearInterval(tickRef.current)
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    recorderRef.current?.stop()
  }

  function discardPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    blobRef.current = null
    setState('idle')
    setElapsed(0)
  }

  async function useRecording() {
    const blob = blobRef.current
    if (!blob) return
    setState('uploading')
    setProgress(0)
    setError(null)
    const recordedSec = elapsed
    const contentType = blob.type || 'audio/mp4'

    // 1. presign
    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, pageId, fileType: 'audio', contentType }),
    })
    if (!presignRes.ok) {
      setError('無法取得上傳連結')
      setState('preview')
      setProgress(null)
      return
    }
    const { presignedUrl, s3Url, signedUrl } = await presignRes.json()

    // 2. PUT to S3
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`S3 ${xhr.status}`)))
        xhr.onerror = () => reject(new Error('網路錯誤'))
        xhr.open('PUT', presignedUrl)
        xhr.setRequestHeader('Content-Type', contentType)
        xhr.send(blob)
      })
    } catch (err) {
      setError((err as Error).message)
      setState('preview')
      setProgress(null)
      return
    }

    // 3. PATCH mediaUrls + durationSec (fire-and-forget style like MediaUploader)
    const finalUrl = signedUrl || s3Url
    await fetch(`/api/books/${bookId}/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaUrls: [finalUrl], durationSec: recordedSec }),
    })
    onSaved(finalUrl, recordedSec)
    setProgress(null)
    setState('done')

    // 4. transcribe (await; recording is already saved regardless of outcome)
    runTranscribe()
  }

  async function runTranscribe() {
    setTranscribing(true)
    setTranscribeError(false)
    try {
      const res = await fetch(`/api/books/${bookId}/pages/${pageId}/transcribe`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('transcribe failed')
      const data: { content: string } = await res.json()
      onTranscribed(data.content)
    } catch {
      setTranscribeError(true)
    } finally {
      setTranscribing(false)
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        錄音會傳送至外部服務進行轉錄。{' '}
        <Link href="/privacy" className="underline underline-offset-2">
          隱私說明
        </Link>
      </p>

      {state === 'idle' && (
        <button
          onClick={startRecording}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose/30 bg-rose/10 py-4 text-sm font-medium text-rose transition-colors hover:bg-rose/15"
        >
          ● 開始錄音
        </button>
      )}

      {state === 'recording' && (
        <div className="flex items-center justify-between rounded-xl border border-rose/30 bg-rose/10 px-4 py-4">
          <span className="text-sm font-medium tabular-nums text-rose">● {mm}:{ss}</span>
          <button onClick={stopRecording} className="btn-outline-xs">
            ■ 停止
          </button>
        </div>
      )}

      {state === 'preview' && previewUrlRef.current && (
        <div className="space-y-2">
          <AudioPlayer url={previewUrlRef.current} durationSec={elapsed} />
          <div className="flex gap-2">
            <button onClick={discardPreview} className="btn-outline-xs flex-1">
              重錄
            </button>
            <button
              onClick={useRecording}
              className="flex-1 rounded-md bg-primary py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
            >
              使用這段錄音
            </button>
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <div>
          <p className="text-xs text-foreground/50">上傳中 {progress ?? 0}%</p>
          <div className="mt-1 h-1.5 w-full rounded-full bg-foreground/10">
            <div className="h-1.5 rounded-full bg-foreground/50 transition-all" style={{ width: `${progress ?? 0}%` }} />
          </div>
        </div>
      )}

      {state === 'done' && (
        <div className="space-y-2">
          {mediaUrls[0] && <AudioPlayer url={mediaUrls[0]} durationSec={durationSec} />}
          <div className="flex items-center gap-3">
            <button onClick={() => setState('idle')} className="btn-outline-xs">
              重新錄製
            </button>
            {transcribing && <span className="text-xs text-muted-foreground">轉錄中…</span>}
            {transcribeError && (
              <button onClick={runTranscribe} className="text-xs text-rose underline underline-offset-2">
                轉錄失敗，重試
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to `components/audio-recorder.tsx`.

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/components/audio-recorder.tsx
git commit -m "feat: add AudioRecorder component"
```

---

### Task 9: Wire audio into the book editor

**Files:**
- Modify: `forlove10grams/components/book-editor-client.tsx`
- Modify: `forlove10grams/app/books/[bookId]/edit/page.tsx`
- Modify: `forlove10grams/components/add-page-button.tsx`

**Interfaces:**
- Consumes: `AudioRecorder` (Task 8), audio page routes (Task 3), `IPage.durationSec` (Task 1).
- Produces: `PageData.type` includes `'audio'`; `PageData.durationSec?: number | null`; editor renders `AudioRecorder` for audio pages; add-page controls include a `錄音` option.

- [ ] **Step 1: `book-editor-client.tsx` — widen `PageData`**

Find:

```ts
export type PageData = {
  _id: string
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  happenedAt?: string | null
}
```

Replace with:

```ts
export type PageData = {
  _id: string
  type: 'carousel' | 'video' | 'audio'
  content?: string
  mediaUrls: string[]
  happenedAt?: string | null
  durationSec?: number | null
}
```

- [ ] **Step 2: `book-editor-client.tsx` — import `AudioRecorder`**

Find:

```ts
import { MediaUploader } from '@/components/media-uploader'
import TagManagerModal from '@/components/tag-manager-modal'
```

Replace with:

```ts
import { MediaUploader } from '@/components/media-uploader'
import { AudioRecorder } from '@/components/audio-recorder'
import TagManagerModal from '@/components/tag-manager-modal'
```

- [ ] **Step 3: `book-editor-client.tsx` — widen the two add-page button tuples and `handleAddPage`**

There are three `'carousel' | 'video'` occurrences tied to adding pages. Update each:

(a) `handleAddPage` signature — find:

```ts
  async function handleAddPage(type: 'carousel' | 'video') {
```

Replace with:

```ts
  async function handleAddPage(type: 'carousel' | 'video' | 'audio') {
```

(b) `addingType` state — find:

```ts
  const [addingType, setAddingType] = useState<'carousel' | 'video' | null>(null)
```

Replace with:

```ts
  const [addingType, setAddingType] = useState<'carousel' | 'video' | 'audio' | null>(null)
```

(c) desktop sidebar add buttons — find:

```tsx
              {(['carousel', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddPage(type)}
                  disabled={addingType !== null}
                  className="flex-1 rounded-md border border-foreground/20 py-1.5 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40 transition-colors"
                >
                  {addingType === type ? '新增中…' : type === 'carousel' ? '+ 輪播' : '+ 影片'}
                </button>
              ))}
```

Replace with:

```tsx
              {(['carousel', 'video', 'audio'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddPage(type)}
                  disabled={addingType !== null}
                  className="flex-1 rounded-md border border-foreground/20 py-1.5 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40 transition-colors"
                >
                  {addingType === type
                    ? '新增中…'
                    : type === 'carousel'
                      ? '+ 輪播'
                      : type === 'video'
                        ? '+ 影片'
                        : '+ 錄音'}
                </button>
              ))}
```

(d) mobile add buttons — find:

```tsx
              (['carousel', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddPage(type)}
                  disabled={addingType !== null}
                  className="btn-outline-xs flex-none min-h-[44px]"
                >
                  {addingType === type ? '…' : type === 'carousel' ? '+ 輪播' : '+ 影片'}
                </button>
              ))
```

Replace with:

```tsx
              (['carousel', 'video', 'audio'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddPage(type)}
                  disabled={addingType !== null}
                  className="btn-outline-xs flex-none min-h-[44px]"
                >
                  {addingType === type
                    ? '…'
                    : type === 'carousel'
                      ? '+ 輪播'
                      : type === 'video'
                        ? '+ 影片'
                        : '+ 錄音'}
                </button>
              ))
```

- [ ] **Step 4: `book-editor-client.tsx` — carry `durationSec` when a new page is created**

Find:

```ts
        const newPage: PageData = {
          _id: raw._id,
          type: raw.type,
          content: raw.content,
          mediaUrls: raw.mediaUrls ?? [],
          happenedAt: raw.happenedAt ?? null,
        }
```

Replace with:

```ts
        const newPage: PageData = {
          _id: raw._id,
          type: raw.type,
          content: raw.content,
          mediaUrls: raw.mediaUrls ?? [],
          happenedAt: raw.happenedAt ?? null,
          durationSec: raw.durationSec ?? null,
        }
```

- [ ] **Step 5: `book-editor-client.tsx` — update page-type badges to show 錄音頁**

Find the header badge:

```tsx
                <span className="rounded bg-foreground/8 px-2 py-0.5 text-xs text-foreground/60">
                  {selectedPage.type === 'carousel' ? '輪播頁' : '影片頁'}
                </span>
```

Replace with:

```tsx
                <span className="rounded bg-foreground/8 px-2 py-0.5 text-xs text-foreground/60">
                  {selectedPage.type === 'carousel' ? '輪播頁' : selectedPage.type === 'video' ? '影片頁' : '錄音頁'}
                </span>
```

(The sidebar and mobile-tab short labels `輪播`/`影片` will show `影片` for audio if left as-is — update them too for correctness. Find each `page.type === 'carousel' ? '輪播' : '影片'` occurrence and replace with `page.type === 'carousel' ? '輪播' : page.type === 'video' ? '影片' : '錄音'`. There are two: the `SortablePageItem` badge and the mobile tab label.)

- [ ] **Step 6: `book-editor-client.tsx` — render `AudioRecorder` for audio pages**

Find the media section:

```tsx
              <div
                ref={mediaSectionRef}
                className={`rounded-xl transition-all duration-300 ${
                  quickHighlight === 'media'
                    ? 'bg-primary/5 ring-2 ring-primary/25 ring-offset-4 ring-offset-background p-3'
                    : ''
                }`}
              >
                <p className="mb-2 text-xs text-foreground/50">
                  {selectedPage.type === 'carousel' ? '圖片（可多張）' : '影片'}
                </p>
                <MediaUploader
                  bookId={bookId}
                  pageId={selectedPage._id}
                  fileType={selectedPage.type}
                  mediaUrls={selectedPage.mediaUrls}
                  onUrlsChange={handleMediaUrlsChange}
                />
              </div>
```

Replace with:

```tsx
              <div
                ref={mediaSectionRef}
                className={`rounded-xl transition-all duration-300 ${
                  quickHighlight === 'media'
                    ? 'bg-primary/5 ring-2 ring-primary/25 ring-offset-4 ring-offset-background p-3'
                    : ''
                }`}
              >
                <p className="mb-2 text-xs text-foreground/50">
                  {selectedPage.type === 'carousel' ? '圖片（可多張）' : selectedPage.type === 'video' ? '影片' : '錄音'}
                </p>
                {selectedPage.type === 'audio' ? (
                  <AudioRecorder
                    bookId={bookId}
                    pageId={selectedPage._id}
                    mediaUrls={selectedPage.mediaUrls}
                    durationSec={selectedPage.durationSec}
                    onSaved={(url, durationSec) =>
                      setPages((prev) =>
                        prev.map((p) =>
                          p._id === selectedPage._id ? { ...p, mediaUrls: [url], durationSec } : p,
                        ),
                      )
                    }
                    onTranscribed={(content) =>
                      setPages((prev) =>
                        prev.map((p) => (p._id === selectedPage._id ? { ...p, content } : p)),
                      )
                    }
                  />
                ) : (
                  <MediaUploader
                    bookId={bookId}
                    pageId={selectedPage._id}
                    fileType={selectedPage.type}
                    mediaUrls={selectedPage.mediaUrls}
                    onUrlsChange={handleMediaUrlsChange}
                  />
                )}
              </div>
```

Note: `MediaUploader`'s `fileType` prop is typed `'carousel' | 'video'`; because the audio branch is handled separately, TypeScript narrows `selectedPage.type` to `'carousel' | 'video'` inside the `else`, so no prop-type change is needed.

- [ ] **Step 7: `app/books/[bookId]/edit/page.tsx` — sign audio URLs and pass `durationSec`**

Find:

```ts
  const pages: PageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content,
    mediaUrls: p.type === 'carousel' ? p.mediaUrls.map(signImageUrl) : p.mediaUrls,
    happenedAt: p.happenedAt ? p.happenedAt.toISOString().slice(0, 10) : null,
  }))
```

Replace with:

```ts
  const pages: PageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content,
    mediaUrls: p.type === 'video' ? p.mediaUrls : p.mediaUrls.map(signImageUrl),
    happenedAt: p.happenedAt ? p.happenedAt.toISOString().slice(0, 10) : null,
    durationSec: p.durationSec ?? null,
  }))
```

(Confirm this file imports `signImageUrl` already; the happenedAt plan established this mapping. If the exact `.map` shape differs, adjust the two changed lines — sign non-video, add `durationSec` — without touching the rest.)

- [ ] **Step 8: `components/add-page-button.tsx` — add a 錄音 option**

This standalone component mirrors the editor's add buttons. Replace its entire body to include audio:

Find:

```tsx
export function AddPageButton({ bookId }: { bookId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'carousel' | 'video' | null>(null)

  async function addPage(type: 'carousel' | 'video') {
    setLoading(type)
    try {
      await fetch(`/api/books/${bookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => addPage('carousel')}
        disabled={loading !== null}
        className="flex-1 rounded-md border border-foreground/20 py-1.5 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40 transition-colors"
      >
        {loading === 'carousel' ? '新增中…' : '+ 輪播'}
      </button>
      <button
        onClick={() => addPage('video')}
        disabled={loading !== null}
        className="flex-1 rounded-md border border-foreground/20 py-1.5 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40 transition-colors"
      >
        {loading === 'video' ? '新增中…' : '+ 影片'}
      </button>
    </div>
  )
}
```

Replace with:

```tsx
export function AddPageButton({ bookId }: { bookId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'carousel' | 'video' | 'audio' | null>(null)

  async function addPage(type: 'carousel' | 'video' | 'audio') {
    setLoading(type)
    try {
      await fetch(`/api/books/${bookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const labels: Record<'carousel' | 'video' | 'audio', string> = {
    carousel: '+ 輪播',
    video: '+ 影片',
    audio: '+ 錄音',
  }

  return (
    <div className="flex gap-2">
      {(['carousel', 'video', 'audio'] as const).map((type) => (
        <button
          key={type}
          onClick={() => addPage(type)}
          disabled={loading !== null}
          className="flex-1 rounded-md border border-foreground/20 py-1.5 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40 transition-colors"
        >
          {loading === type ? '新增中…' : labels[type]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 9: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to any of the three files.

- [ ] **Step 10: Commit**

```bash
git add forlove10grams/components/book-editor-client.tsx "forlove10grams/app/books/[bookId]/edit/page.tsx" forlove10grams/components/add-page-button.tsx
git commit -m "feat: wire audio recording into the book editor"
```

---

### Task 10: Wire audio into the reader

**Files:**
- Modify: `forlove10grams/components/read-page-client.tsx`
- Modify: `forlove10grams/app/read/[bookId]/page.tsx`

**Interfaces:**
- Consumes: `AudioPlayer` (Task 7), signed audio `mediaUrls` (Task 3).
- Produces: `ReadPageData.type` includes `'audio'`; `ReadPageData.durationSec?: number | null`; reader renders `AudioPlayer` for audio pages.

- [ ] **Step 1: `read-page-client.tsx` — widen `ReadPageData` and import `AudioPlayer`**

Find:

```ts
export type ReadPageData = {
  _id: string
  type: 'carousel' | 'video'
  content: string
  mediaUrls: string[]
  transcodingStatus?: 'pending' | 'processing' | 'ready' | 'error' | null
}
```

Replace with:

```ts
export type ReadPageData = {
  _id: string
  type: 'carousel' | 'video' | 'audio'
  content: string
  mediaUrls: string[]
  transcodingStatus?: 'pending' | 'processing' | 'ready' | 'error' | null
  durationSec?: number | null
}
```

Then find:

```ts
import { VideoPlayer } from '@/components/video-player'
```

Replace with:

```ts
import { VideoPlayer } from '@/components/video-player'
import { AudioPlayer } from '@/components/audio-player'
```

- [ ] **Step 2: `read-page-client.tsx` — render `AudioPlayer` for audio pages**

Find:

```tsx
                  {page.mediaUrls.length > 0 && (
                    <div className="-mx-4 sm:mx-0">
                      {page.type === 'carousel' ? (
                        <PolaroidCarousel urls={page.mediaUrls} />
                      ) : (
                        <VideoPlayer url={page.mediaUrls[0]} transcodingStatus={page.transcodingStatus} tokenReady={tokenReady} />
                      )}
                    </div>
                  )}
```

Replace with:

```tsx
                  {page.mediaUrls.length > 0 && (
                    <div className="-mx-4 sm:mx-0">
                      {page.type === 'carousel' ? (
                        <PolaroidCarousel urls={page.mediaUrls} />
                      ) : page.type === 'audio' ? (
                        <AudioPlayer url={page.mediaUrls[0]} durationSec={page.durationSec} />
                      ) : (
                        <VideoPlayer url={page.mediaUrls[0]} transcodingStatus={page.transcodingStatus} tokenReady={tokenReady} />
                      )}
                    </div>
                  )}
```

The TOC summary uses `page.content` (the transcript/description), which works unchanged for audio pages.

- [ ] **Step 3: `app/read/[bookId]/page.tsx` — sign audio URLs and pass `durationSec`**

Find:

```ts
  const initialPages: ReadPageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content ?? '',
    mediaUrls: p.type === 'carousel' ? p.mediaUrls.map(signImageUrl) : p.mediaUrls,
    transcodingStatus: p.transcodingStatus ?? null,
  }))
```

Replace with:

```ts
  const initialPages: ReadPageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content ?? '',
    mediaUrls: p.type === 'video' ? p.mediaUrls : p.mediaUrls.map(signImageUrl),
    transcodingStatus: p.transcodingStatus ?? null,
    durationSec: p.durationSec ?? null,
  }))
```

(The infinite-scroll `fetchMore` path already gets `durationSec` and signed URLs from Task 3's batch `GET`.)

- [ ] **Step 4: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to either file.

- [ ] **Step 5: Commit**

```bash
git add forlove10grams/components/read-page-client.tsx "forlove10grams/app/read/[bookId]/page.tsx"
git commit -m "feat: play audio pages in the reader"
```

---

### Task 11: Update the privacy policy (ships with the feature)

**Files:**
- Modify: `forlove10grams/app/privacy/page.tsx`

**Interfaces:** none (content only). Note: the "順帶盤點" gaps (reader tracking in 1.3, login-required sharing in §3) are **already present** in the current policy — only the transcription declarations are missing.

- [ ] **Step 1: Add 語音錄音 to §1.2 (media list)**

Find:

```tsx
          <Subsection title="1.2 您主動提供的資料">
            <ul>
              <li><strong>暱稱</strong>：您在本服務中設定的顯示名稱</li>
              <li><strong>記憶書內容</strong>：標題、描述、封面圖、頁面文字</li>
              <li><strong>媒體檔案</strong>：您上傳的圖片與影片</li>
            </ul>
          </Subsection>
```

Replace with:

```tsx
          <Subsection title="1.2 您主動提供的資料">
            <ul>
              <li><strong>暱稱</strong>：您在本服務中設定的顯示名稱</li>
              <li><strong>記憶書內容</strong>：標題、描述、封面圖、頁面文字</li>
              <li><strong>媒體檔案</strong>：您上傳的圖片與影片，以及在語音頁錄製的<strong>語音錄音</strong></li>
            </ul>
          </Subsection>
```

- [ ] **Step 2: Add a new "第三方資料處理" section after §三 (資料分享與公開)**

Find the closing of §三:

```tsx
          <p>
            若管理者將書本設為<strong>公開</strong>，持有連結的任何人無需登入即可閱讀。
          </p>
        </Section>

        <Section title="四、資料存放位置">
```

Replace with:

```tsx
          <p>
            若管理者將書本設為<strong>公開</strong>，持有連結的任何人無需登入即可閱讀。
          </p>
        </Section>

        <Section title="四、第三方資料處理（語音轉錄）">
          <p>
            當您在語音頁錄製聲音後，該錄音會傳送至外部語音轉錄服務（目前為 <strong>OpenAI API</strong>），
            僅用於「語音轉文字」這一單一目的，將結果作為可編輯的文字草稿填入頁面。
          </p>
          <p>
            依 OpenAI API 的資料政策，透過 API 傳送的內容<strong>不會用於訓練其模型</strong>，
            僅為濫用偵測目的短期保留（最長 30 天）後刪除。我們只會採用明確聲明「API 資料不用於模型訓練」的轉錄服務。
          </p>
          <p>
            OpenAI 隱私政策：{' '}
            <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">
              openai.com/policies/privacy-policy
            </a>
          </p>
        </Section>

        <Section title="五、資料存放位置">
```

Note: this renumbers subsequent section headings. Continue in the next step.

- [ ] **Step 3: Renumber the following section headings**

The inserted section takes 四; shift each subsequent `<Section title="...">` number up by one. Apply these exact replacements:

- `<Section title="四、資料存放位置">` → already changed to `五、資料存放位置` in Step 2.
- `<Section title="五、第三方登入服務">` → `<Section title="六、第三方登入服務">`
- `<Section title="六、Cookie 使用說明">` → `<Section title="七、Cookie 使用說明">`
- `<Section title="七、資料保留期限">` → `<Section title="八、資料保留期限">`
- `<Section title="八、您的權利">` → `<Section title="九、您的權利">`
- `<Section title="九、聯絡方式">` → `<Section title="十、聯絡方式">`

- [ ] **Step 4: Add the OpenAI row to the 資料存放位置 table (now §五)**

Find:

```tsx
              <tr><td>AWS CloudFront</td><td>媒體 CDN 加速</td><td>全球邊緣節點</td></tr>
            </tbody>
          </table>
        </Section>
```

Replace with:

```tsx
              <tr><td>AWS CloudFront</td><td>媒體 CDN 加速</td><td>全球邊緣節點</td></tr>
              <tr><td>OpenAI API</td><td>語音轉文字（轉錄）</td><td>美國</td></tr>
            </tbody>
          </table>
        </Section>
```

- [ ] **Step 5: Update the "最後更新" date**

Find:

```tsx
        <p className="text-sm text-foreground/50 mb-10">最後更新：2026 年 7 月</p>
```

Replace with (keep the same string if already `2026 年 7 月`; otherwise set it):

```tsx
        <p className="text-sm text-foreground/50 mb-10">最後更新：2026 年 7 月</p>
```

(The month is already correct; this step exists to confirm the date reflects this change — bump it if the policy was last dated earlier.)

- [ ] **Step 6: Typecheck + lint**

Run: `cd forlove10grams && npx tsc --noEmit && npm run lint`
Expected: no errors related to `app/privacy/page.tsx`.

- [ ] **Step 7: Commit**

```bash
git add forlove10grams/app/privacy/page.tsx
git commit -m "docs: disclose third-party audio transcription in privacy policy"
```

---

### Task 12: Manual end-to-end verification

**Files:** none (verification only). Requires `OPENAI_API_KEY` set and the dev server running (`cd forlove10grams && npm run dev`).

- [ ] **Step 1: Recording + playback round trip**
- Add a `錄音` page from the editor; record a short clip; confirm 試聽 works, 重錄 discards, 使用這段錄音 uploads with a progress bar, and a player appears.
- Reload the edit page → the player persists with the correct duration.

- [ ] **Step 2: Transcription**
- Record a short Mandarin clip → within seconds the `content` textarea (MDEditor) shows a **Traditional Chinese** draft.
- Type a few characters into `content` first, then record → the transcript is **appended** after your text (blank line between), not overwritten.
- Kill the network mid-transcribe → "轉錄失敗，重試" appears and the audio still plays; restore network and click 重試 → text appears.
- Reload during transcription → status reflects `transcriptionStatus` (not stuck on a fake "轉錄中").

- [ ] **Step 3: Cross-browser**
- Record on Chrome (Android) and Safari (iOS); confirm each plays back in the other browser.
- Deny microphone permission → guidance text shows, no white screen.
- Let a recording hit the 10-minute cap → it auto-stops and enters 試聽.

- [ ] **Step 4: Quick capture**
- Dashboard `QuickCaptureBar` → 語音 → lands on the editor's recording UI, book titled with the default 快速記錄 name.

- [ ] **Step 5: Reader + authorization**
- Open the book via a share link as a reader → the audio page plays.
- Copy the audio URL into an incognito window → 403 (Signed URL, not shareable).
- Confirm audio pages support `happenedAt`, drag-reorder, and delete like other page types.

- [ ] **Step 6: Vercel timeout (post-deploy)**
- After deploying, transcribe a full 10-minute recording → completes within `maxDuration`, no function timeout.
- Close the page during transcription → reopen later, the text is present (server writes DB before responding).

- [ ] **Step 7: Privacy**
- `/privacy` shows the third-party transcription section and the OpenAI row.
- The recording UI shows the disclosure line linking to `/privacy`.
