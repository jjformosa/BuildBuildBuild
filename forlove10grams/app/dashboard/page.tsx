import mongoose from 'mongoose'
import { auth, signOut } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book, { type ShareStatus } from '@/lib/models/book'
import ReadProgress from '@/lib/models/read-progress'
import '@/lib/models/user'
import Image from 'next/image'
import logo from '@/public/logo.png'
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
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 backdrop-blur-sm px-4 sm:px-8 py-3.5">
        <div className="flex items-center gap-3">
          <Image src={logo} alt="For Love 10 Grams" width={34} height={34} />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-tight">愛10克</p>
            <p className="text-[10px] text-muted-foreground leading-tight tracking-wide">親手烘焙 DIY Bakery</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-xs text-muted-foreground">{session?.user?.email}</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="btn-outline-sm"
            >
              登出
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-2xl sm:max-w-3xl lg:max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
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
          <div className="py-24 text-center">
            <p className="text-sm text-muted-foreground">尚未有任何相關的記憶書。</p>
          </div>
        )}
      </div>
    </main>
  )
}
