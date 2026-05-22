import type { NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongoose'
import Share from '@/lib/models/share'
import Book from '@/lib/models/book'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  await dbConnect()
  const share = await Share.findOne({ token, active: true })
  if (!share) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 404 })
  }

  const book = await Book.findById(share.bookId)
  if (!book) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 404 })
  }

  if (book.shareStatus !== 'shared' && book.shareStatus !== 'public') {
    return Response.json({ error: 'Book not shared' }, { status: 403 })
  }

  return Response.json({ bookId: share.bookId.toString() })
}
