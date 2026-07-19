import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookMessage, { type IBookMessage } from '@/lib/models/book-message'
import { isManager } from '@/lib/access'
import { filterEditorVisible } from '@/lib/queries/book-message-visibility'

export async function PATCH(
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

  const now = new Date()
  const isCreator = book.createdBy.toString() === userId

  if (isCreator) {
    await BookMessage.updateMany(
      { bookId: book._id, readByCreatorAt: null },
      { readByCreatorAt: now }
    )
  } else {
    const all = await BookMessage.find({ bookId: book._id, readByEditorAt: null }).lean<IBookMessage[]>()
    const visible = await filterEditorVisible(book._id, userId, all)
    const ids = visible.map((m) => m._id)
    if (ids.length > 0) {
      await BookMessage.updateMany({ _id: { $in: ids } }, { readByEditorAt: now })
    }
  }

  return Response.json({ ok: true })
}
