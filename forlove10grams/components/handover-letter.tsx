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
    <div className="mt-16 mb-12 mx-auto max-w-md border-t border-foreground/10 pt-12 text-center space-y-6">
      <p className="text-xs text-foreground/40 tracking-wider uppercase">
        {creatorName} 想對你說
      </p>
      <p className="text-sm text-foreground/75 leading-relaxed italic">
        「{editorLetter}」
      </p>
      <div className="pt-2">
        <Link
          href={`/books/${bookId}/edit`}
          className="btn-outline-sm"
        >
          進入編輯 →
        </Link>
      </div>
    </div>
  )
}
