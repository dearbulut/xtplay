import axios from 'axios';

interface IPTVCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

export async function loadGroup(mode: 'live' | 'movie' | 'series', credentials: IPTVCredentials) {
  const action = mode === 'live' ? 'get_live_categories' :
                mode === 'movie' ? 'get_vod_categories' :
                'get_series_categories';

  return await makeRequest(action, credentials);
}

export async function loadPlaylist(mode: 'live' | 'movie' | 'series', group: string, credentials: IPTVCredentials) {
  const action = mode === 'live' ? 'get_live_streams' :
                mode === 'movie' ? 'get_vod_streams' :
                'get_series';

  return await makeRequest(action, credentials, {
    category_id: isNaN(parseInt(group)) ? "*" : group
  });
}

export async function loadSeriesInfo(seriesId: string, credentials: IPTVCredentials) {
  return await makeRequest('get_series_info', credentials, {
    series_id: seriesId
  });
}

async function makeRequest(action: string, credentials: IPTVCredentials, params: Record<string, string> = {}) {
  const { baseUrl, username, password } = credentials;
  const url = `${baseUrl}/player_api.php`;

  try {
    const response = await axios.post(url, {
      username,
      password,
      action,
      ...params
    });

    return response.data;
  } catch (error) {
    console.error('IPTV API error:', error);
    return null;
  }
}

export function getStreamUrl(streamId: string, type: 'live' | 'movie' | 'series', credentials: IPTVCredentials, extension = 'm3u8') {
  const { baseUrl, username, password } = credentials;
  return `${baseUrl}/${type}/${username}/${password}/${streamId}.${extension}`;
}
