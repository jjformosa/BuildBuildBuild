import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import { canEditBook } from '@/lib/access'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string; tagName: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, tagName } = await params
  const decodedName = decodeURIComponent(tagName)

  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (!canEditBook(session.user.id, book, session.user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  book.tags = book.tags.filter((t) => t !== decodedName)
  await book.save()

  return Response.json({ tags: book.tags })
}
