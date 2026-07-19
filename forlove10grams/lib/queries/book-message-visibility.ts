import type { Types } from 'mongoose'
import BookReader from '@/lib/models/book-reader'
import type { IBookMessage } from '@/lib/models/book-message'

/**
 * Given all messages for one book and the editor's id, return only those
 * whose author is a reader the editor personally brought in
 * (BookReader.sharedBy === editorId).
 */
export async function filterEditorVisible(
  bookId: Types.ObjectId,
  editorId: string,
  messages: IBookMessage[]
): Promise<IBookMessage[]> {
  const readers = await BookReader.find(
    { bookId, sharedBy: editorId },
    'userId'
  ).lean<{ userId: Types.ObjectId }[]>()
  const allowed = new Set(readers.map((r) => r.userId.toString()))
  return messages.filter((m) => allowed.has(m.fromUserId.toString()))
}
