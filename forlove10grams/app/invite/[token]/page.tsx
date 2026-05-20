// app/invite/[token]/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import BookInvite from '@/lib/models/book-invite'
import Book from '@/lib/models/book'
import BookReader from '@/lib/models/book-reader'
import { isManager } from '@/lib/access'
import { AcceptInviteButton } from './accept-button'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  await dbConnect()

  const invite = await BookInvite.findOne({ token })
  const now = new Date()
  const isValidInvite =
    invite != null &&
    invite.revokedAt == null &&
    invite.expiresAt > now

  if (!isValidInvite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結無效或書本已停止分享</p>
      </main>
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`)
  }

  const book = await Book.findById(invite.bookId)
  if (!book) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結無效或書本已停止分享</p>
      </main>
    )
  }

  const userId = session!.user!.id!
  const bookId = book._id.toString()

  if (isManager(userId, book)) redirect(`/read/${bookId}`)
  const alreadyReader = await BookReader.exists({ bookId, userId })
  if (alreadyReader) redirect(`/read/${bookId}`)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#FAF7F2] px-4">
      {book.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImage}
          alt={book.title}
          className="h-48 w-36 rounded-lg object-cover shadow-md"
        />
      )}
      <h1 className="text-xl font-semibold text-[#2C1810]">{book.title}</h1>
      <AcceptInviteButton token={token} bookId={bookId} />
    </main>
  )
}
