import { getActiveProfile } from './client-profile';

interface IPTVCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

export function getIPTVCredentials(): IPTVCredentials {
  const activeProfile = getActiveProfile();
  if (activeProfile) {
    return {
      baseUrl: activeProfile.iptvUrl,
      username: activeProfile.iptvUsername,
      password: activeProfile.iptvPassword
    };
  }

  return {
    baseUrl: process.env.NEXT_PUBLIC_IPTV_BASE_URL || '',
    username: process.env.NEXT_PUBLIC_IPTV_USERNAME || '',
    password: process.env.NEXT_PUBLIC_IPTV_PASSWORD || ''
  };
}

export async function verifyCredentials(url: string, username: string, password: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({ username, password });
    const response = await fetch(`${url}/player_api.php?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();
    if (!data?.user_info?.auth) {
      throw new Error('Authentication failed');
    }

    return true;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return false;
  }
}

export async function fetchFromAPI(action: string, params: Record<string, string> = {}, retryCount = 3): Promise<any> {
  const { baseUrl, username, password } = getIPTVCredentials();

  if (!baseUrl || !username || !password) {
    throw new Error('Missing IPTV credentials');
  }

  try {
    const searchParams = new URLSearchParams({
      username,
      password,
      ...params,
    });

    const url = `${baseUrl}/player_api.php?action=${action}&${searchParams.toString()}`;
    console.log('Fetching from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
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
  const { baseUrl, username, password } = getIPTVCredentials();

  if (!baseUrl || !username || !password) {
    throw new Error('Missing IPTV credentials');
  }

  return `${baseUrl}/${streamType}/${username}/${password}/${streamId}.${extension}`;
}

export async function getStreamInfo(streamId: number, streamType: 'live' | 'movie' | 'series'): Promise<any> {
  const action = streamType === 'live' ? 'get_live_streams' :
                 streamType === 'movie' ? 'get_vod_info' :
                 'get_series_info';

  const params = streamType === 'live' ? { stream_id: streamId.toString() } :
                 streamType === 'movie' ? { vod_id: streamId.toString() } :
                 { series_id: streamId.toString() };

  return fetchFromAPI(action, params);
}