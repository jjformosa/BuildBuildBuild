import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookMessage, { type IBookMessage } from '@/lib/models/book-message'
import User from '@/lib/models/user'
import { isManager } from '@/lib/access'
import { filterEditorVisible } from '@/lib/queries/book-message-visibility'

type UserNameDoc = { _id: unknown; name?: string; nickname?: string | null }

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { bookId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(userId, book)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const isCreator = book.createdBy.toString() === userId
  const all = await BookMessage.find({ bookId: book._id }).sort({ updatedAt: -1 }).lean<IBookMessage[]>()
  const visible = isCreator ? all : await filterEditorVisible(book._id, userId, all)

  const fromIds = visible.map((m) => m.fromUserId)
  const users = await User.find({ _id: { $in: fromIds } }, 'name nickname').lean<UserNameDoc[]>()
  const nameMap = new Map(users.map((u) => [String(u._id), u.nickname ?? u.name ?? '讀者']))

  return Response.json(
    visible.map((m) => ({
      _id: m._id!.toString(),
      fromName: nameMap.get(m.fromUserId.toString()) ?? '讀者',
      body: m.body,
      updatedAt: m.updatedAt,
      unread: isCreator ? m.readByCreatorAt == null : m.readByEditorAt == null,
    }))
  )
}
