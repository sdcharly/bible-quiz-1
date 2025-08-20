import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  
  // Handle auth callback redirects
  if (pathname.startsWith('/api/auth/callback')) {
    // Check if there's a redirect URL in the query params
    const redirectTo = searchParams.get('redirectTo') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
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
    '/api/auth/callback/:path*',
    '/educator/:path*',
    '/student/:path*',
  ]
}