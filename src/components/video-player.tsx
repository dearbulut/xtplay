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
        // Always try HLS first
        if (Hls.isSupported()) {
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
            console.log('HLS manifest parsed, attempting playback');
            setIsLoading(false);
            video.play().catch(error => {
              console.error('HLS playback failed:', error);
              fallbackToDirectPlayback();
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.log('HLS error:', event, data);
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
                  fallbackToDirectPlayback();
                  break;
              }
            }
          });
        } else {
          fallbackToDirectPlayback();
        }
      } catch (error) {
        console.error('Video initialization error:', error);
        fallbackToDirectPlayback();
      }
    };

    const fallbackToDirectPlayback = () => {
      console.log('Falling back to direct playback');
      if (hls) {
        hls.destroy();
        hls = null;
      }

      video.src = resolvedSrc;
      video.load();
      
      const handleCanPlay = () => {
        console.log('Video can play, starting playback');
        setIsLoading(false);
        video.play().catch(console.error);
      };

      const handleError = () => {
        console.error('Direct playback error:', video.error);
        setError('Video playback error');
        setIsLoading(false);
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
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