import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import BookInvite from '@/lib/models/book-invite'
import BookReader from '@/lib/models/book-reader'
import Book from '@/lib/models/book'
import { isManager } from '@/lib/access'

type Ctx = { params: Promise<{ token: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const userId = session.user.id

  // Manager clicking their own invite just redirects — no DB write needed
  if (isManager(userId, book)) {
    return Response.json({ alreadyReader: true, bookId: book._id.toString() })
  }

  // Upsert: safe to call multiple times
  const existing = await BookReader.findOne({ bookId: invite.bookId, userId })
  if (existing) {
    return Response.json({ alreadyReader: true, bookId: book._id.toString() })
  }

  await BookReader.create({ bookId: invite.bookId, userId })

  return Response.json({ bookId: book._id.toString() })
}
