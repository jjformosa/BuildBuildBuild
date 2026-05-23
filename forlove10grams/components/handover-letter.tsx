'use client'

import Link from 'next/link'

export function HandoverLetter({
  isEditor,
  editorLetter,
  creatorName,
  bookId,
}: {
  isEditor: boolean
  editorLetter: string
  creatorName: string
  bookId: string
}) {
  if (!isEditor || !editorLetter) return null

  return (
    <div className="mt-16 mb-12 mx-auto max-w-md border-t border-[#2C1810]/10 pt-12 text-center space-y-6">
      <p className="text-xs text-[#2C1810]/40 tracking-wider uppercase">
        {creatorName} 想對你說
      </p>
      <p className="text-sm text-[#2C1810]/75 leading-relaxed italic">
        「{editorLetter}」
      </p>
      <div className="pt-2">
        <Link
          href={`/books/${bookId}/edit`}
          className="rounded-md border border-[#2C1810]/30 px-4 py-2 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
        >
          進入編輯 →
        </Link>
      </div>
    </div>
  )
}
