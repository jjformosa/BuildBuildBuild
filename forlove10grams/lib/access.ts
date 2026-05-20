import Share from './models/share'
import BookReader from './models/book-reader'
import { dbConnect } from './mongoose'
import type { IBook } from './models/book'

export function isManager(userId: string, book: IBook): boolean {
  return (
    book.createdBy.toString() === userId ||
    book.editorId?.toString() === userId
  )
}

export function canEditBook(userId: string, book: IBook, role?: string): boolean {
  if (role === 'admin') return true
  return isManager(userId, book)
}

export async function isBookReader(userId: string, bookId: string): Promise<boolean> {
  await dbConnect()
  const exists = await BookReader.exists({ bookId, userId })
  return exists !== null
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
