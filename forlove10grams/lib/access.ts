import Share from './models/share'
import type { IBook } from './models/book'

export function canEditBook(userId: string, book: IBook, role?: string): boolean {
  if (role === 'admin') return true
  return (
    book.createdBy.toString() === userId ||
    book.editorId?.toString() === userId
  )
}

export async function canReadBook(
  userId: string,
  book: IBook,
  token?: string
): Promise<boolean> {
  if (canEditBook(userId, book)) return true
  if (!token) return false
  const share = await Share.exists({
    bookId: book._id,
    token,
    active: true,
  })
  return share !== null
}
