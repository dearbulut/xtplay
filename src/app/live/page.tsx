'use client';

import { useEffect, useState } from 'react';
import { VideoPlayer } from '@/components/video-player';
import { getCategories, getStreams, getStreamUrl } from '@/lib/api/auth/client';
import { Loader2 } from 'lucide-react';

interface Channel {
  stream_id: number;
  name: string;
  stream_icon?: string;
  epg_channel_id?: string;
  category_id: string;
}

interface Category {
  category_id: string;
  category_name: string;
}

export default function LiveTV() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories('live');
        if (data && Array.isArray(data)) {
          setCategories(data);
          if (data.length > 0) {
            setSelectedCategory(data[0].category_id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setError('Failed to load categories');
      }
    }

    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchChannels() {
      if (!selectedCategory) return;

      try {
        setLoading(true);
        const data = await getStreams('live', selectedCategory);
        if (data && Array.isArray(data)) {
          setChannels(data);
          if (data.length > 0 && !selectedChannel) {
            setSelectedChannel(data[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch channels:', error);
        setError('Failed to load channels');
      } finally {
        setLoading(false);
      }
    }

    fetchChannels();
  }, [selectedCategory]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-red-500">{error}</p>
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
    <div className="grid grid-cols-1 lg:grid-cols-[350px,1fr] gap-6 p-4">
      <div className="space-y-4">
        {/* Categories */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Categories</h2>
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.category_id}
                  onClick={() => setSelectedCategory(category.category_id)}
                  className={`w-full px-4 py-2 text-left rounded-md transition-colors ${
                    selectedCategory === category.category_id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  {category.category_name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Channels */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Channels</h2>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {channels.map((channel) => (
                  <button
                    key={channel.stream_id}
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full px-4 py-2 text-left rounded-md transition-colors ${
                      selectedChannel?.stream_id === channel.stream_id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {channel.stream_icon && (
                        <img
                          src={channel.stream_icon}
                          alt={channel.name}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <span>{channel.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player */}
      <div className="space-y-4">
        {selectedChannel ? (
          <>
            <h1 className="text-2xl font-bold">{selectedChannel.name}</h1>
            <div className="rounded-lg overflow-hidden">
              <VideoPlayer
                src={getStreamUrl(selectedChannel.stream_id, 'live')}
                autoPlay
              />
            </div>
          </>
        ) : (
          <div className="aspect-video bg-accent rounded-lg flex items-center justify-center">
            <p className="text-lg text-center px-4">
              Select a channel to start watching
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
