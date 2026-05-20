import type { Types } from 'mongoose'
import BookLike from '@/lib/models/book-like'

export async function getLikeCountsByBook(
  bookIds: Types.ObjectId[]
): Promise<Map<string, number>> {
  if (bookIds.length === 0) return new Map()

  const results = await BookLike.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { bookId: { $in: bookIds } } },
    { $group: { _id: '$bookId', count: { $sum: 1 } } },
  ])

  return new Map(results.map((r) => [r._id.toString(), r.count]))
}
