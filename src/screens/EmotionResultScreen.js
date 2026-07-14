import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { auth } from '../config/firebase';
import { COLORS, SPACING, RADIUS, FONT, SHADOW, SAFE_TOP } from '../theme';
import {
  formatRelativeTime,
  getEmotionCategory,
  getEmotionHistory,
  getEmotionSymbol,
  getMoodShiftLabel,
  saveEmotionHistoryEntry,
} from '../utils/emotionHistory';

const { width } = Dimensions.get('window');

const emotionConfig = {
  happy: {
    emoji: '😊',
    gradient: ['#F59E0B', '#EF4444'],
    message: "You're feeling happy!",
    description: 'Your positive energy is shining through.',
    tag: 'Joyful',
  },
  sad: {
    emoji: '😢',
    gradient: ['#3B82F6', '#6366F1'],
    message: 'Feeling a bit low',
    description: "It's okay — every emotion has its place.",
    tag: 'Melancholic',
  },
  angry: {
    emoji: '😠',
    gradient: ['#EF4444', '#F97316'],
    message: "You're feeling intense",
    description: 'Take a deep breath. This will pass.',
    tag: 'Intense',
  },
  surprised: {
    emoji: '😮',
    gradient: ['#06B6D4', '#3B82F6'],
    message: 'You look surprised!',
    description: 'Something caught your attention.',
    tag: 'Astonished',
  },
  neutral: {
    emoji: '😐',
    gradient: ['#6366F1', '#8B5CF6'],
    message: 'Calm and composed',
    description: 'A balanced, neutral state of mind.',
    tag: 'Balanced',
  },
  calm: {
    emoji: '😌',
    gradient: ['#10B981', '#06B6D4'],
    message: "You're at peace",
    description: 'Relaxed and centered energy.',
    tag: 'Serene',
  },
  fear: {
    emoji: '😨',
    gradient: ['#6366F1', '#4338CA'],
    message: 'Feeling a bit worried',
    description: "You've got this. Everything will be alright.",
    tag: 'Anxious',
  },
  disgust: {
    emoji: '🤢',
    gradient: ['#8B5CF6', '#A855F7'],
    message: 'Something off?',
    description: 'Stay positive — better moments ahead.',
    tag: 'Displeased',
  },
};

export default function EmotionResultScreen({ navigation, route }) {
  const { emotion, confidence = 0, image } = route.params;
  const emotionKey = emotion.toLowerCase();
  const config = emotionConfig[emotionKey] || emotionConfig.neutral;
  const currentUserId = auth.currentUser?.uid || 'guest';
  const [previousEmotion, setPreviousEmotion] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [historySaved, setHistorySaved] = useState(false);

  const moodShiftLabel = getMoodShiftLabel(previousEmotion?.emotion, emotion);
  const moodTrend = useMemo(() => {
    if (!previousEmotion) {
      return 'Start tracking to unlock mood comparisons and a personal emotional trail.';
    }

    const currentCategory = getEmotionCategory(emotion);
    const previousCategory = getEmotionCategory(previousEmotion.emotion);

    if (currentCategory === previousCategory) {
      return 'Your mood is staying consistent across captures.';
    }

    if (previousCategory === 'negative' && currentCategory === 'positive') {
      return 'Nice shift. The latest capture looks more uplifting.';
    }

    if (previousCategory === 'positive' && currentCategory === 'negative') {
      return 'The latest capture looks heavier. A calmer playlist may help.';
    }

    return 'Your emotional pattern has changed since the last capture.';
  }, [emotion, previousEmotion]);

  useEffect(() => {
    let mounted = true;

    const loadAndStoreHistory = async () => {
      const history = await getEmotionHistory(currentUserId);
      const latestPrevious = history[0] || null;

      if (!mounted) {
        return;
      }

      setPreviousEmotion(latestPrevious);
      setRecentHistory(history.slice(0, 3));

      const savedHistory = await saveEmotionHistoryEntry(currentUserId, {
        emotion,
        confidence,
      });

      if (!mounted) {
        return;
      }

      setHistorySaved(true);
      setRecentHistory(savedHistory.slice(0, 3));
    };

    loadAndStoreHistory().catch(() => {
      if (mounted) {
        Alert.alert('History unavailable', 'Current emotion was shown, but mood history could not be saved.');
      }
    });

    return () => {
      mounted = false;
    };
  }, [confidence, currentUserId, emotion]);

  const getConfidenceLabel = (conf) => {
    if (conf === 0) return 'Demo Mode';
    if (conf >= 80) return 'Very High';
    if (conf >= 60) return 'High';
    if (conf >= 40) return 'Moderate';
    return 'Low';
  };

  const getConfidenceColor = (conf) => {
    if (conf === 0) return COLORS.textTertiary;
    if (conf >= 80) return '#10B981';
    if (conf >= 60) return '#22C55E';
    if (conf >= 40) return COLORS.warning;
    return '#F97316';
  };

  return (
    <LinearGradient colors={config.gradient} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backPill}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backLabel}>Home</Text>
          </TouchableOpacity>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{config.tag}</Text>
          </View>
        </View>

        {/* Emotion Hero */}
        <View style={styles.heroSection}>
          <Animatable.Text animation="bounceIn" duration={1000} style={styles.emojiHero}>
            {config.emoji}
          </Animatable.Text>
          <Animatable.View animation="fadeInUp" delay={300}>
            <Text style={styles.emotionMessage}>{config.message}</Text>
            <Text style={styles.emotionDescription}>{config.description}</Text>
          </Animatable.View>
        </View>

        {/* Result Card */}
        <Animatable.View animation="fadeInUp" delay={500} style={styles.resultCard}>
          {/* Emotion Name */}
          <View style={styles.emotionLabelRow}>
            <Text style={styles.detectedLabel}>Detected Emotion</Text>
            <Text style={styles.emotionName}>{emotion.charAt(0).toUpperCase() + emotion.slice(1)}</Text>
          </View>

          <View style={styles.wowBanner}>
            <Text style={styles.wowEmoji}>{getEmotionSymbol(emotion)}</Text>
            <View style={styles.wowTextWrap}>
              <Text style={styles.wowTitle}>{moodShiftLabel}</Text>
              <Text style={styles.wowSubtitle}>{moodTrend}</Text>
            </View>
          </View>

          {/* Captured Image */}
          {image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.capturedImage} />
            </View>
          )}

          {/* Confidence */}
          {confidence > 0 && (
            <View style={styles.confidenceSection}>
              <View style={styles.confidenceHeader}>
                <Text style={styles.confidenceLabel}>AI Confidence</Text>
                <Text style={[styles.confidencePercent, { color: getConfidenceColor(confidence) }]}>
                  {confidence}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${confidence}%`,
                      backgroundColor: getConfidenceColor(confidence),
                    },
                  ]}
                />
              </View>
              <Text style={styles.confidenceBadge}>{getConfidenceLabel(confidence)}</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{confidence > 0 ? 'AI' : 'Demo'}</Text>
              <Text style={styles.statLabel}>Mode</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{confidence > 0 ? 'Real' : 'Simulated'}</Text>
              <Text style={styles.statLabel}>Analysis</Text>
            </View>
          </View>

          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Mood Memory</Text>
              <Text style={styles.historyMeta}>{historySaved ? 'Saved' : 'Saving...'}</Text>
            </View>

            {previousEmotion ? (
              <View style={styles.previousEmotionCard}>
                <Text style={styles.previousLabel}>Previous emotion</Text>
                <View style={styles.previousRow}>
                  <Text style={styles.previousEmoji}>{getEmotionSymbol(previousEmotion.emotion)}</Text>
                  <View style={styles.previousTextWrap}>
                    <Text style={styles.previousEmotionName}>
                      {previousEmotion.emotion.charAt(0).toUpperCase() + previousEmotion.emotion.slice(1)}
                    </Text>
                    <Text style={styles.previousDetails}>
                      {previousEmotion.confidence}% confidence · {formatRelativeTime(previousEmotion.timestamp)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.previousEmotionCard}>
                <Text style={styles.previousLabel}>Previous emotion</Text>
                <Text style={styles.previousDetails}>No prior capture yet. The next analysis will build your mood memory.</Text>
              </View>
            )}

            {recentHistory.length > 0 && (
              <View style={styles.timelineWrap}>
                {recentHistory.map((item) => (
                  <View key={item.id} style={styles.timelineRow}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineEmotion}>
                        {getEmotionSymbol(item.emotion)} {item.emotion.charAt(0).toUpperCase() + item.emotion.slice(1)}
                      </Text>
                      <Text style={styles.timelineMeta}>
                        {item.confidence}% confidence · {formatRelativeTime(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animatable.View>

        {/* Action Buttons */}
        <Animatable.View animation="fadeInUp" delay={700} style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => navigation.navigate('Camera')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionText}>Analyze Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.musicAction}
            onPress={() => navigation.navigate('MusicRecommendations', { emotion, confidence })}
            activeOpacity={0.85}
          >
            <Text style={styles.musicActionText}>Get Song Recommendations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryActionText}>Back to Home</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SAFE_TOP,
    paddingBottom: SPACING.xxxxl,
    paddingHorizontal: SPACING.xl,
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backIcon: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: FONT.bold,
    marginRight: SPACING.sm,
  },
  backLabel: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: FONT.semibold,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  tagText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: FONT.bold,
    letterSpacing: 0.5,
  },
  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  emojiHero: {
    fontSize: 80,
    marginBottom: SPACING.xl,
  },
  emotionMessage: {
    fontSize: 26,
    fontWeight: FONT.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.3,
  },
  emotionDescription: {
    fontSize: 15,
    color: COLORS.textWhiteMuted,
    textAlign: 'center',
    fontWeight: FONT.medium,
  },
  // Result card
  resultCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    marginBottom: SPACING.xxl,
    ...SHADOW.xl,
  },
  emotionLabelRow: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  detectedLabel: {
    fontSize: 13,
    fontWeight: FONT.semibold,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  emotionName: {
    fontSize: 28,
    fontWeight: FONT.extrabold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  wowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  wowEmoji: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  wowTextWrap: {
    flex: 1,
  },
  wowTitle: {
    fontSize: 15,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  wowSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  imageContainer: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    ...SHADOW.sm,
  },
  capturedImage: {
    width: '100%',
    height: 200,
  },
  // Confidence
  confidenceSection: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: FONT.semibold,
    color: COLORS.textSecondary,
  },
  confidencePercent: {
    fontSize: 22,
    fontWeight: FONT.extrabold,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceBadge: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: FONT.medium,
    textAlign: 'right',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statValue: {
    fontSize: 16,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: FONT.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  historySection: {
    marginTop: SPACING.xl,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
  },
  historyMeta: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: FONT.semibold,
  },
  previousEmotionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
  },
  previousLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: COLORS.textTertiary,
    fontWeight: FONT.bold,
    marginBottom: SPACING.sm,
  },
  previousRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previousEmoji: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  previousTextWrap: {
    flex: 1,
  },
  previousEmotionName: {
    fontSize: 16,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  previousDetails: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  timelineWrap: {
    gap: SPACING.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginRight: SPACING.md,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: SPACING.xs,
  },
  timelineEmotion: {
    fontSize: 14,
    fontWeight: FONT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  timelineMeta: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  // Actions
  actionsSection: {
    gap: SPACING.md,
  },
  primaryAction: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOW.md,
  },
  primaryActionText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: FONT.bold,
  },
  secondaryAction: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryActionText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: FONT.semibold,
  },
  musicAction: {
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOW.md,
  },
  musicActionText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: FONT.bold,
  },
});
