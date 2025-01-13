import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/api/auth/server';

export const runtime = 'edge';

export async function middleware(request: NextRequest) {
  const session = await getSession(request);

  if (!session && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/register')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|register|login).*)',
  ],
};