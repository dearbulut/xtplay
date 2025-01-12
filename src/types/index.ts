export interface Series {
  series_id: string;
  name: string;
  cover?: string;
  category_id: string;
  rating?: number;
}

export interface Category {
  category_id: string;
  category_name: string;
}


export interface Channel {
  id: string;
  displayName: string;
  icon: string;
}

export interface Programme {
  title: string;
  desc: string;
  start: string;
  stop: string;
  end: string;
  channel: string;
}

export interface EPGData {
  channels: Channel[];
  programmes: Programme[];
}

export interface VideoPlayerProps {
  src: string | Promise<string>;
  poster?: string;
  autoPlay?: boolean;
  container?: 'm3u8' | 'ts' | 'mp4';
}