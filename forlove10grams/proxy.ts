import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextAuthRequest } from 'next-auth'

const PUBLIC_PREFIXES = ['/login', '/api/auth', '/share']

function isAdminPath(pathname: string) {
  return (
    pathname.startsWith('/dashboard') ||
    /^\/books\/[^/]+\/edit/.test(pathname)
  )
}

export default auth(function proxy(req: NextAuthRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isAdminPath(pathname) && req.auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)')],
}
