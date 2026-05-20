import type { NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongoose'
import BookInvite from '@/lib/models/book-invite'
import Book from '@/lib/models/book'

type Ctx = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params
  await dbConnect()

  const invite = await BookInvite.findOne({ token })
  if (!invite) {
    return Response.json({ error: 'Invite not found' }, { status: 404 })
  }

  const now = new Date()
  if (invite.revokedAt != null || invite.expiresAt <= now) {
    return Response.json({ error: 'Invite expired or revoked' }, { status: 410 })
  }

  const book = await Book.findById(invite.bookId)
  if (!book) {
    return Response.json({ error: 'Invite not found' }, { status: 404 })
  }

  return Response.json({
    bookId: book._id.toString(),
    title: book.title,
    coverImage: book.coverImage ?? null,
  })
}
