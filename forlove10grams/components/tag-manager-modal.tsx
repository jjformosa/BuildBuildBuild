'use client'

import { useEffect } from 'react'
import TagInput from '@/components/tag-input'

interface TagManagerModalProps {
  tags: string[] | null | undefined
  onAdd: (tag: string) => Promise<void>
  onRemove: (tag: string) => Promise<void>
  onClose: () => void
}

export default function TagManagerModal({ tags, onAdd, onRemove, onClose }: TagManagerModalProps) {
  const safeTags = tags ?? []

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#2C1810]">標籤管理</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#2C1810]/30 hover:text-[#2C1810]/60 transition-colors text-lg leading-none"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>
        <TagInput tags={safeTags} onAdd={onAdd} onRemove={onRemove} />
      </div>
    </div>
  )
}
