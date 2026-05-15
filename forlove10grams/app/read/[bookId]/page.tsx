import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { canEditBook } from '@/lib/access'
import { ReadPageClient, type ReadPageData } from '@/components/read-page-client'

export default async function ReadBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params
  const session = await auth()

  if (!session?.user?.id) redirect('/login')

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) notFound()

  const userId = session.user.id
  // Owners/editors always have access; any logged-in user can read published books
  const canAccess = canEditBook(userId, book) || book.published
  if (!canAccess) redirect('/dashboard')

  const pageIds = book.pageOrder.map((id) => id.toString())
  const totalCount = pageIds.length
  const firstBatchIds = pageIds.slice(0, 5)
  const rawPages = firstBatchIds.length > 0
    ? await Page.find({ _id: { $in: firstBatchIds } }).lean()
    : []
  rawPages.sort(
    (a, b) => firstBatchIds.indexOf(a._id.toString()) - firstBatchIds.indexOf(b._id.toString())
  )

  const initialPages: ReadPageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content ?? '',
    mediaUrls: p.mediaUrls,
  }))

  return (
    <ReadPageClient
      bookId={bookId}
      bookTitle={book.title}
      initialPages={initialPages}
      totalCount={totalCount}
    />
  )
}
