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
  console.log('Series ID:', params.id);
  const [series, setSeries] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);

  const handleSeasonChange = async (seasonNumber: number) => {
    console.log('Changing to season:', seasonNumber);
    setSeasonLoading(true);
    setSelectedSeason(seasonNumber);
    try {
      if (!params.id) {
        console.error('No series ID provided');
        return;
      }

      // Fetch episodes for the selected season
      console.log(`Fetching episodes for series ${params.id}, season ${seasonNumber}`);
      const episodesData = await fetchFromApi('get_series_episodes', { 
        series_id: params.id,
        season_number: String(seasonNumber)
      });
      console.log('Episodes data:', JSON.stringify(episodesData, null, 2));

      // Update series data with new episodes
      setSeries(prev => {
        const updatedSeries = {
          ...prev,
          seasons: prev.seasons.map(season => {
            if (season.season_number === seasonNumber) {
              return {
                ...season,
                episodes: Array.isArray(episodesData) ? episodesData : []
              };
            }
            return season;
          })
        };
        console.log('Updated series data:', JSON.stringify(updatedSeries, null, 2));
        return updatedSeries;
      });

      // Select first episode if available
      if (Array.isArray(episodesData) && episodesData.length > 0) {
        console.log('Setting first episode:', episodesData[0]);
        setSelectedEpisode(episodesData[0]);
      } else {
        console.log('No episodes available for season:', seasonNumber);
        setSelectedEpisode(null);
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
      setSelectedEpisode(null);
    } finally {
      setSeasonLoading(false);
    }
  };

  useEffect(() => {
    const loadSeriesData = async () => {
      try {
        if (!params.id) {
          console.error('No series ID provided');
          return;
        }

        // 1. Fetch series info
        console.log('Fetching series info for ID:', params.id);
        const seriesData = await fetchFromApi('get_series_seasons', { series_id: params.id });
        console.log('Series data:', JSON.stringify(seriesData, null, 2));

        // Get total seasons from series info
        const totalSeasons = seriesData.episodes_count || seriesData.info?.episodes_count || 1;
        console.log('Total seasons:', totalSeasons);

        // Create array of season numbers
        const seasons = Array.from({ length: totalSeasons }, (_, i) => ({
          season_number: i + 1,
          name: `Season ${i + 1}`,
          episodes: []
        }));

        // Fetch episodes for first season
        const firstSeasonEpisodes = await fetchFromApi('get_series_episodes', {
          series_id: params.id,
          season_number: '1'
        });

        // Update first season with episodes
        if (firstSeasonEpisodes && Array.isArray(firstSeasonEpisodes)) {
          seasons[0].episodes = firstSeasonEpisodes;
        }

        console.log('Created seasons:', seasons);

        // Combine all data
        const fullSeriesData = {
          ...seriesData,
          seasons: seasons
        };

        console.log('Full series data:', JSON.stringify(fullSeriesData, null, 2));
        setSeries(fullSeriesData);
        setSelectedSeason(1);

        // Select first episode if available
        if (seasons[0].episodes.length > 0) {
          setSelectedEpisode(seasons[0].episodes[0]);
        }
      } catch (error) {
        console.error('Failed to fetch series data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSeriesData();
  }, [params.id]);

  if (loading || !series) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const renderEpisodes = () => {
    const currentSeason = series.seasons?.find((s: any) => s.season_number === selectedSeason);
    console.log('Current season:', currentSeason);
    
    if (!currentSeason?.episodes?.length) {
      console.log('No episodes found for season:', selectedSeason);
      return (
        <div className="col-span-full text-center py-8">
          <p className="text-muted-foreground">No episodes found for this season</p>
        </div>
      );
    }

    return currentSeason.episodes.map((episode: any, index: number) => {
      console.log('Rendering episode:', episode);
      const episodeKey = episode.id || `episode-${index}`;
      return (
        <button
          key={episodeKey}
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
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6">
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

      <div className="space-y-4">
        {selectedEpisode ? (
          <div className="rounded-lg overflow-hidden">
            <ExoPlayer
              src={getStreamUrl(selectedEpisode.id, 'series', selectedEpisode.container_extension)}
              container={selectedEpisode.container_extension || 'ts'}
              poster={selectedEpisode.info?.movie_image || series.cover}
            />
          </div>
        ) : (
          <div className="aspect-video bg-accent rounded-lg flex items-center justify-center">
            <p className="text-lg text-center px-4">Select an episode to start watching</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-4">
            {series.seasons?.map((season: any, index: number) => (
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
              Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="flex flex-col bg-card rounded-lg overflow-hidden animate-pulse">
                  <div className="relative aspect-video bg-secondary" />
                  <div className="p-3">
                    <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-4 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              renderEpisodes()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}