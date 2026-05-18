import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextAuthRequest } from 'next-auth'

const PUBLIC_PREFIXES = ['/login', '/api/auth', '/share', '/hajimede', '/privacy', 'api/webhooks']

export default auth(function proxy(req: NextAuthRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!req.auth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.nextUrl)
    loginUrl.searchParams.set('callbackUrl', pathname + req.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // 不用這段程式碼，nickname的檢查只需要在login callback發生時才檢查，避免打擾不想設定nickname的使用者
  // if (!req.auth.user?.nicknameIsSet && !pathname.startsWith('/api/')) {
  //   const hajimedeUrl = new URL('/hajimede', req.nextUrl)
  //   hajimedeUrl.searchParams.set('callbackUrl', pathname + req.nextUrl.search)
  //   return NextResponse.redirect(hajimedeUrl)
  // }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
