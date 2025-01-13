'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/video-player';
import { getSeriesInfo, getStreamUrl } from '@/lib/xtream-parser';
import { Loader2 } from 'lucide-react';

interface Episode {
  id: string;
  title: string;
  episode_num: number;
  info: {
    movie_image?: string;
    duration_secs?: number;
    plot?: string;
  };
  container_extension: string;
}

interface Season {
  season_number: number;
  episodes: Episode[];
}

interface Series {
  seasons: Season[];
}

export default function SeriesPage() {
  const { id } = useParams();
  const [series, setSeries] = useState<Series | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSeries() {
      try {
        setLoading(true);
        // Get active profile from localStorage
        const activeProfile = localStorage.getItem('activeProfile');
        if (!activeProfile) {
          setError('No active IPTV profile');
          return;
        }

        const profile = JSON.parse(activeProfile);
        const data = await getSeriesInfo(id as string, profile);
        
        if (data) {
          setSeries(data);
          if (data.seasons.length > 0) {
            setSelectedSeason(data.seasons[0]);
            if (data.seasons[0].episodes.length > 0) {
              setSelectedEpisode(data.seasons[0].episodes[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch series:', error);
        setError('Failed to load series');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchSeries();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Player */}
      {selectedEpisode && (
        <div className="rounded-lg overflow-hidden">
          <VideoPlayer
            src={getStreamUrl(
              JSON.parse(localStorage.getItem('activeProfile') || '{}'),
              selectedEpisode.id,
              'series',
              selectedEpisode.container_extension
            )}
            poster={selectedEpisode.info.movie_image}
          />
        </div>
      )}

      {/* Season Selection */}
      <div className="flex space-x-2">
        {series?.seasons.map((season) => (
          <button
            key={season.season_number}
            onClick={() => setSelectedSeason(season)}
            className={`px-4 py-2 rounded-md ${
              selectedSeason?.season_number === season.season_number
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent hover:bg-accent/90'
            }`}
          >
            Season {season.season_number}
          </button>
        ))}
      </div>

      {/* Episode List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedSeason?.episodes.map((episode) => (
          <button
            key={episode.id}
            onClick={() => setSelectedEpisode(episode)}
            className={`p-4 rounded-lg ${
              selectedEpisode?.id === episode.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-accent'
            }`}
          >
            <div className="flex flex-col space-y-2">
              <h3 className="font-semibold">{episode.title}</h3>
              {episode.info.duration_secs && (
                <p className="text-sm opacity-70">
                  Duration: {Math.floor(episode.info.duration_secs / 60)} minutes
                </p>
              )}
              {episode.info.plot && (
                <p className="text-sm opacity-70 line-clamp-2">{episode.info.plot}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
