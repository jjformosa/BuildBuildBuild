'use client'

import { useState } from 'react'
import Image from 'next/image'

type Props = {
  bookId: string
  initialCoverImage: string | null
  availableImages: string[]
}

export function CoverImageButton({ bookId, initialCoverImage, availableImages }: Props) {
  const [coverImage, setCoverImage] = useState(initialCoverImage)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const hasImages = availableImages.length > 0
  const isDisabled = isSaving || !hasImages

  async function selectImage(url: string) {
    setIsSaving(true)
    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverImage: url }),
    })
    setCoverImage(url)
    setIsSaving(false)
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isDisabled}
        title={
          !hasImages
            ? '上傳輪播圖片後即可設定封面'
            : coverImage
            ? '更換封面'
            : '設定封面'
        }
        className="btn-outline-sm"
      >
        {isSaving ? (
          <span className="h-5 w-5 flex items-center justify-center">
            <span className="h-3 w-3 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
          </span>
        ) : coverImage ? (
          <Image src={coverImage} alt="" width={20} height={20} className="rounded object-cover" />
        ) : (
          <span className="text-xs">🖼</span>
        )}
        <span className="text-xs hidden sm:inline">
          {isSaving ? '儲存中…' : coverImage ? '封面' : '設定封面'}
        </span>
      </button>

      {isOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* picker panel */}
          <div className="fixed right-4 top-16 z-50 w-72 rounded-xl border border-foreground/10 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-foreground/50">選擇封面圖片</p>
            <div className="grid grid-cols-4 gap-1.5 max-h-64 overflow-y-auto">
              {availableImages.map((url) => (
                <button
                  key={url}
                  onClick={() => selectImage(url)}
                  disabled={isSaving}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                    coverImage === url
                      ? 'border-foreground'
                      : 'border-transparent hover:border-foreground/30'
                  }`}
                >
                  <Image src={url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
