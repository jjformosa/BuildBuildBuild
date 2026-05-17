import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Tag from '@/lib/models/tag'
import { canEditBook } from '@/lib/access'

const AddTagBody = z.object({
  name: z.string().min(1).max(50).trim(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params

  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (!canEditBook(session.user.id, book, session.user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = AddTagBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const name = parsed.data.name

  if (!book.tags.includes(name)) {
    book.tags.push(name)
    await book.save()
  }

  await Tag.updateOne(
    { name },
    { $setOnInsert: { name, authorId: session.user.id } },
    { upsert: true }
  )

  return Response.json({ tags: book.tags })
}
