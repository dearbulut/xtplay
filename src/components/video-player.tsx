'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { VideoControls } from './video-controls';
import { Loader2 } from 'lucide-react';
import { VideoPlayerProps } from '@/types';

export function VideoPlayer({ src, poster, autoPlay = false, container = 'm3u8' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [hls, setHls] = useState<Hls | null>(null);
  const [currentQuality, setCurrentQuality] = useState<number>(0);
  const [qualities, setQualities] = useState<{ height: number; url: string }[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const video = videoRef.current;
    if (!video || !resolvedSrc) return;

    // Reset states
    setIsBuffering(true);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(null);

    let hlsInstance: Hls | null = null;

    const initializeVideo = () => {
      // Try direct playback first
      try {
        video.src = resolvedSrc;
        video.load();
        video.play().then(() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }).catch((error) => {
          console.log('Direct playback failed, trying HLS...', error);
          
          // If direct playback fails, try HLS
          if (Hls.isSupported()) {
            hlsInstance = new Hls({
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

            hlsInstance.loadSource(resolvedSrc);
            hlsInstance.attachMedia(video);

            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsBuffering(false);
              if (autoPlay) {
                video.play().catch(console.error);
              }
            });

            hlsInstance.on(Hls.Events.ERROR, (event, data) => {
              console.log('HLS Error:', event, data);
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('Network error:', data.details);
                    if (data.response) {
                      console.log('Response:', data.response);
                    }
                    hlsInstance?.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('Media error:', data.details);
                    hlsInstance?.recoverMediaError();
                    break;
                  default:
                    console.error('Fatal error:', data.type, data.details);
                    setError('Stream error. Please try again.');
                    if (hlsInstance) {
                      hlsInstance.destroy();
                    }
                    break;
                }
              }
            });

            setHls(hlsInstance);
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = resolvedSrc;
          } else {
            setError('Video playback not supported');
          }
        });
      } catch (error) {
        console.error('Video initialization error:', error);
        setError('Failed to initialize video player');
      }
    };

    initializeVideo();

    // Event listeners
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
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
    const handleVolumeChange = () => setVolume(video.volume);
    const handleError = () => {
      console.error('Video error:', video.error);
      setError('Video playback error');
      setIsBuffering(false);
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);

    if (autoPlay) {
      video.play().catch(console.error);
    }

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
        video.removeEventListener('volumechange', handleVolumeChange);
        video.removeEventListener('error', handleError);
      }
    };
  }, [resolvedSrc, autoPlay]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

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
      />
      {isBuffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
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
        qualities={qualities}
        currentQuality={currentQuality}
        isBuffering={isBuffering}
        onQualityChange={() => {}}
        onToggleFullscreen={handleFullscreen}
      />
    </div>
  );
}