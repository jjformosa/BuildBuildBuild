import { dbConnect } from './mongoose'
import type { IBook } from './models/book'
import BookReader from './models/book-reader'

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

export async function canReadBook(userId: string, book: IBook): Promise<boolean> {
  if (canEditBook(userId, book)) return true
  if (book.shareStatus === 'public') return true
  if (book.shareStatus === 'shared') {
    await dbConnect()
    const reader = await BookReader.exists({ bookId: book._id, userId })
    return reader !== null
  }
  return false
}
