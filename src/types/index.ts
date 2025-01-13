export interface VideoPlayerProps {
  src: string | Promise<string>;
  poster?: string;
  autoPlay?: boolean;
}

export interface SeriesEpisode {
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

export interface SeriesSeason {
  season_number: number;
  episodes: SeriesEpisode[];
}

export interface Series {
  name: string;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  rating?: string;
  seasons: SeriesSeason[];
}
