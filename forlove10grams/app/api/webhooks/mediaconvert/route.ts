import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { dbConnect } from '@/lib/mongoose'
import Page from '@/lib/models/page'

const WEBHOOK_SECRET = process.env.MEDIACONVERT_WEBHOOK_SECRET

const Body = z.object({
  bookId: z.string(),
  pageId: z.string(),
  transcodingStatus: z.enum(['ready', 'error']),
  hlsUrl: z.string().nullable(),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!WEBHOOK_SECRET || auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { bookId, pageId, transcodingStatus, hlsUrl } = parsed.data

  await dbConnect()
  await Page.findOneAndUpdate(
    { _id: pageId, bookId },
    {
      transcodingStatus,
      ...(hlsUrl ? { mediaUrls: [hlsUrl] } : {}),
    }
  )

  return Response.json({ ok: true })
}
