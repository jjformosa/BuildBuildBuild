import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Collection from '@/lib/models/collection'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'

type BookDoc = {
  _id: mongoose.Types.ObjectId
  title: string
  coverImage?: string
  shareStatus?: string
  createdBy: mongoose.Types.ObjectId
  editorId?: mongoose.Types.ObjectId
}

/** Does `userId` have a dashboard-level relation to this book? */
async function hasBookRelation(userId: string, book: BookDoc): Promise<boolean> {
  if (book.createdBy.toString() === userId) return true
  if (book.editorId?.toString() === userId) return true
  const reader = await BookReader.exists({ bookId: book._id, userId })
  return reader !== null
}

function roleForBook(userId: string, book: BookDoc, isReader: boolean): 'owner' | 'editor' | 'reader' | null {
  if (book.createdBy.toString() === userId) return 'owner'
  if (book.editorId?.toString() === userId) return 'editor'
  if (book.shareStatus === 'public') return 'reader'
  if (book.shareStatus === 'shared' && isReader) return 'reader'
  return null
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ collectionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const uid = new mongoose.Types.ObjectId(userId)
  const { collectionId } = await ctx.params

  await dbConnect()
  const collection = await Collection.findOne({ _id: collectionId, ownerId: uid })
  if (!collection) return Response.json({ error: 'Not found' }, { status: 404 })

  const books = await Book.find({ _id: { $in: collection.bookIds } }).lean<BookDoc[]>()
  const bookMap = new Map(books.map((b) => [b._id.toString(), b]))

  const readerRecs = await BookReader.find(
    { userId: uid, bookId: { $in: collection.bookIds } },
    'bookId'
  ).lean<{ bookId: mongoose.Types.ObjectId }[]>()
  const readerSet = new Set(readerRecs.map((r) => r.bookId.toString()))

  const items = collection.bookIds
    .map((id) => bookMap.get(id.toString()))
    .filter((b): b is BookDoc => Boolean(b))
    .map((b) => {
      const role = roleForBook(userId, b, readerSet.has(b._id.toString()))
      if (!role) return null
      return {
        _id: b._id.toString(),
        title: b.title,
        coverImage: b.coverImage ?? null,
        shareStatus: b.shareStatus ?? 'private',
        role,
      }
    })
    .filter(Boolean)

  return Response.json(items)
}

const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    addBookId: z.string().optional(),
    removeBookId: z.string().optional(),
    bookIds: z.array(z.string()).optional(),
  })
  .refine((b) => b.name || b.addBookId || b.removeBookId || b.bookIds, {
    message: 'At least one field required',
  })

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ collectionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const uid = new mongoose.Types.ObjectId(userId)
  const { collectionId } = await ctx.params

  const parsed = PatchBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  await dbConnect()
  const collection = await Collection.findOne({ _id: collectionId, ownerId: uid })
  if (!collection) return Response.json({ error: 'Not found' }, { status: 404 })

  const { name, addBookId, removeBookId, bookIds } = parsed.data

  if (name !== undefined) {
    const dup = await Collection.findOne({ ownerId: uid, name, _id: { $ne: collection._id } })
    if (dup) return Response.json({ error: '已有同名收藏夾' }, { status: 409 })
    collection.name = name
  }

  if (addBookId) {
    const book = await Book.findById(addBookId).lean<BookDoc>()
    if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })
    if (!(await hasBookRelation(userId, book))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!collection.bookIds.some((id) => id.toString() === addBookId)) {
      collection.bookIds.push(new mongoose.Types.ObjectId(addBookId))
    }
  }

  if (removeBookId) {
    collection.bookIds = collection.bookIds.filter((id) => id.toString() !== removeBookId)
  }

  if (bookIds) {
    const current = collection.bookIds.map((id) => id.toString()).sort()
    const next = [...bookIds].sort()
    const isPermutation =
      current.length === next.length && current.every((id, i) => id === next[i])
    if (!isPermutation) {
      return Response.json({ error: 'bookIds must be a permutation of the current set' }, { status: 400 })
    }
    collection.bookIds = bookIds.map((id) => new mongoose.Types.ObjectId(id))
  }

  await collection.save()
  return Response.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ collectionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const uid = new mongoose.Types.ObjectId(session.user.id)
  const { collectionId } = await ctx.params

  await dbConnect()
  const res = await Collection.deleteOne({ _id: collectionId, ownerId: uid })
  if (res.deletedCount === 0) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}
