// app/api/books/[bookId]/invite-link/route.ts
import type { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Book from '@/lib/models/book'
import BookInvite from '@/lib/models/book-invite'
import { isManager } from '@/lib/access'

type Ctx = { params: Promise<{ bookId: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invite = await BookInvite.findOne({ bookId })
  if (!invite) return Response.json({ active: false, invite: null })

  const now = new Date()
  const isActive = invite.revokedAt == null && invite.expiresAt > now

  return Response.json({
    active: isActive,
    invite: {
      token: invite.token,
      expiresAt: invite.expiresAt,
      revokedAt: invite.revokedAt ?? null,
    },
  })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = nanoid(12)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await BookInvite.findOneAndUpdate(
    { bookId },
    {
      $set: {
        token,
        expiresAt,
        createdBy: session.user.id,
      },
      $unset: { revokedAt: '' },
    },
    { upsert: true, new: true }
  )

  const origin = new URL(req.url).origin

  return Response.json({
    token: invite.token,
    expiresAt: invite.expiresAt,
    inviteUrl: `${origin}/invite/${invite.token}`,
  })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await params
  await dbConnect()

  const book = await Book.findById(bookId)
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isManager(session.user.id, book)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invite = await BookInvite.findOne({ bookId })
  if (!invite) return Response.json({ error: 'Not found' }, { status: 404 })

  invite.revokedAt = new Date()
  await invite.save()

  return Response.json({ ok: true })
}
