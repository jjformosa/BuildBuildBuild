import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Share from '@/lib/models/share'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import { isManager } from '@/lib/access'
import { BlockedPage } from '@/components/blocked-page'

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const session = await auth()

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/share/${token}`)}`)
  }

  await dbConnect()
  const share = await Share.findOne({ token, active: true })

  if (!share) {
    return <BlockedPage message="連結無效或已過期" />
  }

  if (share.expiresAt != null && share.expiresAt < new Date()) {
    return <BlockedPage message="連結已到期" />
  }

  const book = await Book.findById(share.bookId)

  if (!book) {
    return <BlockedPage message="連結無效或已過期" />
  }

  if (book.shareStatus !== 'shared' && book.shareStatus !== 'public') {
    return <BlockedPage message="此記憶書尚未開放" />
  }

  if (book.shareStatus === 'shared' && !isManager(session.user.id!, book)) {
    await BookReader.findOneAndUpdate(
      { bookId: book._id, userId: session.user.id },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true }
    )
  }

  redirect(`/read/${share.bookId.toString()}`)
}
