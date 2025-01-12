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

      // Get episodes for the selected season
      const seasonEpisodes = series.seasons.find((s: any) => s.season_number === seasonNumber)?.episodes || [];
      console.log(`Episodes for season ${seasonNumber}:`, seasonEpisodes);

      if (seasonEpisodes.length > 0) {
        setSelectedEpisode(seasonEpisodes[0]);
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
        if (!params.id) {
          console.error('No series ID provided');
          return;
        }

        // 1. Fetch series info
        console.log('Fetching series info for ID:', params.id);
        const seriesData = await fetchFromApi('get_series_info', { series_id: params.id });
        console.log('Raw series info:', seriesData);
        console.log('Series info type:', typeof seriesData);
        console.log('Series info keys:', Object.keys(seriesData));

        // Extract series info and episodes
        console.log('Processing series info...');
        const seriesInfo = seriesData.info || {};
        const episodes = seriesData.episodes || [];
        console.log('Series info:', seriesInfo);
        console.log('Episodes:', episodes);

        // Create a map to group episodes by season
        const seasonMap = new Map<number, any[]>();
        episodes.forEach((episode: any) => {
          // Try to extract season number from title (e.g., "S01E01" or "Season 1")
          let seasonNum = 1; // Default to season 1
          const seasonMatch = episode.title?.match(/S(\d+)E\d+|Season (\d+)/i);
          if (seasonMatch) {
            seasonNum = parseInt(seasonMatch[1] || seasonMatch[2]);
          } else if (episode.season_number) {
            seasonNum = parseInt(episode.season_number);
          }

          // Add episode to season group
          if (!seasonMap.has(seasonNum)) {
            seasonMap.set(seasonNum, []);
          }
          seasonMap.get(seasonNum)?.push(episode);
        });

        // Convert map to array and sort by season number
        const seasonNumbers = Array.from(seasonMap.keys()).sort((a, b) => a - b);
        if (seasonNumbers.length === 0) {
          seasonNumbers.push(1); // Default to season 1 if no seasons found
        }
        
        console.log('Available seasons:', seasonNumbers);

        if (seasonNumbers.length > 0) {
          // Get first season
          const firstSeasonNumber = seasonNumbers[0];
          console.log('First season number:', firstSeasonNumber);

          // Create seasons array from season map
          const seasons = seasonNumbers.map(seasonNum => ({
            season_number: seasonNum,
            name: `Season ${seasonNum}`,
            episodes: seasonMap.get(seasonNum) || []
          }));
          console.log('Processed seasons:', seasons);

          // Combine all data
          const fullSeriesData = {
            ...seriesInfo,
            seasons: seasons
          };

          console.log('Full series data:', JSON.stringify(fullSeriesData, null, 2));
          setSeries(fullSeriesData);
          setSelectedSeason(firstSeasonNumber);

          // Select first episode of first season
          const firstSeasonEpisodes = seasonMap.get(firstSeasonNumber) || [];
          if (firstSeasonEpisodes.length > 0) {
            setSelectedEpisode(firstSeasonEpisodes[0]);
          }
        } else {
          setSeries(seriesInfo);
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

    return currentSeason.episodes.map((episode: any) => {
      console.log('Rendering episode:', episode);
      return (
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
            <VideoPlayer
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