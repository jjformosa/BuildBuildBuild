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
