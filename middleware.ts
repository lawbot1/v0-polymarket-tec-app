import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(_request: NextRequest) {
  // Auth is handled client-side by Privy.
  // Middleware is kept for future needs (e.g., rate limiting, geo-routing).
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
