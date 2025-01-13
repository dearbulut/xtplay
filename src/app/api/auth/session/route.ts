import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api/auth/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }
    return NextResponse.json(session);
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
