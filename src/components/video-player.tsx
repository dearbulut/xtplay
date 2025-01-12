'use client';

import React, { useEffect, useRef, useState } from 'react';
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

    const initializeVideo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Set up video properties
        video.src = resolvedSrc;
        video.volume = 1;
        video.muted = false;
        video.controls = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';

        // Event handlers
        const handleCanPlay = () => {
          console.log('Video can play');
          setIsLoading(false);
          video.volume = 1;
          video.muted = false;
          if (autoPlay) {
            video.play().catch(console.error);
          }
        };

        const handleError = () => {
          console.error('Video error:', video.error);
          setError('Video playback error');
          setIsLoading(false);
        };

        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded');
          video.volume = 1;
          video.muted = false;
        };

        // Add event listeners
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        // Load the video
        video.load();

        // Return cleanup function
        return () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
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
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
    };
  }, [resolvedSrc, autoPlay]);

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