import type { NextRequest } from 'next/server'
import { isValidObjectId } from 'mongoose'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import User from '@/lib/models/user'
import { isManager } from '@/lib/access'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await params
  if (!isValidObjectId(bookId)) return Response.json({ error: 'Not found' }, { status: 404 })
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id!, book))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const readers = await BookReader.find({ bookId: book._id }).sort({ joinedAt: -1 }).lean()
  const userIds = readers.map((r) => r.userId)
  const users = await User.find({ _id: { $in: userIds } }, 'name nickname').lean()
  const userMap = new Map(users.map((u) => [u._id.toString(), u]))

  const result = readers.map((r) => ({
    userId: r.userId.toString(),
    displayName:
      userMap.get(r.userId.toString())?.nickname ??
      userMap.get(r.userId.toString())?.name ??
      '未知使用者',
    joinedAt: r.joinedAt.toISOString(),
  }))

  return Response.json(result)
}
