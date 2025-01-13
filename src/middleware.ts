import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get stored credentials from localStorage
  const url = request.cookies.get('xtream_url')?.value;
  const username = request.cookies.get('xtream_username')?.value;
  const password = request.cookies.get('xtream_password')?.value;

  // If no credentials and not on login page, redirect to login
  if (!url && !username && !password && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
