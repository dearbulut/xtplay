'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { VideoControls } from './video-controls';
import { Loader2 } from 'lucide-react';
import { VideoPlayerProps } from '@/types';
import styled from 'styled-components';

const PlayerContainer = styled.div`
  width: 100%;
  background: #0000003d;
  padding: 0.7rem;
  border-radius: 0.4rem;
  height: 40vh;
  position: relative;
  overflow: hidden;
  user-select: none;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
`;

const ErrorOverlay = styled(LoadingOverlay)`
  flex-direction: column;
  gap: 1rem;
`;

const RetryButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background: var(--primary);
  color: white;
  border: none;
  cursor: pointer;
  
  &:hover {
    background: var(--primary-dark);
  }
`;

export function VideoPlayer({ src, poster, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [hls, setHls] = useState<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;

  useEffect(() => {
    const resolveSrc = async () => {
      try {
        const finalSrc = typeof src === 'string' ? src : await src;
        console.log('Source URL:', finalSrc);
        setResolvedSrc(finalSrc);
      } catch (error) {
        console.error('Failed to resolve stream URL:', error);
        setError('Could not retrieve stream URL');
      }
    };

    resolveSrc();
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedSrc) return;

    // Reset states
    setIsBuffering(true);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(null);
    setRetryCount(0);

    let hlsInstance: Hls | null = null;

    const initializeVideo = () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = resolvedSrc;
      } else if (Hls.isSupported()) {
        // Create new HLS instance
        hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 60,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.2,
          nudgeMaxRetry: 6,
          xhrSetup: function(xhr, url) {
            xhr.withCredentials = false;
          }
        });

        hlsInstance.loadSource(resolvedSrc);
        hlsInstance.attachMedia(video);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          if (autoPlay) {
            video.play().catch(console.error);
          }
        });

        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Network error:', data);
                handleError('Network error. Retrying...');
                hlsInstance?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Media error:', data);
                hlsInstance?.recoverMediaError();
                break;
              default:
                handleError('Fatal error. Please try again.');
                break;
            }
          }
        });

        setHls(hlsInstance);
      }
    };

    const handleError = (message: string) => {
      setError(message);
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(initializeVideo, 2000);
      }
    };

    initializeVideo();

    // Event listeners
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setError(null);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime > 0 && !video.paused) {
        setIsBuffering(false);
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      if (video) {
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
      }
    };
  }, [resolvedSrc, autoPlay, retryCount]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    if (hls) {
      hls.loadSource(resolvedSrc!);
      hls.startLoad();
    } else if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <PlayerContainer>
      <video
        ref={videoRef}
        className="w-full h-full bg-black"
        poster={poster}
        playsInline
      />
      
      {isBuffering && !error && (
        <LoadingOverlay>
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </LoadingOverlay>
      )}

      {error && (
        <ErrorOverlay>
          <p className="text-white text-center">{error}</p>
          <RetryButton onClick={handleRetry}>
            Retry
          </RetryButton>
        </ErrorOverlay>
      )}

      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isFullscreen={isFullscreen}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleFullscreen={handleFullscreen}
      />
    </PlayerContainer>
  );
}
