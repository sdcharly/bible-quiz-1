import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for auth API routes to let better-auth handle them
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }
  
  // Protect educator routes
  if (pathname.startsWith('/educator/') && !pathname.startsWith('/auth/')) {
    // This will be handled by client-side auth check
    return NextResponse.next()
  }
  
  // Protect student routes  
  if (pathname.startsWith('/student/') && !pathname.startsWith('/auth/')) {
    // This will be handled by client-side auth check
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/educator/:path*',
    '/student/:path*',
  ]
}