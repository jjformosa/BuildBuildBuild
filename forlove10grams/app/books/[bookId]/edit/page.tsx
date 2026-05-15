import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { InviteEditorButton } from '@/components/invite-editor-button'
import { ShareButton } from '@/components/share-button'
import { BookEditorClient, type PageData } from '@/components/book-editor-client'

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const session = await auth()
  const { bookId } = await params
  const userId = session!.user!.id!

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) notFound()

  const isOwner = book.createdBy.toString() === userId
  const isEditor = book.editorId?.toString() === userId
  if (!isOwner && !isEditor) redirect('/dashboard')

  const pageIds = book.pageOrder.map((id) => id.toString())
  const rawPages = await Page.find({ bookId: book._id })
  rawPages.sort((a, b) => pageIds.indexOf(a._id.toString()) - pageIds.indexOf(b._id.toString()))

  const pages: PageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content,
    mediaUrls: p.mediaUrls,
  }))

  return (
    <main className="flex h-screen flex-col bg-[#FAF7F2]">
      <header className="flex flex-none items-center justify-between border-b border-[#2C1810]/10 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="flex-none text-sm text-[#2C1810]/50 transition-colors hover:text-[#2C1810]"
          >
            ← 返回
          </Link>
          <h1 className="truncate text-base sm:text-lg font-semibold text-[#2C1810]">{book.title}</h1>
        </div>
        <div className="flex flex-none items-center gap-1 sm:gap-2">
          {isOwner && <ShareButton bookId={bookId} />}
          <InviteEditorButton bookId={bookId} />
        </div>
      </header>

      <BookEditorClient bookId={bookId} initialPages={pages} />
    </main>
  )
}
