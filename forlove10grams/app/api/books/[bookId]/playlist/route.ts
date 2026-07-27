import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import { canEditBook } from '@/lib/access'
import { parseYouTubePlaylistId } from '@/lib/youtube-playlist'

const PatchPlaylistBody = z.object({
  url: z.string().nullable(),
})

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/playlist'>
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await ctx.params
  const body = await req.json()
  const parsed = PatchPlaylistBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (!canEditBook(session.user.id!, book, session.user.role ?? undefined)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { url } = parsed.data
  if (!url) {
    book.backgroundPlaylist = undefined
    await book.save()
    return Response.json({ backgroundPlaylist: null })
  }

  const playlistId = parseYouTubePlaylistId(url)
  if (!playlistId) {
    return Response.json({ error: '無法解析播放清單連結' }, { status: 400 })
  }

  book.backgroundPlaylist = { url, playlistId }
  await book.save()

  return Response.json({ backgroundPlaylist: book.backgroundPlaylist })
}
