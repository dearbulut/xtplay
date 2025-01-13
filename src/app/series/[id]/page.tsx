'use client';

import { useEffect, useState, use } from 'react';
import { fetchFromApi, getStreamUrl } from '@/lib/api';
import { VideoPlayer } from '@/components/video-player';
import { Film } from 'lucide-react';
import Image from 'next/image';

interface SeriesDetailsProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SeriesDetails(props: SeriesDetailsProps) {
  const params = use(props.params);
  const [series, setSeries] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const seriesData = await fetchFromApi(`get_series_info&series_id=${params.id}`);
        
        // Restructure the episodes data into seasons
        if (seriesData.episodes) {
          const seasons: any[] = [];
          const episodesBySeason: { [key: string]: any[] } = {};

          // Group episodes by season
          Object.entries(seriesData.episodes).forEach(([seasonNum, episodes]: [string, any]) => {
            if (!episodesBySeason[seasonNum]) {
              episodesBySeason[seasonNum] = [];
            }
            
            // Convert episodes object to array if needed
            const episodeArray = Array.isArray(episodes) ? episodes : Object.values(episodes);
            episodesBySeason[seasonNum] = episodeArray.map((episode: any) => ({
              ...episode,
              season_number: parseInt(seasonNum),
              episode_num: episode.episode_num || 1,
              title: episode.title || `Episode ${episode.episode_num || 1}`,
              container_extension: episode.container_extension || 'mp4'
            }));
          });

          // Sort seasons numerically
          const sortedSeasons = Object.keys(episodesBySeason)
            .sort((a, b) => parseInt(a) - parseInt(b));

          // Create seasons array
          sortedSeasons.forEach((seasonNum) => {
            seasons.push({
              season_number: parseInt(seasonNum),
              episodes: episodesBySeason[seasonNum].sort((a, b) => a.episode_num - b.episode_num)
            });
          });

          // Update series data with restructured seasons
          const updatedSeriesData = {
            ...seriesData,
            seasons
          };

          setSeries(updatedSeriesData);
          
          // Select first episode of first season by default
          if (seasons.length > 0 && seasons[0].episodes.length > 0) {
            setSelectedSeason(seasons[0].season_number);
            setSelectedEpisode(seasons[0].episodes[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch series data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  if (loading || !series) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              src={getStreamUrl( selectedEpisode.id, 'series')}
              poster={selectedEpisode.info?.movie_image || series.cover}
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
            {series.seasons?.map((season: any) => (
              <button
                key={season.season_number}
                onClick={() => setSelectedSeason(season.season_number)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedSeason === season.season_number ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                Season {season.season_number}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {series.seasons
              ?.find((s: any) => s.season_number === selectedSeason)
              ?.episodes.map((episode: any) => (
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
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
