# Mobile Upload Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let creators/editors jump straight into the phone camera when adding media to a page, while keeping the existing "pick from library" behavior available as a separate action; and drop the redundant "video" entry point from the quick-capture bar.

**Architecture:** `MediaUploader` currently renders a single hidden `<input type="file">` triggered by one button. Split it into two hidden inputs — one with `capture="environment"` (camera), one without (gallery) — each triggered by its own button, sharing the existing `handleFiles` pipeline (compression, presigned upload, transcoding poll) unchanged. `QuickCaptureBar` loses its `video` entry from a static array; no other file changes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, no test framework (verify via `npx tsc --noEmit` and `npm run lint`; UI behavior verified manually in a mobile browser).

## Global Constraints

- No automated test framework exists in this project — do not add one. Verification is `npx tsc --noEmit`, `npm run lint`, and manual browser checks.
- Do not touch upload retry logic, per-file progress-of-N indicators, or the `video` page type itself — explicitly out of scope per the design spec.
- Follow existing button styling (`btn-outline-xs`) and copy conventions (`+ ` prefix) already used in `media-uploader.tsx`.
- Spec: `docs/superpowers/specs/2026-07-03-mobile-upload-experience-design.md`

---

### Task 1: Split MediaUploader into camera + gallery inputs

**Files:**
- Modify: `forlove10grams/components/media-uploader.tsx`

**Interfaces:**
- Consumes: nothing new — `Props`, `handleFiles`, `progress`, `atImageLimit`, `isTranscoding` all already exist in this file (lines 7–151 of the current version).
- Produces: no new exports; `MediaUploader`'s public `Props` type is unchanged.

- [x] **Step 1: Replace the single `inputRef` with two refs**

In `forlove10grams/components/media-uploader.tsx`, find:

```tsx
  const inputRef = useRef<HTMLInputElement>(null)
```

Replace with:

```tsx
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
```

- [x] **Step 2: Replace the single input+button block with two inputs + two buttons + a shared progress label**

Find this block (the `<>` fragment inside the `atImageLimit ? ... : (...)` branch):

```tsx
            <>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={progress !== null}
                className="btn-outline-xs"
              >
                {progress !== null ? `上傳中 ${progress}%` : fileType === 'carousel' ? '+ 新增圖片' : '+ 上傳影片'}
              </button>
            </>
```

Replace with:

```tsx
            <>
              <input
                ref={cameraInputRef}
                type="file"
                accept={accept}
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={progress !== null}
                  className="btn-outline-xs"
                >
                  {fileType === 'carousel' ? '+ 拍照' : '+ 拍攝影片'}
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={progress !== null}
                  className="btn-outline-xs"
                >
                  {fileType === 'carousel' ? '+ 相簿' : '+ 選擇影片'}
                </button>
              </div>
            </>
```

Note: the upload-percentage text that used to live inside the button label (`` `上傳中 ${progress}%` ``) moves to sit next to the progress bar instead (Step 3), since there are now two buttons and duplicating/splitting the percentage across both would be confusing.

- [x] **Step 3: Add the percentage label next to the progress bar**

Find:

```tsx
          {/* Progress bar */}
          {progress !== null && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-foreground/10">
              <div
                className="h-1.5 rounded-full bg-foreground/50 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
```

Replace with:

```tsx
          {/* Progress bar */}
          {progress !== null && (
            <div className="mt-2">
              <p className="text-xs text-foreground/50">上傳中 {progress}%</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-foreground/10">
                <div
                  className="h-1.5 rounded-full bg-foreground/50 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
```

- [x] **Step 4: Typecheck**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to `media-uploader.tsx`.

- [x] **Step 5: Lint**

Run: `cd forlove10grams && npm run lint`
Expected: no errors related to `media-uploader.tsx`.

- [x] **Step 6: Commit**

```bash
git add forlove10grams/components/media-uploader.tsx
git commit -m "feat: split media uploader into camera and gallery buttons"
```

---

### Task 2: Remove the video option from QuickCaptureBar

**Files:**
- Modify: `forlove10grams/components/quick-capture-bar.tsx`

**Interfaces:**
- Consumes: `QuickCaptureMode` from `@/lib/quick-capture` (unchanged — `'video'` stays a valid mode in the type and in `POST /api/books/quick`, only the UI entry is removed).
- Produces: nothing new.

- [x] **Step 1: Remove the `video` entry from `OPTIONS`**

In `forlove10grams/components/quick-capture-bar.tsx`, find:

```tsx
const OPTIONS: Array<{ mode: QuickCaptureMode; label: string }> = [
  { mode: 'photo', label: '照片' },
  { mode: 'video', label: '影片' },
  { mode: 'text', label: '文字' },
]
```

Replace with:

```tsx
const OPTIONS: Array<{ mode: QuickCaptureMode; label: string }> = [
  { mode: 'photo', label: '照片' },
  { mode: 'text', label: '文字' },
]
```

Do not touch `lib/quick-capture.ts`, `app/api/books/quick/route.ts`, or `book-editor-client.tsx` — `'video'` remains a valid mode everywhere else, per the design spec's decision to only remove the entry point, not the capability.

- [x] **Step 2: Typecheck**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to `quick-capture-bar.tsx`.

- [x] **Step 3: Lint**

Run: `cd forlove10grams && npm run lint`
Expected: no errors related to `quick-capture-bar.tsx`.

- [x] **Step 4: Commit**

```bash
git add forlove10grams/components/quick-capture-bar.tsx
git commit -m "feat: remove video entry from quick capture bar"
```

---

### Task 3: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd forlove10grams && npm run dev`

- [ ] **Step 2: Verify MediaUploader in a mobile browser (or Chrome DevTools device emulation + a real device pass if available)**

- Open a book's edit page, select a carousel page.
- Confirm two buttons render: `+ 拍照` and `+ 相簿`.
- Tap `+ 拍照`: camera opens directly (or, on desktop without camera capture support, falls back to the file picker without erroring).
- Tap `+ 相簿`: the original system file picker opens, multi-select still works.
- Select a video page. Confirm `+ 拍攝影片` and `+ 選擇影片` render and behave analogously (single file only).
- Upload a file and confirm the `上傳中 N%` label + progress bar render correctly, and both buttons are disabled while uploading.
- Reach `IMAGE_LIMIT` (15 images) on a carousel page and confirm both buttons are replaced by the "已達圖片上限" message, same as before.

- [ ] **Step 3: Verify QuickCaptureBar on the dashboard**

- Log in as the admin/creator user.
- Confirm the quick-capture bar shows only `照片` and `文字` (no `影片`).
- Tap `照片`: confirm it still creates a carousel-type page and redirects to the edit page, same as before.
