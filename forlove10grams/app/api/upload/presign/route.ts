import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.S3_BUCKET_NAME!
const REGION = process.env.AWS_REGION!
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN

const PresignBody = z.object({
  bookId: z.string(),
  pageId: z.string().optional(),
  fileType: z.enum(['carousel', 'video', 'cover']),
  contentType: z.string(),
  index: z.number().int().min(0).optional(),
})

function extFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
  }
  return map[contentType] ?? contentType.split('/')[1] ?? 'bin'
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = PresignBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { bookId, pageId, fileType, contentType, index = 0 } = parsed.data

  await dbConnect()
  const book = await Book.findById(bookId)
  if (!book) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (book.createdBy.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ext = extFromContentType(contentType)
  let s3Key: string
  if (fileType === 'cover') {
    s3Key = `books/${bookId}/cover.${ext}`
  } else if (fileType === 'video') {
    s3Key = `books/${bookId}/pages/${pageId}/video.${ext}`
  } else {
    s3Key = `books/${bookId}/pages/${pageId}/carousel/image-${index}.${ext}`
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: contentType,
  })
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 })
  const s3Url = CLOUDFRONT_DOMAIN
    ? `https://${CLOUDFRONT_DOMAIN}/${s3Key}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`

  return Response.json({ presignedUrl, s3Key, s3Url })
}
