# HLS Video Pipeline + next/image Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert video uploads to HLS streaming via AWS MediaConvert + Lambda (with Apple HEVC support), and migrate all `<img>` tags to `<Image>` (next/image) for automatic WebP optimization.

**Architecture:** Browser uploads raw video to S3 (`video-raw.{ext}`), S3 event triggers Lambda A which creates a MediaConvert job outputting HLS to `hls/index.m3u8`. EventBridge fires Lambda B on completion, which calls a Next.js webhook to update the page. Frontend polls during upload; VideoPlayer uses hls.js with Safari native fallback. next/image migration is independent and can be merged first.

**Tech Stack:** AWS MediaConvert, AWS Lambda (Node.js ESM), hls.js, Next.js `<Image>`, TypeScript

---

> **⚠️ Merge Order:** Tasks 1–5 (next/image) are fully independent and can be committed/merged **before** the HLS pipeline tasks. Recommended: merge next/image first, then start HLS work.

---

## File Map

**Created:**
- `infrastructure/lambda/mediaconvert-trigger/index.mjs` — Lambda A: S3 event → MediaConvert job
- `infrastructure/lambda/mediaconvert-callback/index.mjs` — Lambda B: EventBridge → Next.js webhook
- `forlove10grams/app/api/webhooks/mediaconvert/route.ts` — webhook endpoint

**Modified:**
- `forlove10grams/next.config.ts` — add `images.remotePatterns`
- `forlove10grams/lib/models/page.ts` — add `transcodingStatus` field
- `forlove10grams/app/api/upload/presign/route.ts` — key rename + MIME + set pending
- `forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts` — add GET handler for polling
- `forlove10grams/components/video-player.tsx` — hls.js + transcodingStatus UI
- `forlove10grams/components/media-uploader.tsx` — polling logic after video upload
- `forlove10grams/components/dashboard-books-client.tsx` — img → Image
- `forlove10grams/components/cover-image-button.tsx` — img → Image (×2)
- `forlove10grams/components/carousel.tsx` — ImgSlide img → Image
- `forlove10grams/.env.local.example` — new env vars

---

## Task 1: next.config.ts — remotePatterns

**Files:**
- Modify: `forlove10grams/next.config.ts`

- [ ] **Step 1: Replace next.config.ts content**

```ts
import type { NextConfig } from 'next'

const remotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = []

if (process.env.CLOUDFRONT_URL) {
  const { hostname } = new URL(process.env.CLOUDFRONT_URL)
  remotePatterns.push({ protocol: 'https', hostname })
}

if (process.env.S3_BUCKET_NAME && process.env.AWS_REGION) {
  remotePatterns.push({
    protocol: 'https',
    hostname: `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
  })
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
}

export default nextConfig
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors related to next.config.ts

---

## Task 2: dashboard-books-client.tsx — img → Image

**Files:**
- Modify: `forlove10grams/components/dashboard-books-client.tsx`

- [ ] **Step 1: Add Image import at top of file**

After the existing imports, add:
```ts
import Image from 'next/image'
```

- [ ] **Step 2: Replace the coverImage img block and its container**

Find the block:
```tsx
<div className="shrink-0 h-14 w-14 overflow-hidden rounded-lg bg-[#2C1810]/5 flex items-center justify-center">
  {book.coverImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={book.coverImage} alt="" className="h-full w-full object-cover" />
  ) : (
    <span className="text-xl font-semibold text-[#2C1810]/25">{initial}</span>
  )}
</div>
```

Replace with:
```tsx
<div className="relative shrink-0 h-14 w-14 overflow-hidden rounded-lg bg-[#2C1810]/5 flex items-center justify-center">
  {book.coverImage ? (
    <Image src={book.coverImage} alt="" fill className="object-cover" />
  ) : (
    <span className="text-xl font-semibold text-[#2C1810]/25">{initial}</span>
  )}
</div>
```

- [ ] **Step 3: Verify build**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add forlove10grams/components/dashboard-books-client.tsx
git commit -m "feat: migrate dashboard cover img to next/image"
```

---

## Task 3: cover-image-button.tsx — img → Image (×2)

**Files:**
- Modify: `forlove10grams/components/cover-image-button.tsx`

- [ ] **Step 1: Add Image import**

```ts
import Image from 'next/image'
```

- [ ] **Step 2: Replace header button thumbnail (line ~51)**

Find:
```tsx
// eslint-disable-next-line @next/next/no-img-element
<img src={coverImage} alt="" className="h-5 w-5 rounded object-cover" />
```

Replace with:
```tsx
<Image src={coverImage} alt="" width={20} height={20} className="rounded object-cover" />
```

- [ ] **Step 3: Replace picker grid thumbnails (line ~83)**

The picker buttons already have `className="relative aspect-square overflow-hidden ..."`. Find:
```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={url} alt="" className="h-full w-full object-cover" />
```

Replace with:
```tsx
<Image src={url} alt="" fill className="object-cover" />
```

- [ ] **Step 4: Verify and commit**

Run: `cd forlove10grams && npx tsc --noEmit`

```bash
git add forlove10grams/components/cover-image-button.tsx
git commit -m "feat: migrate cover-image-button img to next/image"
```

---

## Task 4: carousel.tsx — ImgSlide img → Image

**Files:**
- Modify: `forlove10grams/components/carousel.tsx`

The `ImgSlide` component uses `useRef<HTMLImageElement>` + `useEffect` to check `img.complete` on mount (handles cached images). `<Image>` fires `onLoad` even for cached images, so we can drop the ref + effect.

- [ ] **Step 1: Add Image import**

```ts
import Image from 'next/image'
```

- [ ] **Step 2: Replace the ImgSlide function**

Find the entire `ImgSlide` function and replace with:
```tsx
function ImgSlide({ src, onClick }: { src: string; onClick: () => void }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <>
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-[#2C1810]/5" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2C1810]/5">
          <BrokenImageIcon />
        </div>
      ) : (
        <Image
          src={src}
          alt=""
          fill
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          onClick={onClick}
          className={`cursor-zoom-in object-contain transition-opacity duration-300 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Remove unused imports**

Remove `useRef` from the import if it's no longer used elsewhere in carousel.tsx. Check the full file first — `useRef` may still be used for Embla carousel. Only remove if unused.

- [ ] **Step 4: Verify and commit**

Run: `cd forlove10grams && npx tsc --noEmit`

```bash
git add forlove10grams/components/carousel.tsx
git commit -m "feat: migrate carousel ImgSlide to next/image"
```

---

## Task 5: media-uploader.tsx — upload preview img → Image + next.config.ts commit

**Files:**
- Modify: `forlove10grams/components/media-uploader.tsx`
- Modify: `forlove10grams/next.config.ts` (commit together)

- [ ] **Step 1: Add Image import to media-uploader.tsx**

```ts
import Image from 'next/image'
```

- [ ] **Step 2: Replace the carousel upload preview thumbnail**

Find:
```tsx
{fileType === 'carousel' ? (
  <img
    src={url}
    alt=""
    className="h-20 w-20 rounded object-cover border border-[#2C1810]/10"
  />
) : (
```

Replace with:
```tsx
{fileType === 'carousel' ? (
  <Image
    src={url}
    alt=""
    width={80}
    height={80}
    className="rounded object-cover border border-[#2C1810]/10"
  />
) : (
```

- [ ] **Step 3: Verify build**

Run: `cd forlove10grams && npx tsc --noEmit`
Expected: no `no-img-element` warnings, no type errors

- [ ] **Step 4: Commit next/image migration complete**

```bash
git add forlove10grams/next.config.ts forlove10grams/components/media-uploader.tsx
git commit -m "feat: add next/image remotePatterns + migrate media-uploader preview"
```

> **✅ next/image migration complete — safe to merge to main at this point.**

---

## Task 6: AWS Infrastructure Setup (manual steps — no code)

> This task is a guided checklist for AWS Console actions. Complete before writing Lambda code.

- [ ] **Step 6.1: Get MediaConvert endpoint**

  In AWS Console → MediaConvert → (top-right account menu) → **Get endpoint**
  Copy the URL, e.g. `https://xxxxxx.mediaconvert.ap-northeast-1.amazonaws.com`
  → Save to `.env.local` as `MEDIACONVERT_ENDPOINT=<url>`

- [ ] **Step 6.2: Create IAM Role for MediaConvert**

  IAM → Roles → Create Role → AWS Service → MediaConvert
  - Attach policy: `AmazonS3FullAccess` (or custom: S3 GetObject on input, S3 PutObject on output bucket)
  - Role name: `forlove10grams-mediaconvert-role`
  - Copy the Role ARN → save to `.env.local` as `MEDIACONVERT_ROLE_ARN=<arn>`

- [ ] **Step 6.3: Create IAM Role for Lambda**

  IAM → Roles → Create Role → AWS Service → Lambda
  - Attach policies:
    - `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
    - Inline policy for S3 + MediaConvert:
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": ["s3:GetObject", "s3:HeadObject"],
          "Resource": "arn:aws:s3:::forlove10grams-media-540052993261-ap-northeast-1-an/*"
        },
        {
          "Effect": "Allow",
          "Action": ["mediaconvert:CreateJob"],
          "Resource": "*"
        }
      ]
    }
    ```
  - Role name: `forlove10grams-lambda-role`

- [ ] **Step 6.4: Configure S3 Event Notification**

  S3 → bucket `forlove10grams-media-540052993261-ap-northeast-1-an` → Properties → Event notifications → Create
  - Event name: `video-raw-uploaded`
  - Prefix: `books/`
  - Suffix: (leave blank — filter in Lambda code)
  - Event type: `s3:ObjectCreated:Put`
  - Destination: Lambda function (create placeholder `mediaconvert-trigger` first in Task 7, then come back to link it)

- [ ] **Step 6.5: Create EventBridge Rule for MediaConvert completion**

  EventBridge → Rules → Create Rule
  - Name: `forlove10grams-mediaconvert-complete`
  - Event pattern:
    ```json
    {
      "source": ["aws.mediaconvert"],
      "detail-type": ["MediaConvert Job State Change"],
      "detail": { "status": ["COMPLETE", "ERROR"] }
    }
    ```
  - Target: Lambda function `mediaconvert-callback` (create in Task 8, then link)

---

## Task 7: Lambda A — mediaconvert-trigger (adapt convert.mjs)

**Files:**
- Create: `infrastructure/lambda/mediaconvert-trigger/index.mjs`

This adapts the existing `forlove10grams/convert.mjs`.

- [ ] **Step 1: Create the trigger function**

Create `infrastructure/lambda/mediaconvert-trigger/index.mjs`:

```js
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert'

const REGION = process.env.AWS_REGION ?? 'ap-northeast-1'
const BUCKET = process.env.S3_BUCKET_NAME
const MEDIACONVERT_ENDPOINT = process.env.MEDIACONVERT_ENDPOINT
const ROLE_ARN = process.env.MEDIACONVERT_ROLE_ARN

const s3 = new S3Client({ region: REGION })
const mediaConvert = new MediaConvertClient({ region: REGION, endpoint: MEDIACONVERT_ENDPOINT })

export const handler = async (event) => {
  const record = event.Records[0].s3
  const bucket = record.bucket.name
  const key = decodeURIComponent(record.object.key.replace(/\+/g, ' '))

  // Only process video-raw files (S3 event filter is prefix-only, check suffix here)
  if (!key.includes('/video-raw.')) {
    console.log('Skipping non-video-raw key:', key)
    return
  }

  // Parse bookId and pageId from key: books/{bookId}/pages/{pageId}/video-raw.{ext}
  const match = key.match(/^books\/([^/]+)\/pages\/([^/]+)\/video-raw\./)
  if (!match) {
    console.error('Unexpected key format:', key)
    return
  }
  const [, bookId, pageId] = match
  const folder = `books/${bookId}/pages/${pageId}`

  // Idempotency: skip if HLS already exists
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: `${folder}/hls/index.m3u8` }))
    console.log('HLS already exists, skipping job creation')
    return
  } catch {
    // Does not exist — proceed
  }

  const inputFile = `s3://${bucket}/${key}`
  const outputPath = `s3://${bucket}/${folder}/hls/`

  const jobParams = {
    Role: ROLE_ARN,
    Settings: {
      TimecodeConfig: { Source: 'ZEROBASED' },
      Inputs: [
        {
          FileInput: inputFile,
          TimecodeSource: 'ZEROBASED',
          AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
          VideoSelector: {},
        },
      ],
      OutputGroups: [
        {
          Name: 'HLS Group',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              Destination: outputPath,
              SegmentLength: 6,
              MinSegmentLength: 2,
              DirectoryStructure: 'SINGLE_DIRECTORY',
              ManifestDurationFormat: 'INTEGER',
              OutputSelection: 'MANIFESTS_AND_SEGMENTS',
              StreamInfResolution: 'INCLUDE',
              ClientCache: 'ENABLED',
              CaptionLanguageSetting: 'OMIT',
              CodecSpecification: 'RFC_4281',
            },
          },
          Outputs: [
            {
              VideoDescription: {
                Width: 1280,
                Height: 720,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'QVBR',
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                    MaxBitrate: 3000000,
                    QualityTuningLevel: 'SINGLE_PASS',
                  },
                },
              },
              AudioDescriptions: [
                {
                  AudioSourceName: 'Audio Selector 1',
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 },
                  },
                },
              ],
              ContainerSettings: { Container: 'M3U8' },
              NameModifier: '-720p',
            },
          ],
        },
      ],
    },
    UserMetadata: { bookId, pageId, SourceKey: key },
  }

  const result = await mediaConvert.send(new CreateJobCommand(jobParams))
  console.log('MediaConvert Job Created:', result.Job.Id)
}
```

- [ ] **Step 2: Deploy to Lambda**

  AWS Console → Lambda → Create Function
  - Name: `mediaconvert-trigger`
  - Runtime: Node.js 22.x
  - Execution role: `forlove10grams-lambda-role`

  Upload the function: zip `index.mjs` and upload, or use AWS CLI:
  ```bash
  cd infrastructure/lambda/mediaconvert-trigger
  zip function.zip index.mjs
  aws lambda create-function \
    --function-name mediaconvert-trigger \
    --runtime nodejs22.x \
    --role <forlove10grams-lambda-role-arn> \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --region ap-northeast-1
  ```

- [ ] **Step 3: Set Lambda env vars**

  In Lambda console → Configuration → Environment variables:
  ```
  AWS_REGION=ap-northeast-1
  S3_BUCKET_NAME=forlove10grams-media-540052993261-ap-northeast-1-an
  MEDIACONVERT_ENDPOINT=<from Step 6.1>
  MEDIACONVERT_ROLE_ARN=<from Step 6.2>
  ```

- [ ] **Step 4: Link S3 Event Notification to this Lambda**

  Return to S3 → Event notifications (from Step 6.4) → set destination to `mediaconvert-trigger`

- [ ] **Step 5: Commit**

  ```bash
  git add infrastructure/lambda/mediaconvert-trigger/index.mjs
  git commit -m "feat: add mediaconvert-trigger Lambda (adapted from convert.mjs)"
  ```

---

## Task 8: Lambda B — mediaconvert-callback

**Files:**
- Create: `infrastructure/lambda/mediaconvert-callback/index.mjs`

- [ ] **Step 1: Create the callback function**

Create `infrastructure/lambda/mediaconvert-callback/index.mjs`:

```js
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL?.replace(/\/$/, '')
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
const WEBHOOK_SECRET = process.env.MEDIACONVERT_WEBHOOK_SECRET

export const handler = async (event) => {
  const detail = event.detail
  const status = detail.status // 'COMPLETE' or 'ERROR'
  const { bookId, pageId } = detail.userMetadata ?? {}

  if (!bookId || !pageId) {
    console.error('Missing bookId/pageId in userMetadata', detail.userMetadata)
    return
  }

  const transcodingStatus = status === 'COMPLETE' ? 'ready' : 'error'
  const hlsUrl = status === 'COMPLETE'
    ? `${CLOUDFRONT_URL}/books/${bookId}/pages/${pageId}/hls/index.m3u8`
    : null

  console.log(`Job ${status} for book=${bookId} page=${pageId}`)

  const res = await fetch(`${APP_URL}/api/webhooks/mediaconvert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({ bookId, pageId, transcodingStatus, hlsUrl }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Webhook failed ${res.status}: ${text}`)
  }
  console.log('Webhook delivered successfully')
}
```

- [ ] **Step 2: Deploy to Lambda**

  ```bash
  cd infrastructure/lambda/mediaconvert-callback
  zip function.zip index.mjs
  aws lambda create-function \
    --function-name mediaconvert-callback \
    --runtime nodejs22.x \
    --role <forlove10grams-lambda-role-arn> \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --region ap-northeast-1
  ```

- [ ] **Step 3: Set Lambda env vars**

  ```
  CLOUDFRONT_URL=https://d13l76pf5x0jgb.cloudfront.net
  NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app
  MEDIACONVERT_WEBHOOK_SECRET=<generate a random string, e.g. openssl rand -hex 32>
  ```

- [ ] **Step 4: Link EventBridge rule to this Lambda**

  Return to EventBridge rule from Step 6.5 → set target to `mediaconvert-callback`

- [ ] **Step 5: Commit**

  ```bash
  git add infrastructure/lambda/mediaconvert-callback/index.mjs
  git commit -m "feat: add mediaconvert-callback Lambda"
  ```

---

## Task 9: Page Model — add transcodingStatus

**Files:**
- Modify: `forlove10grams/lib/models/page.ts`

- [ ] **Step 1: Update the model**

Replace the full file content:

```ts
import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export type TranscodingStatus = 'pending' | 'processing' | 'ready' | 'error'

export interface IPage extends Document {
  bookId: Types.ObjectId
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
  transcodingStatus?: TranscodingStatus
}

const PageSchema = new Schema<IPage>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    type: { type: String, enum: ['carousel', 'video'], required: true },
    content: String,
    mediaUrls: [{ type: String }],
    transcodingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'error'],
    },
  },
  { timestamps: true }
)

PageSchema.index({ bookId: 1 })

const Page: Model<IPage> =
  mongoose.models.Page ?? mongoose.model<IPage>('Page', PageSchema)

export default Page
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd forlove10grams && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/lib/models/page.ts
git commit -m "feat: add transcodingStatus to Page model"
```

---

## Task 10: Webhook API Endpoint

**Files:**
- Create: `forlove10grams/app/api/webhooks/mediaconvert/route.ts`

- [ ] **Step 1: Create the webhook route**

```ts
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { dbConnect } from '@/lib/mongoose'
import Page from '@/lib/models/page'

const WEBHOOK_SECRET = process.env.MEDIACONVERT_WEBHOOK_SECRET

const Body = z.object({
  bookId: z.string(),
  pageId: z.string(),
  transcodingStatus: z.enum(['ready', 'error']),
  hlsUrl: z.string().nullable(),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!WEBHOOK_SECRET || auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { pageId, transcodingStatus, hlsUrl } = parsed.data

  await dbConnect()
  await Page.findByIdAndUpdate(pageId, {
    transcodingStatus,
    ...(hlsUrl ? { mediaUrls: [hlsUrl] } : {}),
  })

  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd forlove10grams && npx tsc --noEmit`

- [ ] **Step 3: Add env var to .env.local.example**

Add to `forlove10grams/.env.local.example`:
```
# AWS MediaConvert webhook
MEDIACONVERT_WEBHOOK_SECRET=
MEDIACONVERT_ENDPOINT=
MEDIACONVERT_ROLE_ARN=
NEXT_PUBLIC_APP_URL=
```

- [ ] **Step 4: Commit**

```bash
git add forlove10grams/app/api/webhooks/mediaconvert/route.ts forlove10grams/.env.local.example
git commit -m "feat: add MediaConvert webhook endpoint"
```

---

## Task 11: Presign API — key rename + set pending

**Files:**
- Modify: `forlove10grams/app/api/upload/presign/route.ts`

- [ ] **Step 1: Update extFromContentType to add HEVC MIME type**

Find `extFromContentType` and update the map:
```ts
function extFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
  }
  return map[contentType] ?? contentType.split('/')[1] ?? 'bin'
}
```

- [ ] **Step 2: Change video key and add pending status**

Add the Page import at the top (after existing imports):
```ts
import Page from '@/lib/models/page'
```

Find the `s3Key` assignment for video and replace the entire video branch + response:

```ts
  // existing cover branch stays the same
  let s3Key: string
  if (fileType === 'cover') {
    s3Key = `books/${bookId}/cover.${ext}`
  } else if (fileType === 'video') {
    if (!pageId) return Response.json({ error: 'pageId required for video' }, { status: 400 })
    s3Key = `books/${bookId}/pages/${pageId}/video-raw.${ext}`
  } else {
    s3Key = `books/${bookId}/pages/${pageId}/carousel/image-${index}.${ext}`
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: contentType,
  })
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 })
  const s3Url = CLOUDFRONT_URL
    ? `${CLOUDFRONT_URL}/${s3Key}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`

  // Set page transcodingStatus to pending when signing for video
  if (fileType === 'video' && pageId) {
    await Page.findByIdAndUpdate(pageId, { transcodingStatus: 'pending', mediaUrls: [] })
  }

  return Response.json({ presignedUrl, s3Key, s3Url })
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd forlove10grams && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add forlove10grams/app/api/upload/presign/route.ts
git commit -m "feat: presign uses video-raw key and sets transcodingStatus pending"
```

---

## Task 12: Single Page GET endpoint (for polling)

**Files:**
- Modify: `forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts`

The `[pageId]/route.ts` currently has PATCH and DELETE. Add a GET handler so the frontend can poll.

- [ ] **Step 1: Add GET handler**

Open the file and add before or after the existing handlers:
```ts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string; pageId: string }> }
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, pageId } = await params
  await dbConnect()

  const book = await Book.findById(bookId).lean()
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!canEditBook(session.user.id!, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const page = await Page.findById(pageId).lean()
  if (!page) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    _id: page._id.toString(),
    transcodingStatus: page.transcodingStatus ?? null,
    mediaUrls: page.mediaUrls,
  })
}
```

Make sure `Page` and `Book` are imported at the top of the file (they likely already are for PATCH/DELETE).

- [ ] **Step 2: Verify TypeScript**

Run: `cd forlove10grams && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add forlove10grams/app/api/books/[bookId]/pages/[pageId]/route.ts
git commit -m "feat: add GET handler to single page endpoint for polling"
```

---

## Task 13: VideoPlayer — hls.js integration + transcodingStatus UI

**Files:**
- Modify: `forlove10grams/components/video-player.tsx`

- [ ] **Step 1: Install hls.js**

Output this command for the user to run:
```
npm install hls.js
npm install --save-dev @types/hls.js
```

- [ ] **Step 2: Replace video-player.tsx**

```tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import Hls from 'hls.js'
import type { TranscodingStatus } from '@/lib/models/page'

type Props = {
  url: string
  transcodingStatus?: TranscodingStatus | null
}

export function VideoPlayer({ url, transcodingStatus }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(false)

  // Auto-pause when scrolled off-screen; never auto-play on entry
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) video.pause() },
      { threshold: 0.1 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  // HLS setup
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url || transcodingStatus !== 'ready') return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setError(true)
      })
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
    } else {
      setError(true)
    }
  }, [url, transcodingStatus])

  if (transcodingStatus === 'pending' || transcodingStatus === 'processing') {
    return (
      <div
        className="relative w-full bg-[#2C1810]/5 flex items-center justify-center"
        style={{ paddingBottom: '56.25%' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="h-6 w-6 rounded-full border-2 border-[#2C1810]/30 border-t-[#2C1810] animate-spin" />
          <span className="text-xs text-[#2C1810]/40">轉檔中…</span>
        </div>
      </div>
    )
  }

  if (transcodingStatus === 'error') {
    return (
      <div
        className="relative w-full bg-[#2C1810]/5 flex items-center justify-center"
        style={{ paddingBottom: '56.25%' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-red-400">影片轉檔失敗，請重新上傳</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full bg-black"
      style={{ paddingBottom: '56.25%' }}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2C1810]/5">
          <svg className="h-10 w-10 text-[#2C1810]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Find where VideoPlayer is used and pass transcodingStatus**

Search for `<VideoPlayer` in the codebase:
```bash
grep -r "VideoPlayer" forlove10grams/app forlove10grams/components --include="*.tsx" -l
```

For each call site, add `transcodingStatus={page.transcodingStatus}` prop. The page data from the API now includes `transcodingStatus` (since it's on the `IPage` interface).

- [ ] **Step 4: Verify TypeScript**

Run: `cd forlove10grams && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add forlove10grams/components/video-player.tsx
git commit -m "feat: VideoPlayer integrates hls.js and shows transcodingStatus UI"
```

---

## Task 14: MediaUploader — polling after video upload

**Files:**
- Modify: `forlove10grams/components/media-uploader.tsx`

- [ ] **Step 1: Add polling Props and state**

Update the `Props` type and add `onTranscodingReady` callback:

```ts
type Props = {
  bookId: string
  pageId: string
  fileType: 'carousel' | 'video'
  mediaUrls: string[]
  onUrlsChange: (urls: string[]) => void
  onTranscodingReady?: (hlsUrl: string) => void
}
```

Add polling state at the top of the component:
```ts
const [isTranscoding, setIsTranscoding] = useState(false)
```

- [ ] **Step 2: Replace the video upload success handler**

In the `uploadFile` function, replace the section after the S3 PUT succeeds (the "Save URL to DB" block) with:

```ts
    if (fileType === 'video') {
      // presign already set transcodingStatus=pending; start polling
      setIsTranscoding(true)
      setProgress(null)
      pollTranscoding()
    } else {
      // carousel/cover: save URL immediately as before
      const newUrls = [...mediaUrls, s3Url]
      await fetch(`/api/books/${bookId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrls: newUrls }),
      })
      onUrlsChange(newUrls)
      setProgress(null)
    }
```

- [ ] **Step 3: Add the pollTranscoding function inside the component**

Add before `uploadFile`:

```ts
  async function pollTranscoding() {
    const MAX_ATTEMPTS = 200 // ~10 minutes at 3s interval
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(interval)
        setIsTranscoding(false)
        setError('轉檔逾時，請重新上傳')
        return
      }
      try {
        const res = await fetch(`/api/books/${bookId}/pages/${pageId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.transcodingStatus === 'ready' && data.mediaUrls?.[0]) {
          clearInterval(interval)
          setIsTranscoding(false)
          onUrlsChange(data.mediaUrls)
          onTranscodingReady?.(data.mediaUrls[0])
        } else if (data.transcodingStatus === 'error') {
          clearInterval(interval)
          setIsTranscoding(false)
          setError('影片轉檔失敗，請重新上傳')
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000)
  }
```

- [ ] **Step 4: Show transcoding state in UI**

In the render, replace the upload button section to show transcoding state:

```tsx
      {(fileType === 'carousel' || mediaUrls.length === 0) && (
        <div>
          {isTranscoding ? (
            <div className="flex items-center gap-2 text-xs text-[#2C1810]/50">
              <span className="h-3 w-3 rounded-full border-2 border-[#2C1810]/30 border-t-[#2C1810] animate-spin" />
              轉檔中，請稍候…
            </div>
          ) : atImageLimit ? (
            <p className="text-xs text-[#2C1810]/50">已達圖片上限（{IMAGE_LIMIT} 張）</p>
          ) : (
            <>
              {/* existing input + button stays identical */}
```

- [ ] **Step 5: Verify TypeScript**

Run: `cd forlove10grams && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add forlove10grams/components/media-uploader.tsx
git commit -m "feat: MediaUploader polls transcoding status after video upload"
```

---

## Task 15: End-to-End Verification

- [ ] **Step 1: Build check**

Run: `cd forlove10grams && npm run build`
Expected: no TypeScript errors, no `no-img-element` lint warnings

- [ ] **Step 2: next/image smoke test**

Start dev server. Open dashboard → verify cover images load in Network tab as `image/webp` (if browser supports it)

- [ ] **Step 3: HLS pipeline test (iPhone MOV)**

1. Upload an iPhone .mov video to any book page
2. Confirm page shows "轉檔中…" spinner
3. Check S3 Console: `books/{bookId}/pages/{pageId}/video-raw.mov` exists
4. Check Lambda `mediaconvert-trigger` CloudWatch Logs: job created
5. Check MediaConvert Console: job appears and transitions to COMPLETE (~1-3 min)
6. Check S3: `books/{bookId}/pages/{pageId}/hls/index.m3u8` appears
7. Check Lambda `mediaconvert-callback` CloudWatch Logs: webhook called
8. Watch the page in browser: spinner disappears, video player appears
9. Play the video in Chrome (confirms cross-browser HLS works)

- [ ] **Step 4: Error path test**

Upload a corrupted video file → confirm MediaConvert job fails → Lambda B fires with status ERROR → page shows "影片轉檔失敗，請重新上傳"
