import type { NextRequest } from 'next/server'
import { isValidObjectId } from 'mongoose'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import { isManager } from '@/lib/access'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string; userId: string }> }
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, userId } = await params
  if (!isValidObjectId(bookId) || !isValidObjectId(userId))
    return Response.json({ error: 'Not found' }, { status: 404 })
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id!, book))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const deleted = await BookReader.findOneAndDelete({ bookId: book._id, userId })
  if (!deleted) return Response.json({ error: 'Reader not found' }, { status: 404 })

  return new Response(null, { status: 204 })
}
