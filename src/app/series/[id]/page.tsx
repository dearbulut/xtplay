'use client';

import { useEffect, useState } from 'react';
import { fetchFromAPI, getStreamUrl } from '@/lib/auth';
import { VideoPlayer } from '@/components/video-player';
import { Film } from 'lucide-react';
import Image from 'next/image';

interface SeriesDetailsProps {
  params: {
    id: string;
  };
}

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
  name: string;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  rating?: string;
  seasons: Season[];
}

export default function SeriesDetails({ params }: SeriesDetailsProps) {
  const [series, setSeries] = useState<Series | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching series info for ID:', params.id);
        const seriesData = await fetchFromAPI('get_series_info', { series_id: params.id });
        console.log('Series data received:', seriesData);
        
        if (!seriesData) {
          throw new Error('No series data received');
        }

        // Process episodes data
        if (seriesData.episodes) {
          const seasons: Season[] = [];
          const episodesBySeason: { [key: string]: Episode[] } = {};

          // Group episodes by season
          Object.entries(seriesData.episodes).forEach(([seasonNum, episodes]: [string, any]) => {
            if (!episodesBySeason[seasonNum]) {
              episodesBySeason[seasonNum] = [];
            }
            
            // Convert episodes object to array if needed
            const episodeArray = Array.isArray(episodes) ? episodes : Object.values(episodes);
            episodesBySeason[seasonNum] = episodeArray.map((episode: any) => ({
              id: episode.id || `${params.id}_${seasonNum}_${episode.episode_num}`,
              title: episode.title || `Episode ${episode.episode_num}`,
              episode_num: parseInt(episode.episode_num) || 1,
              info: {
                movie_image: episode.info?.movie_image || seriesData.cover,
                duration_secs: episode.info?.duration_secs,
                plot: episode.info?.plot || episode.overview
              },
              container_extension: episode.container_extension || 'mp4'
            }));
          });

          // Sort seasons numerically
          const sortedSeasons = Object.keys(episodesBySeason)
            .sort((a, b) => parseInt(a) - parseInt(b));

          // Create seasons array
          sortedSeasons.forEach((seasonNum) => {
            const seasonEpisodes = episodesBySeason[seasonNum].sort((a, b) => 
              a.episode_num - b.episode_num
            );
            
            if (seasonEpisodes.length > 0) {
              seasons.push({
                season_number: parseInt(seasonNum),
                episodes: seasonEpisodes
              });
            }
          });

          // Update series data
          const updatedSeriesData: Series = {
            name: seriesData.name,
            cover: seriesData.cover,
            plot: seriesData.plot,
            cast: seriesData.cast,
            director: seriesData.director,
            genre: seriesData.genre,
            rating: seriesData.rating,
            seasons: seasons.length > 0 ? seasons : [{
              season_number: 1,
              episodes: []
            }]
          };

          console.log('Processed series data:', updatedSeriesData);
          setSeries(updatedSeriesData);
          
          // Select first episode of first season by default
          if (seasons.length > 0 && seasons[0].episodes.length > 0) {
            setSelectedSeason(seasons[0].season_number);
            setSelectedEpisode(seasons[0].episodes[0]);
          }
        } else {
          throw new Error('No episodes data found');
        }
      } catch (error) {
        console.error('Failed to fetch series data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load series');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-red-500">{error || 'Failed to load series'}</p>
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6">
        {/* Series poster */}
        <div className="relative aspect-[2/3] md:aspect-auto">
          {series.cover ? (
            <Image
              src={series.cover}
              alt={series.name}
              fill
              className="object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center rounded-lg">
              <Film className="w-12 h-12" />
            </div>
          )}
        </div>

        {/* Series info */}
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold">{series.name}</h1>
          {series.plot && (
            <p className="text-muted-foreground">{series.plot}</p>
          )}
          {series.cast && (
            <div>
              <h2 className="font-semibold mb-1">Cast</h2>
              <p className="text-muted-foreground">{series.cast}</p>
            </div>
          )}
          {series.director && (
            <div>
              <h2 className="font-semibold mb-1">Director</h2>
              <p className="text-muted-foreground">{series.director}</p>
            </div>
          )}
          {series.genre && (
            <div>
              <h2 className="font-semibold mb-1">Genre</h2>
              <p className="text-muted-foreground">{series.genre}</p>
            </div>
          )}
          {series.rating && (
            <div>
              <h2 className="font-semibold mb-1">Rating</h2>
              <p className="text-muted-foreground">{series.rating}/10</p>
            </div>
          )}
        </div>
      </div>

      {/* Video player and episode selection */}
      <div className="space-y-4">
        {selectedEpisode ? (
          <div className="rounded-lg overflow-hidden">
            <VideoPlayer
              src={getStreamUrl(parseInt(selectedEpisode.id), 'series', selectedEpisode.container_extension)}
              poster={selectedEpisode.info?.movie_image || series.cover}
              autoPlay
            />
          </div>
        ) : (
          <div className="aspect-video bg-accent rounded-lg flex items-center justify-center">
            <p className="text-lg text-center px-4">Select an episode to start watching</p>
          </div>
        )}

        {/* Season and episode selection */}
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-4">
            {series.seasons.map((season) => (
              <button
                key={season.season_number}
                onClick={() => setSelectedSeason(season.season_number)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedSeason === season.season_number 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Season {season.season_number}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {series.seasons
              .find((s) => s.season_number === selectedSeason)
              ?.episodes.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => setSelectedEpisode(episode)}
                  className={`flex flex-col bg-card rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all ${
                    selectedEpisode?.id === episode.id ? 'ring-2' : ''
                  }`}
                >
                  <div className="relative aspect-video">
                    {episode.info?.movie_image ? (
                      <Image
                        src={episode.info.movie_image}
                        alt={episode.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <Film className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium line-clamp-2">
                      Episode {episode.episode_num}: {episode.title}
                    </h3>
                    {episode.info?.plot && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {episode.info.plot}
                      </p>
                    )}
                    {episode.info?.duration_secs && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {Math.floor(episode.info.duration_secs / 60)} minutes
                      </p>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}