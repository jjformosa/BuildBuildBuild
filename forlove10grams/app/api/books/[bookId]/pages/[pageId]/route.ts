import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { canEditBook } from '@/lib/access'
import { signImageUrl } from '@/lib/sign-media'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string; pageId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, pageId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!canEditBook(session.user.id!, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const page = await Page.findById(pageId)
  if (!page) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    _id: page._id.toString(),
    transcodingStatus: page.transcodingStatus ?? null,
    mediaUrls: page.type === 'carousel' ? page.mediaUrls.map(signImageUrl) : page.mediaUrls,
  })
}

const PatchPageBody = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  happenedAt: z.string().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string; pageId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, pageId } = await ctx.params
  const body = await req.json()
  const parsed = PatchPageBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Book not found', bookId }, { status: 404 })
  }
  if (!canEditBook(session.user.id!, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const page = await Page.findOne({ _id: pageId, bookId: book._id })
  if (!page) {
    const pageExists = await Page.findById(pageId)
    return Response.json({
      error: 'Page not found in this book',
      pageId,
      bookId: book._id.toString(),
      pageExistsElsewhere: pageExists ? pageExists.bookId.toString() : null,
    }, { status: 404 })
  }

  Object.assign(page, parsed.data)
  await page.save()

  return Response.json(page)
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string; pageId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, pageId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (!canEditBook(session.user.id!, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const page = await Page.findOne({ _id: pageId, bookId: book._id })
  if (!page) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  book.pageOrder = book.pageOrder.filter((id) => id.toString() !== pageId)
  await book.save()
  await page.deleteOne()

  return Response.json({ ok: true })
}
