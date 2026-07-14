const emotionMusicProfiles = {
  happy: {
    title: 'Upbeat Boost',
    searchTerms: ['feel good pop', 'uplifting dance', 'happy indie'],
  },
  sad: {
    title: 'Soft Recovery',
    searchTerms: ['sad acoustic', 'calm piano', 'gentle indie'],
  },
  angry: {
    title: 'Release Valve',
    searchTerms: ['power rock', 'workout hype', 'intense alt'],
  },
  surprised: {
    title: 'Fresh Energy',
    searchTerms: ['electronic pop', 'energetic indie', 'surprise mix'],
  },
  neutral: {
    title: 'Balanced Flow',
    searchTerms: ['lofi chill', 'ambient focus', 'chill electronic'],
  },
  calm: {
    title: 'Calm Drift',
    searchTerms: ['lofi calm', 'ambient piano', 'relaxing instrumental'],
  },
  fear: {
    title: 'Grounding Mix',
    searchTerms: ['soothing instrumental', 'calm acoustic', 'breath focus'],
  },
  disgust: {
    title: 'Reset Session',
    searchTerms: ['uplifting pop', 'positive acoustic', 'fresh start'],
  },
};

const defaultProfile = emotionMusicProfiles.neutral;

export const getMusicProfileForEmotion = (emotion = 'neutral') => {
  return emotionMusicProfiles[String(emotion).toLowerCase()] || defaultProfile;
};

export const fetchSongRecommendations = async (emotion = 'neutral', options = {}) => {
  const profile = getMusicProfileForEmotion(emotion);
  const {
    excludeSongIds = [],
    limit = 8,
    requestId = Date.now(),
  } = options;
  const excluded = new Set(excludeSongIds.map((id) => String(id)));
  const collected = [];
  const collectedIds = new Set();

  const rotatedSearchTerms = rotateSearchTerms(profile.searchTerms, requestId);

  for (const query of rotatedSearchTerms) {
    const fetchedSongs = await fetchSongsByQuery(query);
    for (const song of fetchedSongs) {
      const songId = String(song.id);
      if (excluded.has(songId) || collectedIds.has(songId)) {
        continue;
      }
      collected.push(song);
      collectedIds.add(songId);
      if (collected.length >= limit) {
        break;
      }
    }

    if (collected.length >= limit) {
      break;
    }
  }

  const songs = shuffleSongs(collected).slice(0, limit);

  if (songs.length > 0) {
    return {
      profile,
      songs,
    };
  }

  // If all tracks were excluded, allow fallback without exclusions so user is not blocked.
  if (excludeSongIds.length > 0) {
    return fetchSongRecommendations(emotion, { ...options, excludeSongIds: [] });
  }

  return {
    profile,
    songs: getFallbackSongs(emotion),
  };
};

const fetchSongsByQuery = async (query) => {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=24`
    );
    const data = await response.json();

    return (data.results || [])
      .filter((item) => item.previewUrl)
      .map((item, index) => ({
        id: `${item.trackId || `${query}-${index}`}`,
        title: item.trackName,
        artist: item.artistName,
        artwork: item.artworkUrl100?.replace('100x100bb', '600x600bb'),
        previewUrl: item.previewUrl,
        trackViewUrl: item.trackViewUrl,
        genre: item.primaryGenreName,
      }));
  } catch (error) {
    console.error('Song recommendation fetch failed:', error.message);
    return [];
  }
};

const rotateSearchTerms = (searchTerms = [], requestId = 0) => {
  if (!Array.isArray(searchTerms) || searchTerms.length === 0) {
    return [];
  }

  const pivot = Math.abs(Number(requestId) || 0) % searchTerms.length;
  return [...searchTerms.slice(pivot), ...searchTerms.slice(0, pivot)];
};

const shuffleSongs = (songs = []) => {
  const copy = [...songs];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const getFallbackSongs = (emotion = 'neutral') => {
  const fallbacks = {
    happy: [
      { id: 'happy-1', title: 'Good as Hell', artist: 'Lizzo', previewUrl: null },
      { id: 'happy-2', title: 'Can’t Stop the Feeling!', artist: 'Justin Timberlake', previewUrl: null },
    ],
    sad: [
      { id: 'sad-1', title: 'Someone Like You', artist: 'Adele', previewUrl: null },
      { id: 'sad-2', title: 'The Night We Met', artist: 'Lord Huron', previewUrl: null },
    ],
    angry: [
      { id: 'angry-1', title: 'Eye of the Tiger', artist: 'Survivor', previewUrl: null },
      { id: 'angry-2', title: 'Believer', artist: 'Imagine Dragons', previewUrl: null },
    ],
    surprised: [
      { id: 'surprised-1', title: 'Midnight City', artist: 'M83', previewUrl: null },
      { id: 'surprised-2', title: 'Blinding Lights', artist: 'The Weeknd', previewUrl: null },
    ],
    neutral: [
      { id: 'neutral-1', title: 'Sunset Lover', artist: 'Petit Biscuit', previewUrl: null },
      { id: 'neutral-2', title: 'Weightless', artist: 'Marconi Union', previewUrl: null },
    ],
    calm: [
      { id: 'calm-1', title: 'River Flows in You', artist: 'Yiruma', previewUrl: null },
      { id: 'calm-2', title: 'Clair de Lune', artist: 'Claude Debussy', previewUrl: null },
    ],
    fear: [
      { id: 'fear-1', title: 'Breathe Me', artist: 'Sia', previewUrl: null },
      { id: 'fear-2', title: 'Holocene', artist: 'Bon Iver', previewUrl: null },
    ],
    disgust: [
      { id: 'disgust-1', title: 'Stronger', artist: 'Kelly Clarkson', previewUrl: null },
      { id: 'disgust-2', title: 'Roar', artist: 'Katy Perry', previewUrl: null },
    ],
  };

  return fallbacks[String(emotion).toLowerCase()] || fallbacks.neutral;
};
