import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookMessage from '@/lib/models/book-message'
import { canEditBook, canReadBook } from '@/lib/access'

const PutBody = z.object({ body: z.string().trim().min(1).max(500) })

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId } = await ctx.params

  const parsed = PutBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })

  // Only readers-with-access, never managers (creator/editor).
  if (canEditBook(userId, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Managers cannot leave messages' }, { status: 403 })
  }
  if (!(await canReadBook(userId, book))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const msg = await BookMessage.findOneAndUpdate(
    { bookId: book._id, fromUserId: userId },
    { body: parsed.data.body, readByCreatorAt: null, readByEditorAt: null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return Response.json({ body: msg.body, updatedAt: msg.updatedAt })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId } = await ctx.params

  await dbConnect()
  const res = await BookMessage.deleteOne({ bookId, fromUserId: userId })
  if (res.deletedCount === 0) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
