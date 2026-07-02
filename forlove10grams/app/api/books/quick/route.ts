import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import Page from '@/lib/models/page'
import {
  formatQuickCaptureTitle,
  isQuickCaptureMode,
  pageTypeForQuickCaptureMode,
} from '@/lib/quick-capture'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const mode = body && typeof body === 'object' ? (body as { mode?: unknown }).mode : null
  if (!isQuickCaptureMode(mode)) {
    return Response.json({ error: 'Invalid mode' }, { status: 400 })
  }

  await dbConnect()

  let createdBookId: string | null = null
  try {
    const book = await Book.create({
      title: formatQuickCaptureTitle(),
      createdBy: session.user.id,
    })
    createdBookId = book._id.toString()

    const page = await Page.create({
      bookId: book._id,
      type: pageTypeForQuickCaptureMode(mode),
      content: '',
      mediaUrls: [],
    })

    book.pageOrder.push(page._id)
    await book.save()

    return Response.json(
      {
        _id: createdBookId,
        pageId: page._id.toString(),
        mode,
        redirectTo: `/books/${createdBookId}/edit?quick=${mode}`,
      },
      { status: 201 },
    )
  } catch {
    if (createdBookId) {
      await Page.deleteMany({ bookId: createdBookId }).catch(() => undefined)
      await Book.deleteOne({ _id: createdBookId }).catch(() => undefined)
    }
    return Response.json({ error: '建立失敗，請再試一次' }, { status: 500 })
  }
}
