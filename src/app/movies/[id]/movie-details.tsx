'use client';

import { useEffect, useState } from 'react';
import { fetchFromApi, getStreamUrl } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import MovieClient from './movie-client';
import { MovieDetails } from './types';

interface MovieDetailsComponentProps {
  movieId: string;
}

export default function MovieDetailsComponent({ movieId }: MovieDetailsComponentProps) {
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMovieDetails() {
      try {
        setLoading(true);
        const movie = await fetchFromApi('get_vod_info', { vod_id: movieId });
        
        if (!movie || !movie.movie_data) {
          throw new Error('Invalid movie data received from API');
        }
        
        const streamUrl = await getStreamUrl(movie.movie_data.stream_id, "movie", movie.movie_data.container_extension);
        
        setMovieDetails({
          ...movie,
          streamUrl
        });
      } catch (error) {
        console.error('Error fetching movie details:', error);
        setError('Failed to load movie details');
      } finally {
        setLoading(false);
      }
    }

    loadMovieDetails();
  }, [movieId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error}
      </div>
    );
  }

  if (!movieDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Movie not found
      </div>
    );
  }

  return <MovieClient movieDetails={movieDetails} />;
}
