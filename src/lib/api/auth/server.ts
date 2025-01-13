import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export async function getSession(request?: Request) {
  let token: string | undefined;

  if (request) {
    // For middleware (edge runtime)
    token = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('session='))?.split('=')[1];
  } else {
    // For server components
    token = cookies().get('session')?.value;
  }

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { username: string; url: string };
  } catch (err) {
    return null;
  }
}

export async function createSession(url: string, username: string) {
  const token = await new SignJWT({ username, url })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(JWT_SECRET);

  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return token;
}
