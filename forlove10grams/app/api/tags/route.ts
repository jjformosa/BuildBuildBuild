import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dbConnect } from '@/lib/mongoose'
import Tag from '@/lib/models/tag'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json([], { status: 401 })
  }

  await dbConnect()

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  const query = q
    ? { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    : {}

  const tags = await Tag.find(query).limit(10).select('name -_id').lean()
  return Response.json(tags.map((t) => t.name))
}
