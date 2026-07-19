import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Collection from '@/lib/models/collection'
import Book from '@/lib/models/book'

type BookCoverDoc = { _id: mongoose.Types.ObjectId; coverImage?: string }

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = new mongoose.Types.ObjectId(session.user.id)
  const bookId = new URL(req.url).searchParams.get('bookId')

  await dbConnect()
  const collections = await Collection.find({ ownerId: uid }).sort({ _id: -1 }).lean()

  const firstIds = collections
    .map((c) => c.bookIds[0])
    .filter((id): id is mongoose.Types.ObjectId => Boolean(id))
  const covers =
    firstIds.length > 0
      ? await Book.find({ _id: { $in: firstIds } }, 'coverImage').lean<BookCoverDoc[]>()
      : []
  const coverMap = new Map(covers.map((b) => [b._id.toString(), b.coverImage ?? null]))

  return Response.json(
    collections.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      bookCount: c.bookIds.length,
      coverImage: c.bookIds[0] ? coverMap.get(c.bookIds[0].toString()) ?? null : null,
      ...(bookId
        ? { containsBook: c.bookIds.some((id) => id.toString() === bookId) }
        : {}),
    }))
  )
}

const CreateBody = z.object({ name: z.string().trim().min(1).max(60) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CreateBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  const uid = new mongoose.Types.ObjectId(session.user.id)
  await dbConnect()

  const existing = await Collection.findOne({ ownerId: uid, name: parsed.data.name })
  if (existing) return Response.json({ error: '已有同名收藏夾' }, { status: 409 })

  try {
    const collection = await Collection.create({ ownerId: uid, name: parsed.data.name, bookIds: [] })
    return Response.json(
      { _id: collection._id.toString(), name: collection.name, bookCount: 0, coverImage: null },
      { status: 201 }
    )
  } catch (err) {
    // Unique-index race: another request created the same name between check and insert.
    if ((err as { code?: number }).code === 11000) {
      return Response.json({ error: '已有同名收藏夾' }, { status: 409 })
    }
    throw err
  }
}
