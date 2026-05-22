import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import ReadProgress from '@/lib/models/read-progress'
import { canEditBook } from '@/lib/access'

async function resolveBook(userId: string, bookId: string) {
  const book = await Book.findById(bookId)
  if (!book) return null
  const canAccess = canEditBook(userId, book) || book.shareStatus === 'shared' || book.shareStatus === 'public'
  return canAccess ? book : null
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bookId = req.nextUrl.searchParams.get('bookId')
  if (!bookId) {
    return Response.json({ error: 'Missing bookId' }, { status: 400 })
  }

  await dbConnect()
  const book = await resolveBook(session.user.id, bookId)
  if (!book) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const records = await ReadProgress.find({
    userId: session.user.id,
    bookId: book._id,
  }).select('pageId')

  return Response.json({ readPageIds: records.map((r) => r.pageId.toString()) })
}

const PostBody = z.object({
  bookId: z.string().min(1),
  pageId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = PostBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { bookId, pageId } = parsed.data
  const userId = session.user.id

  await dbConnect()
  const book = await resolveBook(userId, bookId)
  if (!book) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await ReadProgress.updateOne(
    { userId, bookId: book._id, pageId },
    { $set: { readAt: new Date() } },
    { upsert: true }
  )

  return Response.json({ ok: true })
}
