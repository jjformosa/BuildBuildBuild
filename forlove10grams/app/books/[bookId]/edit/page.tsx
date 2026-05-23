import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { InviteEditorButton } from '@/components/invite-editor-button'
import { ShareButton } from '@/components/share-button'
import { CoverImageButton } from '@/components/cover-image-button'
import { BookEditorClient, type PageData } from '@/components/book-editor-client'
import { InviteLinkManager } from '@/components/invite-link-manager'
import { ShareStatusProvider } from '@/lib/contexts/share-status-context'
import { ShareLinkManager } from '@/components/share-link-manager'

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

  const carouselImages = rawPages
    .filter((p) => p.type === 'carousel')
    .flatMap((p) => p.mediaUrls)

  return (
    <ShareStatusProvider>
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
          <Link
            href={`/read/${bookId}`}
            className="rounded-md border border-[#2C1810]/20 px-3 py-1.5 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
          >
            查看書本
          </Link>
          {isOwner && (
            <CoverImageButton bookId={bookId} initialCoverImage={book.coverImage ?? null} availableImages={carouselImages} />
          )}
          {isOwner && <ShareButton bookId={bookId} />}
          {isOwner && <InviteEditorButton bookId={bookId} />}
        </div>
      </header>

      <BookEditorClient bookId={bookId} initialPages={pages} initialTags={book.tags ?? []} />
      <section className="flex-none border-t border-[#2C1810]/10 bg-[#FAF7F2] px-4 sm:px-6 py-4 space-y-6">
        <InviteLinkManager bookId={bookId} />
        {isOwner && <ShareLinkManager bookId={bookId} />}
      </section>
    </main>
    </ShareStatusProvider>
  )
}
