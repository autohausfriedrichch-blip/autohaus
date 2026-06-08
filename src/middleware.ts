import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // Check for Supabase auth token in cookies (any sb-*-auth-token format)
  const hasCookie = [...request.cookies.getAll()].some(
    c => c.name.includes('auth-token') || c.name.includes('access-token')
  )

  if (!hasCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
