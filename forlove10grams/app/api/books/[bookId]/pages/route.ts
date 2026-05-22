import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { canEditBook } from '@/lib/access'

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/pages'>
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params
  const { searchParams } = new URL(req.url)
  const after = searchParams.get('after')
  const limit = Math.min(Number(searchParams.get('limit') ?? '5'), 20)

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })

  const canRead = canEditBook(session.user.id, book) || book.shareStatus === 'shared' || book.shareStatus === 'public'
  if (!canRead) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const pageOrder: string[] = book.pageOrder.map((id) => id.toString())
  const startIndex = after ? pageOrder.indexOf(after) + 1 : 0
  const batch = pageOrder.slice(startIndex, startIndex + limit)

  if (batch.length === 0) return Response.json([])

  const rawPages = await Page.find({ _id: { $in: batch } }).lean()
  const sorted = batch
    .map((id) => rawPages.find((p) => p._id.toString() === id))
    .filter(Boolean)
    .map((p) => ({
      _id: p!._id.toString(),
      type: p!.type,
      content: p!.content ?? '',
      mediaUrls: p!.mediaUrls,
      transcodingStatus: p!.transcodingStatus ?? null,
    }))

  return Response.json(sorted)
}

const CreatePageBody = z.object({
  type: z.enum(['carousel', 'video']),
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
})

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/pages'>
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await ctx.params
  const body = await req.json()
  const parsed = CreatePageBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (!canEditBook(session.user.id!, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const page = await Page.create({
    bookId: book._id,
    type: parsed.data.type,
    content: parsed.data.content,
    mediaUrls: parsed.data.mediaUrls ?? [],
  })
  book.pageOrder.push(page._id)
  await book.save()

  return Response.json(page, { status: 201 })
}
