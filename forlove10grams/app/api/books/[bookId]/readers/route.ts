import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import User from '@/lib/models/user'
import { isManager } from '@/lib/access'

type Ctx = { params: Promise<{ bookId: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const readers = await BookReader.find({ bookId }).lean()
  const userIds = readers.map((r) => r.userId)
  const users = await User.find({ _id: { $in: userIds } }).lean()
  const userMap = new Map(users.map((u) => [u._id.toString(), u]))

  const result = readers.map((r) => {
    const u = userMap.get(r.userId.toString())
    return {
      userId: r.userId.toString(),
      displayName: u?.nickname ?? u?.name ?? u?.email ?? r.userId.toString(),
      joinedAt: r.joinedAt,
    }
  })

  return Response.json(result)
}
