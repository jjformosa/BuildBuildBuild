import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { BlockedPage } from '@/components/blocked-page'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import User from '@/lib/models/user'
import { canReadBook } from '@/lib/access'
import { signImageUrl } from '@/lib/sign-media'
import BookLike from '@/lib/models/book-like'
import BookReader from '@/lib/models/book-reader'
import BookMessage from '@/lib/models/book-message'
import { canEditBook } from '@/lib/access'
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
  const canAccess = await canReadBook(userId, book)
  if (!canAccess) {
    return <BlockedPage message="你沒有這本書的閱讀權限" />
  }

  const hasLiked = !!(await BookLike.exists({ bookId: book._id, userId }))
  const likeCount = await BookLike.countDocuments({ bookId: book._id })

  const isEditor = book.editorId?.toString() === userId

  let creatorName: string | null = null
  if (isEditor && book.editorLetter) {
    const creator = await User.findById(book.createdBy, 'name').lean<{ name: string }>()
    creatorName = creator?.name ?? null
  }

  const viewer = await User.findById(userId).lean()
  const viewerNickname = viewer?.nickname ?? null
  const viewerMyNickname = viewer?.myNickname ?? null

  // ── Reader-message composer props (only for readers, never managers) ──
  const isManagerViewer = canEditBook(userId, book, session.user.role ?? undefined)
  let canMessage = false
  let initialMessage: string | null = null
  let messageCreatorName = ''
  let messageEditorName: string | null = null

  if (!isManagerViewer) {
    canMessage = true
    const reader = await BookReader.findOne(
      { bookId: book._id, userId },
      'sharedBy'
    ).lean<{ sharedBy?: import('mongoose').Types.ObjectId }>()
    const sharedBy = reader?.sharedBy?.toString() ?? book.createdBy.toString() // fallback: creator
    const sharerIsEditor = book.editorId ? sharedBy === book.editorId.toString() : false

    const creator = await User.findById(book.createdBy, 'name nickname').lean<{ name?: string; nickname?: string | null }>()
    messageCreatorName = creator?.nickname ?? creator?.name ?? '作者'

    if (sharerIsEditor && book.editorId) {
      const ed = await User.findById(book.editorId, 'name nickname').lean<{ name?: string; nickname?: string | null }>()
      messageEditorName = ed?.nickname ?? ed?.name ?? null
    }

    const myMsg = await BookMessage.findOne({ bookId: book._id, fromUserId: userId }, 'body').lean<{ body: string }>()
    initialMessage = myMsg?.body ?? null
  }

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
    mediaUrls: p.type === 'video' ? p.mediaUrls : p.mediaUrls.map(signImageUrl),
    transcodingStatus: p.transcodingStatus ?? null,
    durationSec: p.durationSec ?? null,
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
      likeCount={likeCount}
      isEditor={isEditor}
      editorLetter={book.editorLetter ?? null}
      creatorName={creatorName}
      canMessage={canMessage}
      initialMessage={initialMessage}
      messageCreatorName={messageCreatorName}
      messageEditorName={messageEditorName}
    />
  )
}
