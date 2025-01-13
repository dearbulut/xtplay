import axios from 'axios';

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export async function authenticate(url: string, username: string, password: string) {
  try {
    const baseUrl = url.endsWith('/') ? url : `${url}/`;
    const response = await axios.post(`${baseUrl}player_api.php`, {
      username,
      password
    });

    return response.data;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Invalid credentials');
  }
}

export async function getLiveCategories(credentials: XtreamCredentials) {
  try {
    const response = await axios.post(`${credentials.url}player_api.php`, {
      username: credentials.username,
      password: credentials.password,
      action: 'get_live_categories'
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get live categories:', error);
    return [];
  }
}

export async function getLiveStreams(credentials: XtreamCredentials, categoryId?: string) {
  try {
    const response = await axios.post(`${credentials.url}player_api.php`, {
      username: credentials.username,
      password: credentials.password,
      action: 'get_live_streams',
      category_id: categoryId
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get live streams:', error);
    return [];
  }
}

export function getLiveStreamUrl(credentials: XtreamCredentials, streamId: number) {
  return `${credentials.url}live/${credentials.username}/${credentials.password}/${streamId}.m3u8`;
}

// Helper function to get credentials from localStorage
export function getStoredCredentials(): XtreamCredentials | null {
  const url = localStorage.getItem('xtream_url');
  const username = localStorage.getItem('xtream_username');
  const password = localStorage.getItem('xtream_password');

  if (!url || !username || !password) {
    return null;
  }

  return { url, username, password };
}

// Helper function to store credentials in localStorage
export function storeCredentials(credentials: XtreamCredentials) {
  localStorage.setItem('xtream_url', credentials.url);
  localStorage.setItem('xtream_username', credentials.username);
  localStorage.setItem('xtream_password', credentials.password);
}
