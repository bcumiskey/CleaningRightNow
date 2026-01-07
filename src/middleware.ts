import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Worker routes - allow workers and admins
    if (path.startsWith('/worker')) {
      return NextResponse.next()
    }

    // Admin routes - only allow admins
    if (token?.role !== 'admin') {
      // If worker trying to access admin routes, redirect to worker portal
      if (token?.role === 'worker') {
        return NextResponse.redirect(new URL('/worker', req.url))
      }
      // Otherwise redirect to login
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/',
    '/calendar/:path*',
    '/jobs/:path*',
    '/properties/:path*',
    '/team/:path*',
    '/linens/:path*',
    '/invoices/:path*',
    '/notes/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/worker/:path*',
  ],
}
