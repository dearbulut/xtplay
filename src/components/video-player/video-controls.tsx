import React from 'react';
import styled from 'styled-components';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isFullscreen: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleFullscreen: () => void;
}

const ControlsContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  opacity: 0;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
`;

const Button = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Slider = styled.input`
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  padding: 0;
  margin: 0;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  &::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  &:hover::-webkit-slider-thumb {
    transform: scale(1.2);
  }
`;

const VolumeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Time = styled.span`
  color: white;
  font-size: 0.875rem;
  min-width: 5ch;
  text-align: center;
`;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isFullscreen,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleFullscreen,
}: VideoControlsProps) {
  return (
    <ControlsContainer>
      <Button onClick={onPlayPause}>
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </Button>

      <Time>{formatTime(currentTime)}</Time>

      <Slider
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
      />

      <Time>{formatTime(duration)}</Time>

      <VolumeContainer>
        <Button onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}>
          {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </Button>
        <Slider
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          style={{ width: '100px' }}
        />
      </VolumeContainer>

      <Button onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </Button>
    </ControlsContainer>
  );
}
