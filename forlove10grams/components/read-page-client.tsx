'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import remarkGfm from 'remark-gfm'
import { Toc, type TocPage } from '@/components/toc'
import { Carousel } from '@/components/carousel'
import { VideoPlayer } from '@/components/video-player'
import { useReadProgress } from '@/hooks/use-read-progress'

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => null,
})

export type ReadPageData = {
  _id: string
  type: 'carousel' | 'video'
  content: string
  mediaUrls: string[]
}

type Props = {
  bookId: string
  bookTitle: string
  pages: ReadPageData[]
}

export function ReadPageClient({ bookId, bookTitle, pages }: Props) {
  const pageIds = useMemo(() => pages.map((p) => p._id), [pages])
  const readPageIds = useReadProgress(bookId, pageIds)

  const tocPages: TocPage[] = pages.map((p, i) => ({
    _id: p._id,
    type: p.type,
    content: p.content,
    index: i,
  }))

  return (
    <div className="flex h-screen bg-[#FAF7F2]">
      <Toc pages={tocPages} readPageIds={readPageIds} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <header className="mb-12 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-[#2C1810]">
              {bookTitle}
            </h1>
          </header>

          <div className="space-y-20">
            {pages.map((page) => (
              <article key={page._id} id={page._id} className="scroll-mt-8">
                {page.mediaUrls.length > 0 &&
                  (page.type === 'carousel' ? (
                    <Carousel urls={page.mediaUrls} />
                  ) : (
                    <VideoPlayer url={page.mediaUrls[0]} />
                  ))}

                {page.content && (
                  <div className="mt-6 text-sm leading-relaxed text-[#2C1810]/80 [&_blockquote]:border-l-2 [&_blockquote]:border-[#2C1810]/20 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:mb-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-[#2C1810] [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-medium [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {page.content}
                    </ReactMarkdown>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
