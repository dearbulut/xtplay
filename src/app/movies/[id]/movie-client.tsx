'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Film, Star, Video } from 'lucide-react';
import { ExoPlayer } from '@/components/exo-player';

interface MovieInfo {
  movie_image: string;
  name: string;
  tmdb_id: number;
  backdrop: string;
  youtube_trailer: string;
  genre: string;
  plot: string;
  cast: string;
  rating: string;
  director: string;
  releasedate: string;
  backdrop_path: string[];
  duration_secs: number;
  duration: string;
}

interface MovieData {
  stream_id: number;
  name: string;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

interface MovieDetails {
  info: MovieInfo;
  movie_data: MovieData;
  streamUrl: string;
}

export default function MovieClient({ movieDetails }: { movieDetails: MovieDetails }) {
  const [streamUrl, setStreamUrl] = useState<string>(movieDetails.streamUrl);

  useEffect(() => {
    setStreamUrl(movieDetails.streamUrl);
  }, [movieDetails.streamUrl]);

  return (
    <div className="space-y-6">
      <div className="relative aspect-video rounded-lg overflow-hidden">
        <ExoPlayer
          src={streamUrl}
          poster={movieDetails.info.movie_image}
          autoPlay={false}
          container={movieDetails.movie_data.container_extension as 'm3u8' | 'ts' | 'mp4' | 'mkv'}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{movieDetails.info.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              {movieDetails.info.duration && (
                <>
                  <span>{movieDetails.info.duration}</span>
                  <span>•</span>
                </>
              )}
              {movieDetails.info.releasedate && (
                <>
                  <span>{movieDetails.info.releasedate}</span>
                  <span>•</span>
                </>
              )}
              {movieDetails.info.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current text-yellow-400" />
                  <span>{Number(movieDetails.info.rating).toFixed(1)}/10</span>
                </div>
              )}
            </div>
          </div>
          {movieDetails.info.youtube_trailer && (
            <Button
              variant="outline"
              asChild
            >
              <Link
                href={`https://www.youtube.com/watch?v=${movieDetails.info.youtube_trailer}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch Trailer
              </Link>
            </Button>
          )}
        </div>

        {movieDetails.info.plot && (
          <p className="text-muted-foreground">{movieDetails.info.plot}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {movieDetails.info.genre && (
            <div>
              <h2 className="font-semibold mb-1">Genre</h2>
              <p className="text-muted-foreground">{movieDetails.info.genre}</p>
            </div>
          )}
          {movieDetails.info.director && (
            <div>
              <h2 className="font-semibold mb-1">Director</h2>
              <p className="text-muted-foreground">{movieDetails.info.director}</p>
            </div>
          )}
          {movieDetails.info.cast && (
            <div className="sm:col-span-2">
              <h2 className="font-semibold mb-1">Cast</h2>
              <p className="text-muted-foreground">{movieDetails.info.cast}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
