'use client';

import { useEffect, useState, use } from 'react';
import { fetchFromApi, getStreamUrl } from '@/lib/api';
import { ExoPlayer } from '@/components/exo-player';
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
  const [seasonLoading, setSeasonLoading] = useState(false);

  // Fetch series info and episodes
  useEffect(() => {
    const fetchSeriesData = async () => {
      try {
        setLoading(true);
        console.log('Fetching series info for ID:', params.id);

        // 1. Get series info
        const seriesInfo = await fetchFromApi('get_series_info', { series_id: params.id });
        console.log('Series info:', seriesInfo);

        if (!seriesInfo) {
          throw new Error('Failed to fetch series info');
        }

        // 2. Get episodes for all seasons
        const allEpisodes = [];
        const seasonCount = seriesInfo.episode_run_time || seriesInfo.info?.episode_run_time || 1;
        
        for (let i = 1; i <= seasonCount; i++) {
          const seasonEpisodes = await fetchFromApi('get_series_episodes', {
            series_id: params.id,
            season_number: String(i)
          });
          
          if (Array.isArray(seasonEpisodes)) {
            allEpisodes.push({
              season_number: i,
              name: `Season ${i}`,
              episodes: seasonEpisodes
            });
          }
        }

        // 3. Combine data
        const fullSeriesData = {
          ...seriesInfo,
          seasons: allEpisodes
        };

        console.log('Full series data:', fullSeriesData);
        setSeries(fullSeriesData);

        // 4. Set initial episode if available
        if (allEpisodes.length > 0 && allEpisodes[0].episodes.length > 0) {
          setSelectedSeason(1);
          setSelectedEpisode(allEpisodes[0].episodes[0]);
        }

      } catch (error) {
        console.error('Error fetching series data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchSeriesData();
    }
  }, [params.id]);

  // Handle season change
  const handleSeasonChange = async (seasonNumber: number) => {
    try {
      setSeasonLoading(true);
      setSelectedSeason(seasonNumber);

      const currentSeason = series.seasons.find((s: any) => s.season_number === seasonNumber);
      if (currentSeason && currentSeason.episodes.length > 0) {
        setSelectedEpisode(currentSeason.episodes[0]);
      } else {
        setSelectedEpisode(null);
      }
    } catch (error) {
      console.error('Error changing season:', error);
    } finally {
      setSeasonLoading(false);
    }
  };

  if (loading || !series) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const currentSeason = series.seasons?.find((s: any) => s.season_number === selectedSeason);

  return (
    <div className="space-y-6">
      {/* Series Info */}
      <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6">
        <div className="relative aspect-[2/3] md:aspect-auto">
          {series.info?.cover || series.cover ? (
            <Image
              src={series.info?.cover || series.cover}
              alt={series.info?.name || series.name}
              fill
              className="object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center rounded-lg">
              <Film className="w-12 h-12" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold">{series.info?.name || series.name}</h1>
          {(series.info?.plot || series.plot) && (
            <p className="text-muted-foreground">{series.info?.plot || series.plot}</p>
          )}
          {(series.info?.cast || series.cast) && (
            <div>
              <h2 className="font-semibold mb-1">Cast</h2>
              <p className="text-muted-foreground">{series.info?.cast || series.cast}</p>
            </div>
          )}
          {(series.info?.director || series.director) && (
            <div>
              <h2 className="font-semibold mb-1">Director</h2>
              <p className="text-muted-foreground">{series.info?.director || series.director}</p>
            </div>
          )}
          {(series.info?.genre || series.genre) && (
            <div>
              <h2 className="font-semibold mb-1">Genre</h2>
              <p className="text-muted-foreground">{series.info?.genre || series.genre}</p>
            </div>
          )}
          {(series.info?.rating || series.rating) && (
            <div>
              <h2 className="font-semibold mb-1">Rating</h2>
              <p className="text-muted-foreground">{series.info?.rating || series.rating}/10</p>
            </div>
          )}
        </div>
      </div>

      {/* Video Player and Episodes */}
      <div className="space-y-4">
        {selectedEpisode ? (
          <div className="rounded-lg overflow-hidden">
            <ExoPlayer
              src={getStreamUrl(selectedEpisode.id, 'series', selectedEpisode.container_extension)}
              container={selectedEpisode.container_extension || 'ts'}
              poster={selectedEpisode.info?.movie_image || series.info?.cover || series.cover}
            />
          </div>
        ) : (
          <div className="aspect-video bg-accent rounded-lg flex items-center justify-center">
            <p className="text-lg text-center px-4">Select an episode to start watching</p>
          </div>
        )}

        {/* Season Selection */}
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-4">
            {series.seasons?.map((season: any) => (
              <button
                key={season.season_number}
                onClick={() => handleSeasonChange(season.season_number)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedSeason === season.season_number
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}
              >
                Season {season.season_number}
              </button>
            ))}
          </div>

          {/* Episodes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {seasonLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col bg-card rounded-lg overflow-hidden animate-pulse"
                >
                  <div className="relative aspect-video bg-secondary" />
                  <div className="p-3">
                    <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-4 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : currentSeason?.episodes?.length ? (
              currentSeason.episodes.map((episode: any, index: number) => (
                <button
                  key={episode.id || `episode-${index}`}
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
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">No episodes found for this season</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}