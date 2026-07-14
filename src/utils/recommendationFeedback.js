import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'emotrack:recommendation-feedback';

const getStorageKey = (userId = 'guest') => `${STORAGE_PREFIX}:${userId}`;

export const getRecommendationFeedback = async (userId = 'guest') => {
  try {
    const rawValue = await AsyncStorage.getItem(getStorageKey(userId));
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to read recommendation feedback:', error.message);
    return [];
  }
};

export const recordRecommendationFeedback = async (userId = 'guest', entry) => {
  try {
    const history = await getRecommendationFeedback(userId);
    const nextHistory = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...history,
    ].slice(0, 20);

    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nextHistory));
    return nextHistory;
  } catch (error) {
    console.warn('Failed to save recommendation feedback:', error.message);
    return [];
  }
};

export const getRecommendationFeedbackStats = async (userId = 'guest') => {
  const feedback = await getRecommendationFeedback(userId);
  const positive = feedback.filter((item) => item.match === true).length;
  const negative = feedback.filter((item) => item.match === false).length;
  const total = positive + negative;

  return {
    total,
    positive,
    negative,
    matchRate: total > 0 ? Math.round((positive / total) * 100) : 0,
  };
};

export const clearRecommendationFeedback = async (userId = 'guest') => {
  try {
    await AsyncStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.warn('Failed to clear recommendation feedback:', error.message);
  }
};
