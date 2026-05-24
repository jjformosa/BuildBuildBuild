import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/editor'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { bookId } = await ctx.params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (book.createdBy.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  book.editorId = undefined
  book.editorLetter = undefined
  await book.save()

  return new Response(null, { status: 204 })
}
