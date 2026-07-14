import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'emotrack:emotion-history';

const EMOTION_GROUPS = {
  positive: new Set(['happy', 'calm']),
  neutral: new Set(['neutral', 'surprised']),
  negative: new Set(['sad', 'angry', 'fear', 'disgust']),
};

const normalizeEmotion = (emotion = 'neutral') => String(emotion).toLowerCase().trim();

const getStorageKey = (userId = 'guest') => `${STORAGE_PREFIX}:${userId}`;

export const getEmotionCategory = (emotion) => {
  const normalized = normalizeEmotion(emotion);

  if (EMOTION_GROUPS.positive.has(normalized)) return 'positive';
  if (EMOTION_GROUPS.negative.has(normalized)) return 'negative';
  return 'neutral';
};

export const getEmotionSymbol = (emotion) => {
  const normalized = normalizeEmotion(emotion);
  const symbols = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    surprised: '😮',
    neutral: '😐',
    calm: '😌',
    fear: '😨',
    disgust: '🤢',
  };

  return symbols[normalized] || '✨';
};

export const getMoodShiftLabel = (previousEmotion, currentEmotion) => {
  if (!previousEmotion) {
    return 'First capture';
  }

  const previous = normalizeEmotion(previousEmotion);
  const current = normalizeEmotion(currentEmotion);

  if (previous === current) {
    return 'Mood steady';
  }

  const previousCategory = getEmotionCategory(previous);
  const currentCategory = getEmotionCategory(current);

  if (previousCategory === currentCategory) {
    return 'Mood shifted slightly';
  }

  if (previousCategory === 'negative' && currentCategory === 'positive') {
    return 'Mood improving';
  }

  if (previousCategory === 'positive' && currentCategory === 'negative') {
    return 'Mood dropped';
  }

  if (currentCategory === 'neutral') {
    return 'Returning to balance';
  }

  return 'Mood changed';
};

export const getEmotionTrendInsight = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) {
    return 'Capture a few moments to generate a mood insight.';
  }

  const recent = [...history].slice(0, 5);
  const categoryScores = {
    positive: 1,
    neutral: 0,
    negative: -1,
  };

  const totalScore = recent.reduce((score, item) => score + (categoryScores[getEmotionCategory(item.emotion)] ?? 0), 0);
  const latest = recent[0];
  const oldest = recent[recent.length - 1];
  const latestScore = categoryScores[getEmotionCategory(latest.emotion)] ?? 0;
  const oldestScore = categoryScores[getEmotionCategory(oldest.emotion)] ?? 0;

  if (recent.length === 1) {
    return `You have one recorded mood: ${normalizeEmotion(latest.emotion)}.`;
  }

  if (totalScore >= 2) {
    return 'Your recent pattern leans positive, with upbeat captures dominating the last few check-ins.';
  }

  if (totalScore <= -2) {
    return 'Your recent pattern leans heavier, so calmer recommendations may fit better right now.';
  }

  if (latestScore > oldestScore) {
    return 'Your mood is trending upward compared with earlier captures.';
  }

  if (latestScore < oldestScore) {
    return 'Your latest captures suggest a small downward shift in mood.';
  }

  return 'Your mood is staying fairly balanced across recent captures.';
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';

  const elapsedMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(elapsedMs / 3600000);
  const days = Math.floor(elapsedMs / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const getEmotionHistory = async (userId = 'guest') => {
  try {
    const rawValue = await AsyncStorage.getItem(getStorageKey(userId));
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to read emotion history:', error.message);
    return [];
  }
};

export const saveEmotionHistoryEntry = async (userId = 'guest', entry, limit = 12) => {
  try {
    const previousEntries = await getEmotionHistory(userId);
    const nextEntries = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...previousEntries,
    ].slice(0, limit);

    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nextEntries));
    return nextEntries;
  } catch (error) {
    console.warn('Failed to save emotion history:', error.message);
    return [];
  }
};

export const clearEmotionHistory = async (userId = 'guest') => {
  try {
    await AsyncStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.warn('Failed to clear emotion history:', error.message);
  }
};
