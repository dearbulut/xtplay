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
        // Try direct playback first
        video.src = resolvedSrc;
        video.volume = 1;
        
        // Add event listeners
        const handleError = () => {
          console.error('Video error:', video.error);
          setError('Video playback error');
          setIsLoading(false);
        };

        const handleLoadedData = () => {
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(console.error);
          }
        };

        video.addEventListener('error', handleError);
        video.addEventListener('loadeddata', handleLoadedData);

        // Try to load the video
        await video.load();

        // If direct playback fails, try HLS
        if (video.error) {
          console.log('Direct playback failed, trying HLS...');
          
          if (Hls.isSupported()) {
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
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = resolvedSrc;
          } else {
            setError('Video playback not supported');
          }
        }

        return () => {
          video.removeEventListener('error', handleError);
          video.removeEventListener('loadeddata', handleLoadedData);
        };
      } catch (error) {
        console.error('Video initialization error:', error);
        setError('Failed to initialize video player');
      }
    };

    const cleanup = initializeVideo();

    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
      if (hls) {
        hls.destroy();
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
        crossOrigin="anonymous"
        playsInline
        controls
        controlsList="nodownload"
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