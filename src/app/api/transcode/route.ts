import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getServerStreamUrl } from '@/lib/server-api';
import { PassThrough } from 'stream';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const streamId = searchParams.get('stream_id');
  const streamType = searchParams.get('stream_type') as 'live' | 'movie' | 'series';
  const format = searchParams.get('format') || 'mkv';

  if (!streamId || !streamType) {
    return NextResponse.json(
      { error: 'Stream ID and type are required' },
      { status: 400 }
    );
  }

  try {
    const streamUrl = await getServerStreamUrl(Number(streamId), streamType);
    console.log('Transcoding stream:', streamUrl);

    // Create a PassThrough stream for FFmpeg output
    const outputStream = new PassThrough();

    // FFmpeg command based on format
    const ffmpegArgs = [
      '-i', streamUrl,
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
    ];

    if (format === 'mkv') {
      // MKV specific settings
      ffmpegArgs.push(
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-f', 'matroska',
        'pipe:1'
      );
    } else {
      // Default HLS settings
      ffmpegArgs.push(
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '10',
        '-hls_flags', 'delete_segments',
        '-hls_segment_type', 'mpegts',
        'pipe:1'
      );
    }

    // Start FFmpeg process
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    // Handle FFmpeg process events
    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg:', data.toString());
    });

    ffmpeg.on('error', (err) => {
      console.error('FFmpeg error:', err);
      outputStream.end();
    });

    ffmpeg.on('exit', (code) => {
      console.log('FFmpeg process exited with code:', code);
      outputStream.end();
    });

    // Pipe FFmpeg output to our PassThrough stream
    ffmpeg.stdout.pipe(outputStream);

    // Set appropriate headers based on format
    const headers = new Headers();
    if (format === 'mkv') {
      headers.set('Content-Type', 'video/x-matroska');
    } else {
      headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    }
    headers.set('Cache-Control', 'no-cache');
    headers.set('Access-Control-Allow-Origin', '*');

    // Create a ReadableStream from the PassThrough stream
    const readable = new ReadableStream({
      start(controller) {
        outputStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        outputStream.on('end', () => {
          controller.close();
        });
        outputStream.on('error', (err) => {
          console.error('Stream error:', err);
          controller.error(err);
        });
      },
      cancel() {
        ffmpeg.kill();
        outputStream.destroy();
      }
    });

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