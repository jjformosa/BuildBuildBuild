import type { NextRequest } from 'next/server'
import { z } from 'zod'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const after = searchParams.get('after')
  const limit = Math.min(Number(searchParams.get('limit') ?? '10'), 200)
  const status = searchParams.get('status')

  await dbConnect()

  const q = searchParams.get('q')?.trim() ?? ''

  const query: Record<string, unknown> = { createdBy: session.user.id }
  if (after) {
    query._id = { $lt: new mongoose.Types.ObjectId(after) }
  }
  if (status === 'published') query.published = true
  if (status === 'unpublished') query.published = { $ne: true }
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = { $regex: escaped, $options: 'i' }
    query.$or = [{ title: regex }, { tags: regex }]
  }

  const books = await Book.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .select('_id title description coverImage published tags')
    .lean()

  return Response.json(
    books.map((b) => ({
      _id: b._id.toString(),
      title: b.title,
      description: b.description ?? null,
      coverImage: b.coverImage ?? null,
      published: b.published ?? false,
      tags: (b as { tags?: string[] }).tags ?? [],
    }))
  )
}

const CreateBookBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateBookBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  await dbConnect()
  const book = await Book.create({
    ...parsed.data,
    createdBy: session.user.id,
  })

  return Response.json(book, { status: 201 })
}
