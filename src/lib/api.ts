"use client";

import { getActiveProfile } from "./client-profile";

function getIPTVCredentials() {
  const activeProfile = getActiveProfile();
  if (activeProfile) {
    return {
      baseUrl: activeProfile.iptvUrl,
      username: activeProfile.iptvUsername,
      password: activeProfile.iptvPassword
    };
  }

  // Fallback to environment variables
  return {
    baseUrl: process.env.NEXT_PUBLIC_IPTV_BASE_URL,
    username: process.env.NEXT_PUBLIC_IPTV_USERNAME,
    password: process.env.NEXT_PUBLIC_IPTV_PASSWORD
  };
}

export async function fetchFromApi(action: string, params: Record<string, string> = {}) {
  const { baseUrl, username, password } = getIPTVCredentials();

  if (!baseUrl || !username || !password) {
    throw new Error('Missing IPTV credentials');
  }

  const searchParams = new URLSearchParams({
    username,
    password,
    ...params,
  });

  // Construct the URL based on the action type
  let url;
  if (action === 'get_series_list') {
    url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series`;
  } else if (action === 'get_categories') {
    url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series_categories`;
  } else if (action === 'get_series_info') {
    url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series_info&series_id=${params.series_id}`;
  } else if (action === 'get_series_seasons') {
    url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series&series_id=${params.series_id}`;
  } else if (action === 'get_series_episodes') {
    url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series&series_id=${params.series_id}&season=${params.season_number}`;
  } else {
    url = `${baseUrl}/player_api.php?action=${action}&${searchParams.toString()}`;
  }

  console.log('API Request URL:', url);

  try {
    const response = await fetch(url);
    console.log('API Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response Data:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

export async function getStreamUrl(streamId: number, streamType: 'live' | 'movie' | 'series', container?: string) {
  const { baseUrl, username, password } = getIPTVCredentials();

  if (!baseUrl || !username || !password) {
    throw new Error('Missing IPTV credentials');
  }

  // Different URL formats for different stream types
  if (streamType === 'series') {
    return `${baseUrl}/series/${username}/${password}/${streamId}.${container || 'ts'}`;
  } else if (streamType === 'movie') {
    // Try both extensions for movies
    return container === 'mp4' 
      ? `${baseUrl}/movie/${username}/${password}/${streamId}.mp4`
      : `${baseUrl}/movie/${username}/${password}/${streamId}.m3u8`;
  } else if (streamType === 'live') {
    return `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
  }

  return `${baseUrl}/${streamType}/${username}/${password}/${streamId}`;
}

export async function verifyIPTVCredentials(url: string, username: string, password: string) {
  try {
    const searchParams = new URLSearchParams({
      username,
      password,
    });

    const response = await fetch(`${url}/player_api.php?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Invalid IPTV credentials');
    }
    
    const data = await response.json();
    if (!data || data.user_info?.auth === 0) {
      throw new Error('Invalid IPTV credentials');
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying IPTV credentials:', error);
    return false;
  }
}