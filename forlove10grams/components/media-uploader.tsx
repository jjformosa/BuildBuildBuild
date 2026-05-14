'use client'

import { useRef, useState } from 'react'

type Props = {
  bookId: string
  pageId: string
  fileType: 'carousel' | 'video'
  mediaUrls: string[]
  onUrlsChange: (urls: string[]) => void
}

export function MediaUploader({ bookId, pageId, fileType, mediaUrls, onUrlsChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const accept = fileType === 'video' ? 'video/mp4,video/quicktime' : 'image/jpeg,image/png,image/webp'
  const multiple = fileType === 'carousel'

  async function uploadFile(file: File) {
    setError(null)
    setProgress(0)

    const contentType = file.type
    const index = mediaUrls.length

    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, pageId, fileType, contentType, index }),
    })
    if (!presignRes.ok) {
      setError('無法取得上傳連結')
      setProgress(null)
      return
    }
    const { presignedUrl, s3Url } = await presignRes.json()

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
      xhr.send(file)
    }).catch((err: Error) => {
      setError(err.message)
      setProgress(null)
      throw err
    })

    // Save URL to DB
    const newUrls = fileType === 'carousel' ? [...mediaUrls, s3Url] : [s3Url]
    await fetch(`/api/books/${bookId}/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaUrls: newUrls }),
    })
    onUrlsChange(newUrls)
    setProgress(null)
  }

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
      await uploadFile(file)
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
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded object-cover border border-[#2C1810]/10"
                />
              ) : (
                <video
                  src={url}
                  className="h-20 w-32 rounded object-cover border border-[#2C1810]/10"
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
            className="rounded-md border border-[#2C1810]/20 px-3 py-1.5 text-xs text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-40 transition-colors"
          >
            {progress !== null ? `上傳中 ${progress}%` : fileType === 'carousel' ? '+ 新增圖片' : '+ 上傳影片'}
          </button>

          {/* Progress bar */}
          {progress !== null && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#2C1810]/10">
              <div
                className="h-1.5 rounded-full bg-[#2C1810]/50 transition-all"
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
