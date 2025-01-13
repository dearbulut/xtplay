import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key'
);

export async function verifyCredentials(url: string, username: string, password: string) {
  try {
    const baseUrl = url.endsWith('/') ? url : `${url}/`;
    const response = await fetch(`${baseUrl}player_api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();
    if (!data?.user_info?.auth) {
      throw new Error('Authentication failed');
    }

    return data;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    throw error;
  }
}

export async function getStreamUrl(streamId: number, streamType: 'live' | 'movie' | 'series', extension = 'm3u8'): Promise<string> {
  const response = await fetch('/api/auth/session');
  if (!response.ok) {
    throw new Error('No active session');
  }

  const session = await response.json();
  const { url: baseUrl, username } = session;

  // Get password from cookie
  const password = document.cookie
    .split('; ')
    .find(row => row.startsWith('iptv_password='))
    ?.split('=')[1];

  if (!baseUrl || !username || !password) {
    throw new Error('Missing credentials');
  }

  return `${baseUrl}/${streamType}/${username}/${password}/${streamId}.${extension}`;
}

export async function getCategories(type: 'live' | 'movie' | 'series') {
  const response = await fetch(`/api/iptv/categories?type=${type}`);
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  return response.json();
}

export async function getStreams(type: 'live' | 'movie' | 'series', categoryId?: string) {
  const url = `/api/iptv/streams?type=${type}${categoryId ? `&category_id=${categoryId}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch streams');
  }
  return response.json();
}

export async function getStreamInfo(streamId: number, type: 'live' | 'movie' | 'series') {
  const response = await fetch(`/api/iptv/info?type=${type}&stream_id=${streamId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stream info');
  }
  return response.json();
}
