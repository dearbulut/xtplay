'use client';

import React, { useEffect, useRef, useState } from 'react';
import Plyr from 'plyr';
import Hls from 'hls.js';
import { Loader2 } from 'lucide-react';
import 'plyr/dist/plyr.css';

interface VideoPlayerProps {
  src: string | Promise<string>;
  poster?: string;
  autoPlay?: boolean;
  container?: 'm3u8' | 'ts' | 'mp4' | 'mkv';
}

export function VideoPlayer({ src, poster, autoPlay = false, container = 'm3u8' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const resolveSrc = async () => {
      try {
        const finalSrc = typeof src === 'string' ? src : await src;
        setResolvedSrc(finalSrc);
      } catch (error) {
        console.error('Failed to resolve stream URL:', error);
        setError('Could not retrieve stream URL');
      }
    };

    resolveSrc();
  }, [src]);

  useEffect(() => {
    if (!videoRef.current || !resolvedSrc) return;

    // Initialize Plyr
    const player = new Plyr(videoRef.current, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen',
      ],
      settings: ['captions', 'quality', 'speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: true },
      tooltips: { controls: true, seek: true },
      captions: { active: true, language: 'auto', update: true },
    });

    playerRef.current = player;

    // Handle different video formats
    const initializeVideo = () => {
      setIsLoading(true);
      setError(null);

      const video = videoRef.current!;
      let hls: Hls | null = null;

      const handleVideoError = (e: any) => {
        console.error('Video error:', e);
        setError('Video playback error');
        setIsLoading(false);
      };

      const handleLoadedData = () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(console.error);
        }
      };

      // Try HLS.js first for m3u8 files
      if (container === 'm3u8' && Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          xhrSetup: function(xhr) {
            xhr.withCredentials = false;
          },
          maxLoadingRetry: 4,
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 1000,
        });

        hls.loadSource(resolvedSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(console.error);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Network error:', data.details);
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Media error:', data.details);
                hls?.recoverMediaError();
                break;
              default:
                console.error('Fatal error:', data.type, data.details);
                setError('Stream error');
                if (hls) {
                  hls.destroy();
                }
                break;
            }
          }
        });
      } else {
        // Direct playback for other formats
        video.src = resolvedSrc;
        video.addEventListener('error', handleVideoError);
        video.addEventListener('loadeddata', handleLoadedData);
      }

      return () => {
        if (hls) {
          hls.destroy();
        }
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    };

    const cleanup = initializeVideo();

    return () => {
      cleanup();
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [resolvedSrc, container, autoPlay]);

  return (
    <div className="relative group">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
          <p>{error}</p>
        </div>
      ) : null}
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black plyr"
        poster={poster}
        crossOrigin="anonymous"
        playsInline
      >
        <source src={resolvedSrc || undefined} type={
          container === 'm3u8' ? 'application/x-mpegURL' :
          container === 'mp4' ? 'video/mp4' :
          container === 'mkv' ? 'video/x-matroska' :
          'video/mp4'
        } />
      </video>
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}