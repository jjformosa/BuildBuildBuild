import mongoose from 'mongoose'
import { auth, signOut } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book, { type ShareStatus } from '@/lib/models/book'
import ReadProgress from '@/lib/models/read-progress'
import { CreateBookButton } from '@/components/create-book-button'
import {
  DashboardShell,
  type DashboardBook,
  type ReaderBookItem,
} from '@/components/dashboard-books-client'
import { getLikeCountsByBook } from '@/lib/queries/book-like-counts'

const INITIAL_LIMIT = 10

type OwnerBookDoc = {
  _id: mongoose.Types.ObjectId
  title: string
  description?: string
  coverImage?: string
  shareStatus?: string
  tags?: string[]
  pageOrder: mongoose.Types.ObjectId[]
  editorId?: { name: string } | null
}

function toBook(b: OwnerBookDoc, likeCount = 0): DashboardBook {
  return {
    _id: b._id.toString(),
    title: b.title,
    description: b.description ?? null,
    coverImage: b.coverImage ?? null,
    shareStatus: (b.shareStatus as ShareStatus) ?? 'private',
    tags: b.tags ?? [],
    likeCount,
    editorName: b.editorId?.name ?? null,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!
  const isAdmin = session!.user!.role === 'admin'
  const uid = new mongoose.Types.ObjectId(userId)

  await dbConnect()

  const [ownerBooksRaw, editorBooksRaw, progressAgg] = await Promise.all([
    isAdmin
      ? Book.find({ createdBy: uid })
          .sort({ _id: -1 })
          .limit(INITIAL_LIMIT)
          .populate('editorId', 'name')
          .lean<OwnerBookDoc[]>()
      : [],
    Book.find({ editorId: uid }).sort({ _id: -1 }).lean<OwnerBookDoc[]>(),
    ReadProgress.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { userId: uid } },
      { $group: { _id: '$bookId', count: { $sum: 1 } } },
    ]),
  ])

  const ownerLikeCounts = isAdmin
    ? await getLikeCountsByBook(ownerBooksRaw.map((b) => b._id as mongoose.Types.ObjectId))
    : new Map<string, number>()

  const editorLikeCounts =
    editorBooksRaw.length > 0
      ? await getLikeCountsByBook(
          editorBooksRaw.map((b) => b._id as mongoose.Types.ObjectId),
        )
      : new Map<string, number>()

  const readCountMap = new Map<string, number>(
    progressAgg.map((r) => [r._id.toString(), r.count])
  )
  const progressBookIds = progressAgg.map((r) => r._id)

  const readerBooksRaw = progressBookIds.length
    ? await Book.find({
        _id: { $in: progressBookIds },
        createdBy: { $ne: uid },
        editorId: { $ne: uid },
      }).lean<OwnerBookDoc[]>()
    : []

  const ownerBooks = ownerBooksRaw.map((b) =>
    toBook(b, ownerLikeCounts.get(b._id.toString()) ?? 0)
  )

  const editorBooks: DashboardBook[] = editorBooksRaw.map((b) =>
    toBook(b, editorLikeCounts.get(b._id.toString()) ?? 0)
  )

  const readerBooks: ReaderBookItem[] = readerBooksRaw.map((b) => {
    const readCount = readCountMap.get(b._id.toString()) ?? 0
    const isFullyRead = readCount >= b.pageOrder.length
    return {
      _id: b._id.toString(),
      title: b.title,
      description: b.description ?? null,
      href: `/read/${b._id.toString()}`,
      isFullyRead,
    }
  })

  const totalOwnerCount = isAdmin ? await Book.countDocuments({ createdBy: uid }) : 0
  const ownerHasMore = ownerBooks.length < totalOwnerCount
  const hasAnyBook = isAdmin || editorBooks.length > 0 || readerBooks.length > 0

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
        {hasAnyBook ? (
          <DashboardShell
            isAdmin={isAdmin}
            ownerBooks={ownerBooks}
            ownerHasMore={ownerHasMore}
            editorBooks={editorBooks}
            readerBooks={readerBooks}
            createButton={<CreateBookButton />}
          />
        ) : (
          <p className="py-20 text-center text-sm text-[#2C1810]/40">
            尚未有任何相關的記憶書。
          </p>
        )}
      </div>
    </main>
  )
}
