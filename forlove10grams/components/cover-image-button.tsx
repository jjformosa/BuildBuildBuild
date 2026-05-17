'use client'

import { useState } from 'react'

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
        className="flex items-center gap-1.5 rounded-md border border-[#2C1810]/20 px-2.5 py-1 text-sm text-[#2C1810]/60 hover:text-[#2C1810] hover:bg-[#2C1810]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? (
          <span className="h-5 w-5 flex items-center justify-center">
            <span className="h-3 w-3 rounded-full border-2 border-[#2C1810]/30 border-t-[#2C1810] animate-spin" />
          </span>
        ) : coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt="" className="h-5 w-5 rounded object-cover" />
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
          <div className="fixed right-4 top-16 z-50 w-72 rounded-xl border border-[#2C1810]/10 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-[#2C1810]/50">選擇封面圖片</p>
            <div className="grid grid-cols-4 gap-1.5 max-h-64 overflow-y-auto">
              {availableImages.map((url) => (
                <button
                  key={url}
                  onClick={() => selectImage(url)}
                  disabled={isSaving}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                    coverImage === url
                      ? 'border-[#2C1810]'
                      : 'border-transparent hover:border-[#2C1810]/30'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
