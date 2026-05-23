import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import User from '@/lib/models/user'
import { canEditBook } from '@/lib/access'
import BookLike from '@/lib/models/book-like'
import { ReadPageClient, type ReadPageData } from '@/components/read-page-client'

export default async function ReadBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params
  const session = await auth()

  if (!session?.user?.id) redirect('/login')

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) notFound()

  const userId = session.user.id
  const canAccess =
    canEditBook(userId, book) ||
    book.shareStatus === 'shared' ||
    book.shareStatus === 'public'
  if (!canAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <p className="text-sm text-[#2C1810]/60">你沒有這本書的閱讀權限</p>
      </main>
    )
  }

  const hasLiked = !!(await BookLike.exists({ bookId: book._id, userId }))

  const isEditor = book.editorId?.toString() === userId

  let creatorName: string | null = null
  if (isEditor && book.editorLetter) {
    const creator = await User.findById(book.createdBy, 'name').lean<{ name: string }>()
    creatorName = creator?.name ?? null
  }

  const viewer = await User.findById(userId).lean()
  const viewerNickname = viewer?.nickname ?? null
  const viewerMyNickname = viewer?.myNickname ?? null

  const pageIds = book.pageOrder.map((id) => id.toString())
  const totalCount = pageIds.length
  const firstBatchIds = pageIds.slice(0, 5)
  const rawPages = firstBatchIds.length > 0
    ? await Page.find({ _id: { $in: firstBatchIds } }).lean()
    : []
  rawPages.sort(
    (a, b) => firstBatchIds.indexOf(a._id.toString()) - firstBatchIds.indexOf(b._id.toString())
  )

  const initialPages: ReadPageData[] = rawPages.map((p) => ({
    _id: p._id.toString(),
    type: p.type,
    content: p.content ?? '',
    mediaUrls: p.mediaUrls,
    transcodingStatus: p.transcodingStatus ?? null,
  }))

  return (
    <ReadPageClient
      bookId={bookId}
      bookTitle={book.title}
      initialPages={initialPages}
      totalCount={totalCount}
      viewerNickname={viewerNickname}
      viewerMyNickname={viewerMyNickname}
      hasLiked={hasLiked}
      isEditor={isEditor}
      editorLetter={book.editorLetter ?? null}
      creatorName={creatorName}
    />
  )
}
