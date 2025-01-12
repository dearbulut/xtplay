'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  src: string | Promise<string>;
  poster?: string;
  autoPlay?: boolean;
  container?: 'm3u8' | 'ts' | 'mp4' | 'mkv';
}

export function VideoPlayer({ src, poster, autoPlay = false, container = 'm3u8' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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

    const video = videoRef.current;
    let hls: Hls | null = null;

    const initializeVideo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Always use direct playback first
        video.src = resolvedSrc;
        video.volume = 1;
        video.muted = false;

        const handleCanPlay = () => {
          console.log('Video can play directly');
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(console.error);
          }
        };

        const handleError = () => {
          console.error('Direct playback error:', video.error);
          // If direct playback fails and it's not MKV/MP4, try HLS
          if (container !== 'mkv' && container !== 'mp4' && Hls.isSupported()) {
            initializeHLS();
          } else {
            setError('Video playback error');
            setIsLoading(false);
          }
        };

        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);

        video.load();

        return () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
        };
      } catch (error) {
        console.error('Video initialization error:', error);
        setError('Failed to initialize video player');
      }
    };

    const initializeHLS = () => {
      if (!Hls.isSupported()) {
        console.error('HLS not supported');
        setError('HLS playback not supported');
        return;
      }

      console.log('Initializing HLS with source:', resolvedSrc);
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
        console.log('HLS manifest parsed');
        setIsLoading(false);
        video.volume = 1;
        video.muted = false;
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log('HLS error:', event, data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error:', data.details);
              if (data.details === 'manifestLoadError') {
                // If HLS fails, try direct playback again
                hls?.destroy();
                video.src = resolvedSrc;
                video.load();
              } else {
                hls?.startLoad();
              }
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
    };

    const cleanup = initializeVideo();

    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
      if (hls) {
        hls.destroy();
      }
      if (video) {
        video.pause();
        video.src = '';
        video.load();
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
        className="w-full aspect-video bg-black"
        poster={poster}
        playsInline
        controls
        controlsList="nodownload"
        preload="auto"
        muted={false}
      />
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}