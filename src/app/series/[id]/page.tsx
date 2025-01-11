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
  const [seasonLoading, setSeasonLoading] = useState(false);

  const handleSeasonChange = async (seasonNumber: number) => {
    setSeasonLoading(true);
    setSelectedSeason(seasonNumber);
    try {
      const episodesData = await fetchFromApi(`get_series_episodes&series_id=${params.id}&season_number=${seasonNumber}`);
      
      // Update the episodes for the selected season
      setSeries(prev => ({
        ...prev,
        seasons: prev.seasons.map(season => {
          if (season.season_number === seasonNumber) {
            return {
              ...season,
              episodes: episodesData.filter(episode => episode.season === seasonNumber)
            };
          }
          return season;
        })
      }));

      // Select first episode of the season if available
      if (episodesData && episodesData.length > 0) {
        setSelectedEpisode(episodesData[0]);
      } else {
        setSelectedEpisode(null);
      }
    } catch (error) {
      console.error('Failed to fetch season episodes:', error);
    } finally {
      setSeasonLoading(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch series info
        const seriesData = await fetchFromApi(`get_series_info&series_id=${params.id}`);
        
        // Fetch seasons
        const seasonsData = await fetchFromApi(`get_series_seasons&series_id=${params.id}`);
        
        // If we have seasons, fetch episodes for the first season
        if (seasonsData && seasonsData.length > 0) {
          const firstSeasonNumber = seasonsData[0].season_number;
          const episodesData = await fetchFromApi(`get_series_episodes&series_id=${params.id}&season_number=${firstSeasonNumber}`);
          
          // Combine all data
          const fullSeriesData = {
            ...seriesData,
            seasons: seasonsData.map(season => ({
              ...season,
              episodes: episodesData.filter(episode => episode.season === season.season_number)
            }))
          };
          
          setSeries(fullSeriesData);
          setSelectedSeason(firstSeasonNumber);
          
          // Select first episode if available
          if (episodesData && episodesData.length > 0) {
            setSelectedEpisode(episodesData[0]);
          }
        } else {
          setSeries(seriesData);
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
                onClick={() => handleSeasonChange(season.season_number)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedSeason === season.season_number ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                Season {season.season_number}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {seasonLoading ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="flex flex-col bg-card rounded-lg overflow-hidden animate-pulse">
                  <div className="relative aspect-video bg-secondary" />
                  <div className="p-3">
                    <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-4 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : series.seasons
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
}
