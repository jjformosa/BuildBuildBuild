import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import User from '@/lib/models/user'

const Body = z.object({
  nickname: z.string().max(50),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  await dbConnect()
  const updated = await User.findByIdAndUpdate(session.user.id, { nickname: parsed.data.nickname })
  if (!updated) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  return Response.json({ ok: true })
}
