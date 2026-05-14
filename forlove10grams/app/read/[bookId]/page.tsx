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
  const rawPages = await Page.find({ bookId: book._id })
  rawPages.sort(
    (a, b) => pageIds.indexOf(a._id.toString()) - pageIds.indexOf(b._id.toString())
  )

  const pages: ReadPageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content ?? '',
    mediaUrls: p.mediaUrls,
  }))

  return (
    <ReadPageClient bookId={bookId} bookTitle={book.title} pages={pages} />
  )
}
