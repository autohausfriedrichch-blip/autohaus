import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Auth is handled client-side by the admin page (Supabase JS SDK).
  // Server-side cookie detection is unreliable across Supabase versions and
  // mobile browsers (cookies may be chunked, named differently, or httpOnly).
  // We rely on the client-side redirect in /admin/page.tsx instead.
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
