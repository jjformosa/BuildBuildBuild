import { auth, signOut } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import { CreateBookButton } from '@/components/create-book-button'
import { DashboardBooksClient, type DashboardBook } from '@/components/dashboard-books-client'

const INITIAL_LIMIT = 10

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  await dbConnect()
  const rawBooks = await Book.find({ createdBy: userId })
    .sort({ _id: -1 })
    .limit(INITIAL_LIMIT)
    .lean()

  const initialBooks: DashboardBook[] = rawBooks.map((b) => ({
    _id: b._id.toString(),
    title: b.title,
    description: b.description ?? null,
  }))

  const totalCount = await Book.countDocuments({ createdBy: userId })
  const initialHasMore = initialBooks.length < totalCount

  return (
    <main className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between border-b border-[#2C1810]/10 px-4 sm:px-6 py-4">
        <h1 className="text-lg font-semibold text-[#2C1810]">For Love 10 Grams</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden sm:inline text-sm text-[#2C1810]/60">{session?.user?.email}</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-[#2C1810]/20 px-3 py-1.5 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
            >
              登出
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#2C1810]">我的記憶書</h2>
          <CreateBookButton />
        </div>

        <DashboardBooksClient
          initialBooks={initialBooks}
          initialHasMore={initialHasMore}
        />
      </div>
    </main>
  )
}
