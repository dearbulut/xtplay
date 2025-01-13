import { NextResponse } from 'next/server';
import { createSession } from '@/lib/api/auth';

export async function POST(request: Request) {
  try {
    const { url, username } = await request.json();

    if (!url || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await createSession(url, username);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
