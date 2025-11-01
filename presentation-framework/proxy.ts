import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // If user is authenticated and trying to access sign-in page, redirect to account
  if (session && pathname === '/auth/signin') {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  // If user is not authenticated and trying to access protected routes, redirect to sign-in
  if (!session && pathname.startsWith('/account')) {
    return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
};

