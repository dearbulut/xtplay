import { cookies } from 'next/headers';
import { getActiveProfile } from '../client-profile';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

interface UserInfo {
  username: string;
  password: string;
  status: string;
  exp_date: string;
  auth: number;
  active_cons: number;
  max_connections: number;
  created_at: string;
}

interface ServerInfo {
  url: string;
  port: string;
  timezone: string;
}

interface AuthResponse {
  user_info: UserInfo;
  server_info: ServerInfo;
}

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('session')?.value;

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

export async function verifyCredentials(url: string, username: string, password: string): Promise<AuthResponse> {
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

export async function getIPTVCredentials() {
  const session = await getSession();
  if (!session) {
    throw new Error('No active session');
  }

  const activeProfile = getActiveProfile();
  if (activeProfile) {
    return {
      baseUrl: activeProfile.iptvUrl,
      username: activeProfile.iptvUsername,
      password: activeProfile.iptvPassword,
    };
  }

  // Fallback to cookies
  const cookieStore = cookies();
  const password = cookieStore.get('iptv_password')?.value;

  if (!session.url || !session.username || !password) {
    throw new Error('No IPTV credentials found');
  }

  return {
    baseUrl: session.url,
    username: session.username,
    password,
  };
}

export async function fetchFromAPI(action: string, params: Record<string, string> = {}, retryCount = 3): Promise<any> {
  const { baseUrl, username, password } = await getIPTVCredentials();

  try {
    const searchParams = new URLSearchParams({
      username,
      password,
      action,
      ...params,
    });

    const url = `${baseUrl}/player_api.php?${searchParams.toString()}`;
    console.log('Fetching from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data) {
      throw new Error('Empty response from API');
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    
    if (retryCount > 0) {
      console.log(`Retrying... (${retryCount} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchFromAPI(action, params, retryCount - 1);
    }
    
    throw error;
  }
}

export async function getStreamUrl(streamId: number, streamType: 'live' | 'movie' | 'series', extension = 'm3u8'): Promise<string> {
  const { baseUrl, username, password } = await getIPTVCredentials();
  return `${baseUrl}/${streamType}/${username}/${password}/${streamId}.${extension}`;
}

export async function getCategories(type: 'live' | 'movie' | 'series') {
  const action = type === 'live' ? 'get_live_categories' :
                type === 'movie' ? 'get_vod_categories' :
                'get_series_categories';
  
  return fetchFromAPI(action);
}

export async function getStreams(type: 'live' | 'movie' | 'series', categoryId?: string) {
  const action = type === 'live' ? 'get_live_streams' :
                type === 'movie' ? 'get_vod_streams' :
                'get_series';

  const params = categoryId ? { category_id: categoryId } : {};
  return fetchFromAPI(action, params);
}

export async function getStreamInfo(streamId: number, type: 'live' | 'movie' | 'series') {
  const action = type === 'live' ? 'get_live_streams' :
                type === 'movie' ? 'get_vod_info' :
                'get_series_info';

  const params = type === 'live' ? { stream_id: streamId.toString() } :
                type === 'movie' ? { vod_id: streamId.toString() } :
                { series_id: streamId.toString() };

  return fetchFromAPI(action, params);
}
