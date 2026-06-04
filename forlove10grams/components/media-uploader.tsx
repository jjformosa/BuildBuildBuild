'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'

type Props = {
  bookId: string
  pageId: string
  fileType: 'carousel' | 'video'
  mediaUrls: string[]
  onUrlsChange: (urls: string[]) => void
  onTranscodingReady?: (hlsUrl: string) => void
}

export function MediaUploader({ bookId, pageId, fileType, mediaUrls, onUrlsChange, onTranscodingReady }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTranscoding, setIsTranscoding] = useState(false)

  const IMAGE_LIMIT = 15
  const accept = fileType === 'video' ? 'video/mp4,video/quicktime,video/x-m4v' : 'image/*'
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024
  const multiple = fileType === 'carousel'
  const atImageLimit = fileType === 'carousel' && mediaUrls.length >= IMAGE_LIMIT

  function pollTranscoding() {
    const MAX_ATTEMPTS = 200 // ~10 minutes at 3s interval
    let attempts = 0
    pollIntervalRef.current = setInterval(async () => {
      attempts++
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollIntervalRef.current!)
        pollIntervalRef.current = null
        setIsTranscoding(false)
        setError('轉檔逾時，請重新上傳')
        return
      }
      try {
        const res = await fetch(`/api/books/${bookId}/pages/${pageId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.transcodingStatus === 'ready' && data.mediaUrls?.[0]) {
          clearInterval(pollIntervalRef.current!)
          pollIntervalRef.current = null
          setIsTranscoding(false)
          onUrlsChange(data.mediaUrls)
          onTranscodingReady?.(data.mediaUrls[0])
        } else if (data.transcodingStatus === 'error') {
          clearInterval(pollIntervalRef.current!)
          pollIntervalRef.current = null
          setIsTranscoding(false)
          setError('影片轉檔失敗，請重新上傳')
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000)
  }

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [])

  async function uploadFile(file: File, currentUrls: string[]): Promise<string[]> {
    if (currentUrls.length >= IMAGE_LIMIT) return currentUrls
    setError(null)
    setProgress(0)

    let fileToUpload = file
    if (fileType !== 'video') {
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
        })
      } catch {
        setError('圖片處理失敗，請重試')
        setProgress(null)
        return currentUrls
      }
      if (fileToUpload.size > MAX_IMAGE_BYTES) {
        setError('圖片壓縮後仍超過 2MB，請換一張較小的圖片')
        setProgress(null)
        return currentUrls
      }
    }

    const contentType = fileToUpload.type || 'image/jpeg'
    const index = currentUrls.length

    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, pageId, fileType, contentType, index }),
    })
    if (!presignRes.ok) {
      setError('無法取得上傳連結')
      setProgress(null)
      return currentUrls
    }
    const { presignedUrl, s3Url, signedUrl } = await presignRes.json()

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status === 200) resolve()
          else reject(new Error(`S3 回傳 ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('網路錯誤'))
        xhr.open('PUT', presignedUrl)
        xhr.setRequestHeader('Content-Type', contentType)
        xhr.send(fileToUpload)
      })
    } catch (err) {
      setError((err as Error).message)
      setProgress(null)
      return currentUrls
    }

    if (fileType === 'video') {
      setIsTranscoding(true)
      setProgress(null)
      pollTranscoding()
      return currentUrls
    } else {
      const newUrls = [...currentUrls, signedUrl || s3Url]
      await fetch(`/api/books/${bookId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrls: newUrls }),
      })
      onUrlsChange(newUrls)
      setProgress(null)
      return newUrls
    }
  }

  async function handleFiles(files: FileList) {
    let currentUrls = [...mediaUrls]
    for (const file of Array.from(files)) {
      currentUrls = await uploadFile(file, currentUrls)
    }
  }

  function handleRemove(url: string) {
    const newUrls = mediaUrls.filter((u) => u !== url)
    onUrlsChange(newUrls)
    fetch(`/api/books/${bookId}/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaUrls: newUrls }),
    })
  }

  return (
    <div className="space-y-3">
      {/* Existing media */}
      {mediaUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mediaUrls.map((url) => (
            <div key={url} className="relative group">
              {fileType === 'carousel' ? (
                <Image
                  src={url}
                  alt=""
                  width={80}
                  height={80}
                  className="rounded object-cover border border-foreground/10"
                />
              ) : (
                <video
                  src={url}
                  className="h-20 w-32 rounded object-cover border border-foreground/10"
                  muted
                />
              )}
              <button
                onClick={() => handleRemove(url)}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-400 text-white text-[10px]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {(fileType === 'carousel' || mediaUrls.length === 0) && (
        <div>
          {isTranscoding ? (
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              <span className="h-3 w-3 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
              轉檔中，請稍候…
            </div>
          ) : atImageLimit ? (
            <p className="text-xs text-foreground/50">已達圖片上限（{IMAGE_LIMIT} 張）</p>
          ) : (
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
          )}

          {/* Progress bar */}
          {progress !== null && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-foreground/10">
              <div
                className="h-1.5 rounded-full bg-foreground/50 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
