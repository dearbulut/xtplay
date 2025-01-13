import axios from 'axios';

interface XtreamProfile {
  url: string;
  username: string;
  password: string;
}

export async function getSeriesInfo(seriesId: string, profile: XtreamProfile) {
  try {
    const response = await axios.post(`${profile.url}/player_api.php`, {
      username: profile.username,
      password: profile.password,
      action: 'get_series_info',
      series_id: seriesId,
    });

    const data = response.data;
    if (Array.isArray(data)) {
      // Normalize episode numbers
      data.forEach(episode => {
        if (!episode.episode_num && episode.episode) {
          episode.episode_num = episode.episode;
        }
      });

      // Group episodes by season
      const seasons = data.reduce((acc, episode) => {
        const seasonNum = episode.season || 1;
        if (!acc[seasonNum]) {
          acc[seasonNum] = [];
        }
        acc[seasonNum].push({
          ...episode,
          episode_num: parseInt(episode.episode_num),
          url: `${profile.url}/series/${profile.username}/${profile.password}/${episode.id}.${episode.container_extension}`,
        });
        return acc;
      }, {} as Record<number, any[]>);

      // Sort episodes within each season
      Object.values(seasons).forEach(episodes => {
        episodes.sort((a, b) => {
          const aNum = parseInt(a.episode_num) || 0;
          const bNum = parseInt(b.episode_num) || 0;
          return aNum - bNum;
        });
      });

      return {
        seasons: Object.entries(seasons).map(([season, episodes]) => ({
          season_number: parseInt(season),
          episodes: episodes.map(episode => ({
            id: episode.id,
            title: episode.title || `Episode ${episode.episode_num}`,
            episode_num: parseInt(episode.episode_num) || 0,
            info: {
              movie_image: episode.info?.movie_image,
              duration_secs: episode.info?.duration_secs,
              plot: episode.info?.plot,
            },
            container_extension: episode.container_extension,
            url: episode.url,
          })),
        })),
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch series info:', error);
    return null;
  }
}
