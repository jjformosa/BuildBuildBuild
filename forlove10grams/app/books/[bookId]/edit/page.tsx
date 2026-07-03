import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { signImageUrl } from '@/lib/sign-media'
import { ShareButton } from '@/components/share-button'
import { CoverImageButton } from '@/components/cover-image-button'
import { BookEditorClient, type PageData } from '@/components/book-editor-client'
import { ShareStatusProvider } from '@/lib/contexts/share-status-context'
import { ShareLinkManager } from '@/components/share-link-manager'
import { ReaderList } from '@/components/reader-list'
import { isQuickCaptureMode, type QuickCaptureMode } from '@/lib/quick-capture'

export default async function EditBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>
  searchParams: Promise<{ quick?: string | string[] }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { bookId } = await params
  const userId = session.user.id
  const { quick } = await searchParams
  const quickMode: QuickCaptureMode | null =
    typeof quick === 'string' && isQuickCaptureMode(quick) ? quick : null

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
    mediaUrls: p.type === 'carousel' ? p.mediaUrls.map(signImageUrl) : p.mediaUrls,
  }))

  const carouselImages = rawPages
    .filter((p) => p.type === 'carousel')
    .flatMap((p) => p.mediaUrls.map(signImageUrl))

  return (
    <ShareStatusProvider>
    <main className="flex flex-col min-h-dvh md:h-dvh overflow-x-hidden bg-background">
      <header className="flex flex-none items-center justify-between border-b border-foreground/10 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="flex-none text-sm text-foreground/50 transition-colors hover:text-foreground"
          >
            ← 返回
          </Link>
          <h1 className="truncate text-base sm:text-lg font-semibold text-foreground">{book.title}</h1>
        </div>
        <div className="flex flex-none items-center gap-1 sm:gap-2">
          <Link
            href={`/read/${bookId}`}
            title="查看書本"
            className="flex items-center gap-1.5 rounded-md border border-foreground/20 px-2.5 py-1.5 text-sm text-foreground hover:bg-foreground/5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span className="hidden sm:inline">查看書本</span>
          </Link>
          {isOwner && (
            <CoverImageButton bookId={bookId} initialCoverImage={book.coverImage ?? null} availableImages={carouselImages} />
          )}
          {(isOwner || isEditor) && <ShareButton bookId={bookId} />}
        </div>
      </header>

      <BookEditorClient
        bookId={bookId}
        initialPages={pages}
        initialTags={book.tags ?? []}
        quickMode={quickMode}
      />
      <section className="flex-none border-t border-foreground/10 bg-background px-4 sm:px-6 py-4 space-y-6">
        {(isOwner || isEditor) && <ShareLinkManager bookId={bookId} />}
        {(isOwner || isEditor) && (
          <ReaderList bookId={bookId} shareStatus={book.shareStatus} />
        )}
      </section>
    </main>
    </ShareStatusProvider>
  )
}
