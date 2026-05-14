import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { InviteEditorButton } from '@/components/invite-editor-button'
import { AddPageButton } from '@/components/add-page-button'

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const session = await auth()
  const { bookId } = await params
  const userId = session!.user!.id!

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) notFound()

  const isOwner = book.createdBy.toString() === userId
  const isEditor = book.editorId?.toString() === userId
  if (!isOwner && !isEditor) redirect('/dashboard')

  const pageIds = book.pageOrder.map((id) => id.toString())
  const pages = await Page.find({ bookId: book._id })
  pages.sort((a, b) => pageIds.indexOf(a._id.toString()) - pageIds.indexOf(b._id.toString()))

  return (
    <main className="flex h-screen flex-col bg-[#FAF7F2]">
      <header className="flex flex-none items-center justify-between border-b border-[#2C1810]/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-[#2C1810]/50 transition-colors hover:text-[#2C1810]"
          >
            ← 返回
          </Link>
          <h1 className="text-lg font-semibold text-[#2C1810]">{book.title}</h1>
        </div>
        <InviteEditorButton bookId={bookId} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — page list */}
        <aside className="flex w-52 flex-none flex-col overflow-y-auto border-r border-[#2C1810]/10">
          <div className="flex-none border-b border-[#2C1810]/10 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-[#2C1810]/50">
              頁面 {pages.length > 0 && `(${pages.length})`}
            </span>
          </div>

          {pages.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-[#2C1810]/35">尚無頁面</p>
          ) : (
            <ul className="divide-y divide-[#2C1810]/5">
              {pages.map((page, i) => (
                <li
                  key={page._id.toString()}
                  className="cursor-pointer px-4 py-3 hover:bg-[#2C1810]/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#2C1810]/35">{i + 1}</span>
                    <span className="rounded bg-[#2C1810]/8 px-1.5 py-0.5 text-xs text-[#2C1810]/55">
                      {page.type === 'carousel' ? '輪播' : '影片'}
                    </span>
                  </div>
                  {page.content && (
                    <p className="mt-1 line-clamp-2 text-xs text-[#2C1810]/45">
                      {page.content}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto border-t border-[#2C1810]/10 p-3">
            <AddPageButton bookId={bookId} />
          </div>
        </aside>

        {/* Right — editor area */}
        <section className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#2C1810]/30">請選擇或新增頁面以開始編輯</p>
        </section>
      </div>
    </main>
  )
}
