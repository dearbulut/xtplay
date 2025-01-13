import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api/auth/server';

export const runtime = 'edge';

async function makeIPTVRequest(url: string, username: string, password: string, action: string, params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams({
    username,
    password,
    action,
    ...params,
  });

  const response = await fetch(`${url}/player_api.php?${searchParams.toString()}`, {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`IPTV API request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'live' | 'movie' | 'series';
    const action = searchParams.get('action');
    const categoryId = searchParams.get('category_id');
    const streamId = searchParams.get('stream_id');

    if (!type) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
    }

    // Get password from cookie
    const password = request.headers.get('cookie')
      ?.split('; ')
      .find(row => row.startsWith('iptv_password='))
      ?.split('=')[1];

    if (!password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 401 });
    }

    let apiAction: string;
    const params: Record<string, string> = {};

    if (action === 'categories') {
      apiAction = type === 'live' ? 'get_live_categories' :
                 type === 'movie' ? 'get_vod_categories' :
                 'get_series_categories';
    } else if (action === 'streams') {
      apiAction = type === 'live' ? 'get_live_streams' :
                 type === 'movie' ? 'get_vod_streams' :
                 'get_series';
      if (categoryId) {
        params.category_id = categoryId;
      }
    } else if (action === 'info') {
      if (!streamId) {
        return NextResponse.json({ error: 'Missing stream_id parameter' }, { status: 400 });
      }
      apiAction = type === 'live' ? 'get_live_streams' :
                 type === 'movie' ? 'get_vod_info' :
                 'get_series_info';
      params[type === 'live' ? 'stream_id' : type === 'movie' ? 'vod_id' : 'series_id'] = streamId;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const data = await makeIPTVRequest(session.url, session.username, password, apiAction, params);
    return NextResponse.json(data);
  } catch (error) {
    console.error('IPTV API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
