'use client'

import { useRef, useState } from 'react'

type Props = {
  bookId: string
  initialCoverImage: string | null
}

export function CoverImageButton({ bookId, initialCoverImage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [coverImage, setCoverImage] = useState(initialCoverImage)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setProgress(0)

    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, fileType: 'cover', contentType: file.type }),
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
      xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`S3 ${xhr.status}`)))
      xhr.onerror = () => reject(new Error('網路錯誤'))
      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    }).catch((err: Error) => {
      setError(err.message)
      setProgress(null)
      throw err
    })

    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverImage: s3Url }),
    })
    setCoverImage(s3Url)
    setProgress(null)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        title={coverImage ? '更換封面' : '設定封面'}
        className="flex items-center gap-1.5 rounded-md border border-[#2C1810]/20 px-2.5 py-1 text-sm text-[#2C1810]/60 hover:text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-40 transition-colors"
      >
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt="" className="h-5 w-5 rounded object-cover" />
        ) : (
          <span className="text-xs">🖼</span>
        )}
        <span className="text-xs hidden sm:inline">
          {progress !== null ? `${progress}%` : coverImage ? '封面' : '設定封面'}
        </span>
      </button>
      {error && (
        <p className="absolute top-full left-0 mt-1 whitespace-nowrap rounded bg-red-50 px-2 py-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
