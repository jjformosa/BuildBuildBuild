import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import { CreateBookButton } from '@/components/create-book-button'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  await dbConnect()
  const books = await Book.find({ createdBy: userId }).sort({ createdAt: -1 })

  return (
    <main className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between border-b border-[#2C1810]/10 px-6 py-4">
        <h1 className="text-lg font-semibold text-[#2C1810]">For Love 10 Grams</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#2C1810]/60">{session?.user?.email}</span>
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

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#2C1810]">我的記憶書</h2>
          <CreateBookButton />
        </div>

        {books.length === 0 ? (
          <p className="py-20 text-center text-sm text-[#2C1810]/40">
            還沒有記憶書，點「+ 新增記憶書」開始建立。
          </p>
        ) : (
          <ul className="space-y-3">
            {books.map((book) => (
              <li key={book._id.toString()}>
                <Link
                  href={`/books/${book._id}/edit`}
                  className="flex items-center justify-between rounded-xl border border-[#2C1810]/10 bg-white px-5 py-4 transition-all hover:border-[#2C1810]/25 hover:shadow-sm"
                >
                  <div>
                    <p className="font-medium text-[#2C1810]">{book.title}</p>
                    {book.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-[#2C1810]/50">
                        {book.description}
                      </p>
                    )}
                  </div>
                  <span className="ml-4 text-xs text-[#2C1810]/30">編輯 →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
