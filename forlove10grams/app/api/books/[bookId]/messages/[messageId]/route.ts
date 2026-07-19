import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookMessage from '@/lib/models/book-message'

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string; messageId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId, messageId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  // Creator only — final disposition follows book ownership, editors cannot delete.
  if (book.createdBy.toString() !== userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const res = await BookMessage.deleteOne({ _id: messageId, bookId: book._id })
  if (res.deletedCount === 0) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
