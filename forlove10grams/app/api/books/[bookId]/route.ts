import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]'>
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

  const userId = session.user.id!
  const isOwner = book.createdBy.toString() === userId
  const isEditor = book.editorId?.toString() === userId
  if (!isOwner && !isEditor) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  return Response.json(book)
}

const PatchBookBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  pageOrder: z.array(z.string()).optional(),
})

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]'>
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
  const parsed = PatchBookBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (book.createdBy.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  Object.assign(book, parsed.data)
  await book.save()

  return Response.json(book)
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]'>
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
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

  await Page.deleteMany({ bookId: book._id })
  await book.deleteOne()

  return Response.json({ ok: true })
}
