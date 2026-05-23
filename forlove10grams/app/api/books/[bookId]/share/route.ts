import type { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book, { type IBook } from '@/lib/models/book'
import Share from '@/lib/models/share'

async function requireManager(
  bookId: string,
  userId: string,
): Promise<{ book: IBook; err: null } | { book: null; err: Response }> {
  const book = await Book.findById(bookId)
  if (!book) return { book: null, err: Response.json({ error: 'Not found' }, { status: 404 }) }
  const isOwner = book.createdBy.toString() === userId
  const isEditor = book.editorId?.toString() === userId
  if (!isOwner && !isEditor)
    return { book: null, err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { book, err: null }
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  await dbConnect()

  const { book, err } = await requireManager(bookId, session.user.id!)
  if (err) return err

  const share = await Share.findOne({ bookId: book._id, active: true })
  if (!share) return Response.json({ active: false })

  const origin = new URL(req.url).origin
  return Response.json({
    active: true,
    token: share.token,
    shareUrl: `${origin}/share/${share.token}`,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt?.toISOString() ?? null,
  })
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  await dbConnect()

  const { book, err } = await requireManager(bookId, session.user.id!)
  if (err) return err

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const expiresAt = book.shareStatus === 'public'
    ? null
    : new Date(Date.now() + SEVEN_DAYS_MS)

  const origin = new URL(req.url).origin
  const existing = await Share.findOne({ bookId: book._id, active: true })

  if (existing) {
    await Share.updateOne({ _id: existing._id }, { $set: { expiresAt } })
    return Response.json({
      token: existing.token,
      shareUrl: `${origin}/share/${existing.token}`,
      expiresAt: expiresAt?.toISOString() ?? null,
    })
  }

  const token = nanoid(12)
  await Share.create({ bookId: book._id, token, createdBy: session.user.id, active: true, expiresAt })

  if (book.shareStatus !== 'public') {
    book.shareStatus = 'shared'
    await book.save()
  }

  return Response.json({
    token,
    shareUrl: `${origin}/share/${token}`,
    expiresAt: expiresAt?.toISOString() ?? null,
  })
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/share'>
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  await dbConnect()

  const { book, err } = await requireManager(bookId, session.user.id!)
  if (err) return err

  await Share.updateMany({ bookId: book._id, active: true }, { active: false })
  // Two separate writes — not atomic; shareStatus and active shares may briefly diverge on crash

  book.shareStatus = 'private'
  await book.save()

  return new Response(null, { status: 204 })
}
