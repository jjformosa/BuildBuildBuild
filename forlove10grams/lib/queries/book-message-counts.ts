import type { Types } from 'mongoose'
import BookMessage, { type IBookMessage } from '@/lib/models/book-message'
import { filterEditorVisible } from '@/lib/queries/book-message-visibility'

export type MessageCount = { total: number; unread: number }

export async function getMessageCountsByBook(
  bookIds: Types.ObjectId[],
  viewerId: string,
  scope: 'owner' | 'editor'
): Promise<Map<string, MessageCount>> {
  if (bookIds.length === 0) return new Map()

  const all = await BookMessage.find({ bookId: { $in: bookIds } }).lean<IBookMessage[]>()

  // For editors, keep only messages from readers they brought in — per book.
  let visible = all
  if (scope === 'editor') {
    const byBook = new Map<string, IBookMessage[]>()
    for (const m of all) {
      const id = m.bookId.toString()
      const list = byBook.get(id) ?? []
      list.push(m)
      byBook.set(id, list)
    }
    const kept: IBookMessage[] = []
    for (const bookId of bookIds) {
      const msgs = byBook.get(bookId.toString())
      if (!msgs) continue
      kept.push(...(await filterEditorVisible(bookId, viewerId, msgs)))
    }
    visible = kept
  }

  const map = new Map<string, MessageCount>()
  for (const m of visible) {
    const id = m.bookId.toString()
    const cur = map.get(id) ?? { total: 0, unread: 0 }
    cur.total += 1
    const unread = scope === 'owner' ? m.readByCreatorAt == null : m.readByEditorAt == null
    if (unread) cur.unread += 1
    map.set(id, cur)
  }
  return map
}
