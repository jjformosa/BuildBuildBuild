import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import { isManager } from '@/lib/access'

type Ctx = { params: Promise<{ bookId: string; userId: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, userId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const deleted = await BookReader.findOneAndDelete({ bookId, userId })
  if (!deleted) {
    return Response.json({ error: 'Reader not found' }, { status: 404 })
  }

  return Response.json({ ok: true })
}
