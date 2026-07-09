import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import { canEditBook } from '@/lib/access'
import { signImageUrl } from '@/lib/sign-media'
import { transcribeAudio } from '@/lib/transcribe'

// Whole trip (S3 read → Whisper → OpenCC → DB write) runs in one function.
// 10-min recording cap keeps this comfortably under the Hobby-plan ceiling.
export const maxDuration = 300

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string; pageId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId, pageId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!canEditBook(session.user.id!, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const page = await Page.findOne({ _id: pageId, bookId: book._id })
  if (!page) return Response.json({ error: 'Page not found' }, { status: 404 })
  if (page.type !== 'audio' || !page.mediaUrls[0]) {
    return Response.json({ error: 'Page has no audio to transcribe' }, { status: 400 })
  }

  page.transcriptionStatus = 'pending'
  await page.save()

  try {
    // Re-sign from the stored URL so the fetch always uses a fresh, valid Signed URL.
    const audioUrl = signImageUrl(page.mediaUrls[0])
    const transcript = await transcribeAudio(audioUrl)

    const existing = (page.content ?? '').trim()
    const merged = existing ? `${existing}\n\n${transcript}` : transcript

    page.content = merged
    page.transcriptionStatus = 'done'
    await page.save()

    return Response.json({ content: merged, transcriptionStatus: 'done' })
  } catch (err) {
    console.error('transcribe failed:', err)
    page.transcriptionStatus = 'error'
    await page.save()
    return Response.json({ error: '轉錄失敗，請重試' }, { status: 502 })
  }
}
