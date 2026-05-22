import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookLike from '@/lib/models/book-like'
import { canEditBook, isBookReader } from '@/lib/access'

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/like'>
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await ctx.params
  const userId = session.user.id

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const canAccess =
    canEditBook(userId, book) ||
    book.shareStatus === 'shared' ||
    book.shareStatus === 'public' ||
    (await isBookReader(userId, bookId))
  if (!canAccess) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await BookLike.findOne({ bookId: book._id, userId })
  if (existing) {
    await existing.deleteOne()
    return Response.json({ liked: false })
  }

  await BookLike.create({ bookId: book._id, userId })
  return Response.json({ liked: true })
}
