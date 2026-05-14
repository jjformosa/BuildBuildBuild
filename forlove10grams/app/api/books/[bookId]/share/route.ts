import type { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Share from '@/lib/models/share'

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (book.createdBy.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Deactivate any existing share tokens for this book
  await Share.updateMany({ bookId: book._id, active: true }, { active: false })

  const token = nanoid(12)
  await Share.create({
    bookId: book._id,
    token,
    createdBy: session.user.id,
    active: true,
  })

  // Mark book as published
  book.published = true
  await book.save()

  const origin = new URL(req.url).origin
  const shareUrl = `${origin}/share/${token}`

  return Response.json({ token, shareUrl })
}
