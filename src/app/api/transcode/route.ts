import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getServerStreamUrl } from '@/lib/server-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const streamId = searchParams.get('stream_id');
  const streamType = searchParams.get('stream_type') as 'live' | 'movie' | 'series';

  if (!streamId || !streamType) {
    return NextResponse.json(
      { error: 'Stream ID and type are required' },
      { status: 400 }
    );
  }

  try {
    const streamUrl = await getServerStreamUrl(Number(streamId), streamType);
    
    // Start FFmpeg process
    const ffmpeg = spawn('ffmpeg', [
      '-i', streamUrl,
      '-c:v', 'copy',        // Copy video stream without re-encoding
      '-c:a', 'aac',         // Convert audio to AAC
      '-b:a', '192k',        // Audio bitrate
      '-f', 'hls',           // HLS output format
      '-hls_time', '2',      // Segment duration
      '-hls_list_size', '10', // Number of segments in playlist
      '-hls_flags', 'delete_segments', // Delete old segments
      '-hls_segment_type', 'mpegts',   // Use MPEGTS segments
      '-method', 'PUT',      // Use PUT for segment upload
      'pipe:1'              // Output to stdout
    ]);

    // Set response headers for HLS stream
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Access-Control-Allow-Origin', '*');

    // Create a TransformStream to pipe FFmpeg output
    const { readable, writable } = new TransformStream();
    ffmpeg.stdout.pipe(writable);

    return new NextResponse(readable, {
      headers,
      status: 200,
    });

  } catch (error) {
    console.error('Error transcoding stream:', error);
    return NextResponse.json(
      { error: 'Failed to transcode stream' },
      { status: 500 }
    );
  }
}