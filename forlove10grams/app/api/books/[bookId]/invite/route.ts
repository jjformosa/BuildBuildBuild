import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import User from '@/lib/models/user'

const InviteBody = z.object({
  email: z.email(),
})

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/invite'>
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { bookId } = await ctx.params

  const body = await req.json()
  const parsed = InviteBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }
  const { email } = parsed.data

  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Book not found' }, { status: 404 })
  }
  if (book.createdBy.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invitee = await User.findOne({ email, role: 'customer' })
  if (!invitee) {
    return Response.json(
      { error: 'User not found or not a customer' },
      { status: 404 }
    )
  }

  book.editorId = invitee._id
  await book.save()

  return Response.json({ ok: true, editorId: invitee._id })
}
