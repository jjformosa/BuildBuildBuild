import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Share from '@/lib/models/share'
import Book from '@/lib/models/book'

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結無效或已過期</p>
      </main>
    )
  }

  const book = await Book.findById(share.bookId)

  if (!book) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">連結無效或已過期</p>
      </main>
    )
  }

  if (book.shareStatus !== 'shared' && book.shareStatus !== 'public') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">此記憶書尚未發布</p>
      </main>
    )
  }

  redirect(`/read/${share.bookId.toString()}`)
}
