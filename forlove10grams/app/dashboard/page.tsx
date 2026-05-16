import mongoose from 'mongoose'
import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import ReadProgress from '@/lib/models/read-progress'
import { CreateBookButton } from '@/components/create-book-button'
import { DashboardBooksClient, type DashboardBook } from '@/components/dashboard-books-client'
import { PencilIcon } from '@/components/icons/pencil'
import { CheckCircleIcon } from '@/components/icons/check-circle'
import { CircleIcon } from '@/components/icons/circle'

const INITIAL_LIMIT = 10

function toBook(b: { _id: mongoose.Types.ObjectId; title: string; description?: string }): DashboardBook {
  return { _id: b._id.toString(), title: b.title, description: b.description ?? null }
}

type SharedBookItem = {
  book: DashboardBook
  href: string
  badge: React.ReactNode
}

function SharedBookList({ items }: { items: SharedBookItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map(({ book, href, badge }) => (
        <li key={book._id}>
          <Link
            href={href}
            className="flex items-center justify-between rounded-xl border border-[#2C1810]/10 bg-white px-5 py-4 transition-all hover:border-[#2C1810]/25 hover:shadow-sm"
          >
            <div>
              <p className="font-medium text-[#2C1810]">{book.title}</p>
              {book.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-[#2C1810]/50">{book.description}</p>
              )}
            </div>
            <span className="ml-4 text-[#2C1810]/30">{badge}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!
  const isAdmin = session!.user!.role === 'admin'
  const uid = new mongoose.Types.ObjectId(userId)

  await dbConnect()

  const [ownerBooksRaw, editorBooksRaw, progressAgg] = await Promise.all([
    isAdmin
      ? Book.find({ createdBy: uid }).sort({ _id: -1 }).limit(INITIAL_LIMIT).lean()
      : [],
    Book.find({ editorId: uid }).sort({ _id: -1 }).lean(),
    ReadProgress.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { userId: uid } },
      { $group: { _id: '$bookId', count: { $sum: 1 } } },
    ]),
  ])

  const readCountMap = new Map<string, number>(
    progressAgg.map((r) => [r._id.toString(), r.count])
  )
  const progressBookIds = progressAgg.map((r) => r._id)

  const readerBooksRaw = progressBookIds.length
    ? await Book.find({
        _id: { $in: progressBookIds },
        createdBy: { $ne: uid },
        editorId: { $ne: uid },
      }).lean()
    : []

  const ownerBooks = ownerBooksRaw.map(toBook)

  const sharedItems: SharedBookItem[] = [
    ...editorBooksRaw.map((b) => ({
      book: toBook(b),
      href: `/books/${b._id.toString()}/edit`,
      badge: <PencilIcon />,
    })),
    ...readerBooksRaw.map((b) => {
      const readCount = readCountMap.get(b._id.toString()) ?? 0
      const isFullyRead = readCount >= b.pageOrder.length
      return {
        book: toBook(b),
        href: `/read/${b._id.toString()}`,
        badge: isFullyRead ? <CheckCircleIcon /> : <CircleIcon />,
      }
    }),
  ]

  const totalOwnerCount = isAdmin ? await Book.countDocuments({ createdBy: uid }) : 0
  const initialHasMore = ownerBooks.length < totalOwnerCount
  const hasAnyBook = isAdmin || sharedItems.length > 0

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

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10 space-y-10">

        {/* 我的記憶書（admin） */}
        {isAdmin && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#2C1810]">我的記憶書</h2>
              <CreateBookButton />
            </div>
            <DashboardBooksClient
              initialBooks={ownerBooks}
              initialHasMore={initialHasMore}
            />
          </section>
        )}

        {/* 分享給我的書（editor + reader，無標題） */}
        {sharedItems.length > 0 && (
          <section>
            {!isAdmin && (
              <h2 className="mb-6 text-xl sm:text-2xl font-semibold text-[#2C1810]">記憶書</h2>
            )}
            <SharedBookList items={sharedItems} />
          </section>
        )}

        {/* 完全沒有任何書 */}
        {!hasAnyBook && (
          <p className="py-20 text-center text-sm text-[#2C1810]/40">
            尚未有任何相關的記憶書。
          </p>
        )}

      </div>
    </main>
  )
}
