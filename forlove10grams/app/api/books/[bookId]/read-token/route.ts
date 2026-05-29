import type { NextRequest } from 'next/server'
import { getSignedCookies } from '@aws-sdk/cloudfront-signer'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import { canReadBook } from '@/lib/access'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/books/[bookId]/read-token'>
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId } = await ctx.params

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })

  const canAccess = await canReadBook(session.user.id, book)
  if (!canAccess) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const mediaUrl = process.env.CLOUDFRONT_MEDIA_URL!
  const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY!.replace(/\\n/g, '\n')
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID!
  const cookieDomain = process.env.CLOUDFRONT_COOKIE_DOMAIN!

  const expiresAt = Math.floor(Date.now() / 1000) + 4 * 60 * 60
  const policy = JSON.stringify({
    Statement: [{
      Resource: `${mediaUrl}/books/${bookId}/*`,
      Condition: { DateLessThan: { 'AWS:EpochTime': expiresAt } },
    }],
  })

  const signed = await getSignedCookies({ keyPairId, privateKey, policy })

  const opts = `; HttpOnly; Secure; SameSite=None; Path=/; Domain=${cookieDomain}`
  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', `CloudFront-Policy=${signed['CloudFront-Policy']}${opts}`)
  headers.append('Set-Cookie', `CloudFront-Signature=${signed['CloudFront-Signature']}${opts}`)
  headers.append('Set-Cookie', `CloudFront-Key-Pair-Id=${signed['CloudFront-Key-Pair-Id']}${opts}`)

  return new Response(JSON.stringify({ ok: true }), { headers })
}
