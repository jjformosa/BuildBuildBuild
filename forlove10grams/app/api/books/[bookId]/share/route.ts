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

  await Share.updateMany({ bookId: book._id, active: true }, { active: false })
  // Two separate writes — not atomic; shareStatus and active shares may briefly diverge on crash

  const token = nanoid(12)
  await Share.create({ bookId: book._id, token, createdBy: session.user.id, active: true })

  book.shareStatus = 'shared'
  await book.save()

  const origin = new URL(req.url).origin
  return Response.json({ token, shareUrl: `${origin}/share/${token}` })
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
