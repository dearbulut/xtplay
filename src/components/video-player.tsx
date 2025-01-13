'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { VideoControls } from './video-controls';
import { Loader2 } from 'lucide-react';
import { VideoPlayerProps } from '@/types';



export function VideoPlayer({ src, poster, autoPlay = false, isDirectMp4 = false }: VideoPlayerProps) {
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
  const [retryCount, setRetryCount] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [manifestRetryCount, setManifestRetryCount] = useState(0);
  const MAX_MANIFEST_RETRIES = 5;
  const maxRetries = 5;

  const retryWithCountdown = useCallback(() => {
    if (retryCount >= maxRetries) {
      setError('Connection failed after multiple attempts');
      return;
    }

    setRetryCount((prev) => prev + 1);
    setRetryCountdown(10);

    const countdown = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          // Retry loading the stream
          if (hls && resolvedSrc) {
            hls.loadSource(resolvedSrc);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [hls, retryCount, resolvedSrc]);

  useEffect(() => {
    const resolveSrc = async () => {
      try {
        const finalSrc = typeof src === 'string' ? src : await src;
        console.log('Original source:', finalSrc);
        
        // Check if it's an MKV file or needs transcoding
        if (finalSrc.toLowerCase().endsWith('.mkv') || finalSrc.toLowerCase().endsWith('.avi')) {
          // Extract stream ID and type from the URL
          const match = finalSrc.match(/\/(live|movie|series)\/.*?\/(\d+)\.(mkv|avi|mp4)/);
          if (match) {
            const [, streamType, streamId] = match;
            const transcodedUrl = `/api/transcode?stream_id=${streamId}&stream_type=${streamType}&format=mkv`;
            console.log('Using transcoded URL:', transcodedUrl);
            setResolvedSrc(transcodedUrl);
          } else {
            console.log('No match found for transcoding, using original URL');
            setResolvedSrc(finalSrc);
          }
        } else {
          console.log('Using original URL');
          setResolvedSrc(finalSrc);
        }
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
    setRetryCountdown(0);
    setManifestRetryCount(0);

    let hlsInstance: Hls | null = null;

    if (isDirectMp4) {
      // Direct MP4 playback
      video.src = resolvedSrc;
      setHls(null);
      // Set up basic error handling for MP4
      video.onerror = () => {
        setError('Failed to load video');
        setIsBuffering(false);
      };
      
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = resolvedSrc;
    } else if (Hls.isSupported()) {
      // Create new HLS instance
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 60,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 6,
        manifestLoadingMaxRetry: MAX_MANIFEST_RETRIES,
        manifestLoadingRetryDelay: 1000, // 1 second delay between retries
        levelLoadingTimeOut: 10000, // 10 seconds
        fragLoadingTimeOut: 20000, // 20 seconds
        xhrSetup: function(xhr, url) {
          //console.log('Loading URL:', url);
          // Increase timeout for slow streams
          xhr.timeout = 20000; // 20 seconds timeout
          
          // Don't set credentials mode since server uses wildcard CORS
          xhr.withCredentials = false;
          
          xhr.addEventListener('error', function(e: ProgressEvent<XMLHttpRequestEventTarget>) {
            console.error('XHR Error:', e);
          });

          xhr.addEventListener('loadend', function() {
            //console.log('XHR Status:', xhr.status, 'URL:', url);
            if (xhr.status === 403) {
              setError('Stream is busy');
              retryWithCountdown();
            } else if (xhr.status === 302) {
              // Handle redirect
              const location = xhr.getResponseHeader('Location');
              if (location) {
                console.log('Following redirect to:', location);
                hlsInstance?.loadSource(location);
              }
            }
          });
        },
        // Add more configuration for better stream handling
        manifestLoadingTimeOut: 20000, // 20 seconds timeout for manifest loading
        levelLoadingTimeOut: 20000, // 20 seconds timeout for level loading
        fragLoadingTimeOut: 20000, // 20 seconds timeout for fragment loading
      });

      console.log('Initializing HLS stream...');
      hlsInstance.loadSource(resolvedSrc);
      hlsInstance.attachMedia(video);

      // Add loading state handler
      hlsInstance.on(Hls.Events.MANIFEST_LOADING, () => {
        console.log('Loading manifest...');
        setManifestRetryCount(prev => prev + 1);
        setIsBuffering(true);
        setError(null);
      });

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        // console.log('Stream manifest parsed successfully', {
        //   levels: data.levels,
        //   firstLevel: data.firstLevel,
        //   stats: data.stats
        // });
        // const availableQualities = data.levels.map((level) => ({

        setError(null);
        setIsBuffering(false);
        
        if (autoPlay) {
          console.log('Attempting autoplay...');
          videoRef.current?.play().catch(err => {
            console.warn('Autoplay failed:', err);
          });
        }
      });

      // Enhanced error handling
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        console.log('HLS error:', data.type, data.details);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error:', data.details);
              if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
                if (manifestRetryCount < MAX_MANIFEST_RETRIES) {
                  console.log(`Retrying manifest load... Attempt ${manifestRetryCount + 1}/${MAX_MANIFEST_RETRIES}`);
                  setManifestRetryCount(prev => prev + 1);
                  // setTimeout(() => {
                  //   hlsInstance?.loadSource(src);
                  // }, 2000);
                } else {
                  console.error('Max manifest retries reached');
                  setError('Failed to load stream after maximum retries');
                  destroyHls(hlsInstance);
                }
              } else {
                hlsInstance?.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error:', data.details);
              hlsInstance?.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data.type, data.details);
              destroyHls(hlsInstance);
              setError('Stream error. Please try again later.');
              break;
          }
        } else {
          // Non-fatal error handling
          console.warn('Non-fatal HLS error:', data.details);
          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            setIsBuffering(true);
          }
        }
      });

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS network error', data);
              hlsInstance?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS media error');
              hlsInstance?.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data.type);
              destroyHls(hlsInstance);
              break;
          }
        }
      });

      setHls(hlsInstance);
    }

    // Event listeners
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime > 0 && !video.paused) {
        setIsBuffering(false);
      }
    };
    const handleDurationChange = () => {
      setDuration(video.duration);
      if(isDirectMp4) {
        setIsBuffering(false);
      }
    };
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

    if (autoPlay) {
      video.play().catch(() => {
        setIsPlaying(false);
      });
    }

    // Cleanup function
    return () => {
      if (hlsInstance && !isDirectMp4) {
        hlsInstance.destroy();
      }
      if (video) {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('volumechange', handleVolumeChange);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('ended', handleEnded);
      }
    };
  }, [resolvedSrc, isDirectMp4]);

  // Helper function to properly destroy HLS instance
  const destroyHls = (hlsInstance: Hls | null) => {
    if (hlsInstance) {
      try {
        hlsInstance.stopLoad();
        hlsInstance.detachMedia();
        hlsInstance.destroy();
        setHls(null);
      } catch (error) {
        console.error('Error destroying HLS instance:', error);
      }
    }
  };

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

  const handleVolumeChange = (event?: Event | number) => {
    if (!videoRef.current) return;
    
    const volume = typeof event === 'number' 
      ? event 
      : videoRef.current.volume;
    
    videoRef.current.volume = volume;
    setVolume(volume);
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

  const handleQualityChange = (index: number) => {
    if (!hls) return;
    try {
      hls.currentLevel = index;
      setCurrentQuality(index);
    } catch (error) {
      console.error('Error changing quality level:', error);
    }
  };

  return (
    <div className="relative group">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
          <div className="text-center space-y-2">
            <p>{error}</p>
            {retryCountdown > 0 && (
              <p>Retrying in {retryCountdown} seconds... (Attempt {retryCount}/{maxRetries})</p>
            )}
          </div>
        </div>
      ) : null}
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black"
        poster={poster}
        playsInline
      />
      {isBuffering && (
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
        onQualityChange={handleQualityChange}
        onToggleFullscreen={handleFullscreen}
      />
    </div>
  );
}