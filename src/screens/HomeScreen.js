import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as Animatable from 'react-native-animatable';
import { COLORS, SPACING, RADIUS, FONT, SHADOW, SAFE_TOP } from '../theme';
import {
  clearEmotionHistory,
  formatRelativeTime,
  getEmotionHistory,
  getEmotionCategory,
  getEmotionSymbol,
  getMoodShiftLabel,
  getEmotionTrendInsight,
} from '../utils/emotionHistory';
import { getRecommendationFeedbackStats } from '../utils/recommendationFeedback';

const { width } = Dimensions.get('window');

const STEPS = [
  { number: '01', title: 'Capture', desc: 'Take a photo using your camera', icon: '📸' },
  { number: '02', title: 'Analyze', desc: 'AI detects your facial expression', icon: '🧠' },
  { number: '03', title: 'Discover', desc: 'Get your emotional insight', icon: '✨' },
];

export default function HomeScreen({ navigation }) {
  const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'there';
  const userId = auth.currentUser?.uid || 'guest';
  const [history, setHistory] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ total: 0, matchRate: 0 });

  const latestEntry = history[0] || null;
  const previousEntry = history[1] || null;
  const trendEntries = useMemo(() => [...history].slice(0, 6).reverse(), [history]);
  const trendValues = useMemo(() => {
    return trendEntries.map((item) => {
      const category = getEmotionCategory(item.emotion);
      if (category === 'positive') return 88;
      if (category === 'neutral') return 55;
      return 22;
    });
  }, [trendEntries]);
  const moodInsight = useMemo(() => {
    if (!latestEntry) {
      return 'Capture your first emotion to start a private mood memory.';
    }

    if (!previousEntry) {
      return 'This is your first recorded mood. The next capture will reveal your emotional trend.';
    }

    return getMoodShiftLabel(previousEntry.emotion, latestEntry.emotion);
  }, [latestEntry, previousEntry]);
  const aiInsight = useMemo(() => getEmotionTrendInsight(history), [history]);

  const loadMoodHistory = async () => {
    const records = await getEmotionHistory(userId);
    setHistory(records.slice(0, 5));
  };

  const loadFeedbackStats = async () => {
    const stats = await getRecommendationFeedbackStats(userId);
    setFeedbackStats(stats);
  };

  const getTrendValue = (emotion) => {
    const category = getEmotionCategory(emotion);
    if (category === 'positive') return 90;
    if (category === 'neutral') return 55;
    return 20;
  };

  const getTrendLabel = (emotion) => {
    const category = getEmotionCategory(emotion);
    if (category === 'positive') return 'High';
    if (category === 'neutral') return 'Mid';
    return 'Low';
  };

  const buildTrendSegments = () => {
    if (trendValues.length < 2) return [];

    const chartWidth = 260;
    const chartHeight = 140;
    const paddingTop = 10;
    const paddingBottom = 18;
    const availableHeight = chartHeight - paddingTop - paddingBottom;
    const stepX = trendValues.length === 1 ? 0 : chartWidth / (trendValues.length - 1);

    const points = trendValues.map((value, index) => {
      const x = index * stepX;
      const y = paddingTop + availableHeight - (availableHeight * value) / 100;
      return { x, y };
    });

    return points.slice(0, -1).map((point, index) => {
      const nextPoint = points[index + 1];
      const dx = nextPoint.x - point.x;
      const dy = nextPoint.y - point.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      return {
        left: point.x,
        top: point.y,
        width: length,
        rotate: angle,
      };
    });
  };

  useEffect(() => {
    loadMoodHistory();
    loadFeedbackStats();
    const unsubscribe = navigation.addListener('focus', loadMoodHistory);
    const unsubscribeFeedback = navigation.addListener('focus', loadFeedbackStats);
    return () => {
      unsubscribe();
      unsubscribeFeedback();
    };
  }, [navigation, userId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // silently handle
    }
  };

  const handleClearHistory = async () => {
    await clearEmotionHistory(userId);
    setHistory([]);
    Alert.alert('Mood history cleared', 'Your saved emotion history has been removed from this device.');
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}</Text>
            <Text style={styles.greetingSub}>How are you feeling today?</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutPill} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <Animatable.View animation="fadeIn" duration={1000} style={styles.heroSection}>
          <View style={styles.heroCard}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroTextArea}>
                  <Text style={styles.heroTitle}>Emotion{'\n'}Detection</Text>
                  <Text style={styles.heroSubtitle}>
                    Powered by AI facial analysis
                  </Text>
                </View>
                <View style={styles.heroEmojiContainer}>
                  <Text style={styles.heroEmoji}>🎭</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animatable.View>

        {/* Mood Snapshot */}
        <Animatable.View animation="fadeInUp" delay={220} duration={800}>
          <View style={styles.snapshotCard}>
            <View style={styles.snapshotHeader}>
              <View>
                <Text style={styles.snapshotTitle}>Mood Snapshot</Text>
                <Text style={styles.snapshotSubtitle}>Private history stored on this device</Text>
              </View>
              <TouchableOpacity
                onPress={handleClearHistory}
                disabled={history.length === 0}
                style={[styles.clearButton, history.length === 0 && styles.clearButtonDisabled]}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {latestEntry ? (
              <>
                <View style={styles.snapshotHeroRow}>
                  <View style={styles.snapshotEmojiWrap}>
                    <Text style={styles.snapshotEmoji}>{getEmotionSymbol(latestEntry.emotion)}</Text>
                  </View>
                  <View style={styles.snapshotCopy}>
                    <Text style={styles.snapshotMood}>{latestEntry.emotion.charAt(0).toUpperCase() + latestEntry.emotion.slice(1)}</Text>
                    <Text style={styles.snapshotMeta}>
                      Last updated {formatRelativeTime(latestEntry.timestamp)} · {latestEntry.confidence}% confidence
                    </Text>
                    <Text style={styles.snapshotInsight}>{moodInsight}</Text>
                  </View>
                </View>

                <View style={styles.snapshotStatsRow}>
                  <View style={styles.snapshotStat}>
                    <Text style={styles.snapshotStatValue}>{history.length}</Text>
                    <Text style={styles.snapshotStatLabel}>Captures</Text>
                  </View>
                  <View style={styles.snapshotDivider} />
                  <View style={styles.snapshotStat}>
                    <Text style={styles.snapshotStatValue}>{previousEntry ? getEmotionSymbol(previousEntry.emotion) : '—'}</Text>
                    <Text style={styles.snapshotStatLabel}>Previous</Text>
                  </View>
                  <View style={styles.snapshotDivider} />
                  <View style={styles.snapshotStat}>
                    <Text style={styles.snapshotStatValue}>{previousEntry ? previousEntry.emotion.charAt(0).toUpperCase() + previousEntry.emotion.slice(1) : 'None'}</Text>
                    <Text style={styles.snapshotStatLabel}>Last before</Text>
                  </View>
                  <View style={styles.snapshotDivider} />
                  <View style={styles.snapshotStat}>
                    <Text style={styles.snapshotStatValue}>{feedbackStats.matchRate}%</Text>
                    <Text style={styles.snapshotStatLabel}>Match rate</Text>
                  </View>
                </View>
                <Text style={styles.feedbackMiniText}>
                  {feedbackStats.total > 0
                    ? `Based on ${feedbackStats.total} recommendation feedback entries.`
                    : 'Your recommendation match rate will appear after you rate a playlist.'}
                </Text>

                <View style={styles.historyTrail}>
                  {history.slice(0, 3).map((item) => (
                    <View key={item.id} style={styles.historyChip}>
                      <Text style={styles.historyChipEmoji}>{getEmotionSymbol(item.emotion)}</Text>
                      <View style={styles.historyChipTextWrap}>
                        <Text style={styles.historyChipTitle}>{item.emotion.charAt(0).toUpperCase() + item.emotion.slice(1)}</Text>
                        <Text style={styles.historyChipMeta}>{formatRelativeTime(item.timestamp)}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.trendSection}>
                  <View style={styles.trendHeader}>
                    <Text style={styles.trendTitle}>Mood Trend</Text>
                    <Text style={styles.trendSubtitle}>Last {trendEntries.length} captures</Text>
                  </View>

                  <View style={styles.lineChartWrap}>
                    <View style={styles.lineChartGrid}>
                      <View style={styles.lineGridLine} />
                      <View style={styles.lineGridLine} />
                      <View style={styles.lineGridLine} />
                    </View>

                    <View style={styles.lineChartArea}>
                      {buildTrendSegments().map((segment, index) => (
                        <View
                          key={`segment-${trendEntries[index]?.id || index}`}
                          style={[
                            styles.lineSegment,
                            {
                              left: segment.left,
                              top: segment.top,
                              width: segment.width,
                              transform: [{ rotate: `${segment.rotate}deg` }],
                              backgroundColor: trendValues[index + 1] >= trendValues[index] ? COLORS.success : COLORS.accent,
                            },
                          ]}
                        />
                      ))}

                      {trendValues.map((value, index) => {
                        const chartWidth = 260;
                        const chartHeight = 140;
                        const paddingTop = 10;
                        const paddingBottom = 18;
                        const availableHeight = chartHeight - paddingTop - paddingBottom;
                        const stepX = trendValues.length === 1 ? 0 : chartWidth / (trendValues.length - 1);
                        const x = index * stepX;
                        const y = paddingTop + availableHeight - (availableHeight * value) / 100;
                        const item = trendEntries[index];

                        return (
                          <View key={item.id} style={[styles.linePointWrap, { left: x, top: y }]}>
                            <View
                              style={[
                                styles.linePoint,
                                {
                                  backgroundColor:
                                    getEmotionCategory(item.emotion) === 'positive'
                                      ? COLORS.success
                                      : getEmotionCategory(item.emotion) === 'neutral'
                                        ? COLORS.warning
                                        : COLORS.error,
                                },
                              ]}
                            />
                            <Text style={styles.linePointEmoji}>{getEmotionSymbol(item.emotion)}</Text>
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.lineChartLabels}>
                      {trendEntries.map((item) => (
                        <View key={`label-${item.id}`} style={styles.lineChartLabelItem}>
                          <Text style={styles.lineChartLabelEmoji}>{getEmotionSymbol(item.emotion)}</Text>
                          <Text style={styles.lineChartLabelText}>{getTrendLabel(item.emotion)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <Text style={styles.aiInsightText}>{aiInsight}</Text>
                </View>
              </>
            ) : (
              <View style={styles.emptySnapshot}>
                <Text style={styles.emptySnapshotTitle}>No mood history yet</Text>
                <Text style={styles.emptySnapshotText}>
                  Capture once and EmoTrack will remember the last emotion so you can compare it next time.
                </Text>
              </View>
            )}
          </View>
        </Animatable.View>

        {/* How It Works */}
        <Animatable.View animation="fadeInUp" delay={380} duration={800}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsCard}>
            {STEPS.map((step, index) => (
              <View key={step.number} style={[styles.stepRow, index < STEPS.length - 1 && styles.stepBorder]}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepIcon}>{step.icon}</Text>
                </View>
                <View style={styles.stepTextArea}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                <Text style={styles.stepNumber}>{step.number}</Text>
              </View>
            ))}
          </View>
        </Animatable.View>

        {/* Start Button */}
        <Animatable.View animation="fadeInUp" delay={500} duration={800} style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Camera')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Start Detection</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Harmony v1.0 — Built with care</Text>
        </View>
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
    paddingTop: SAFE_TOP + 10,
    paddingBottom: SPACING.xxxxl,
    paddingHorizontal: SPACING.xl,
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  greeting: {
    fontSize: 22,
    fontWeight: FONT.bold,
    color: COLORS.textWhite,
    marginBottom: 2,
  },
  greetingSub: {
    fontSize: 14,
    color: COLORS.textWhiteMuted,
    fontWeight: FONT.medium,
  },
  logoutPill: {
    backgroundColor: COLORS.overlayLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  logoutText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: FONT.semibold,
  },
  // Hero
  heroSection: {
    marginBottom: SPACING.xxxl,
  },
  snapshotCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.xxxl,
    ...SHADOW.lg,
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  snapshotTitle: {
    fontSize: 18,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  snapshotSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  clearButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  clearButtonDisabled: {
    opacity: 0.45,
  },
  clearButtonText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: FONT.bold,
  },
  snapshotHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  snapshotEmojiWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  snapshotEmoji: {
    fontSize: 34,
  },
  snapshotCopy: {
    flex: 1,
  },
  snapshotMood: {
    fontSize: 22,
    fontWeight: FONT.extrabold,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  snapshotMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  snapshotInsight: {
    fontSize: 13,
    color: COLORS.primaryDark,
    lineHeight: 18,
    fontWeight: FONT.medium,
  },
  snapshotStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  snapshotStat: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotStatValue: {
    fontSize: 15,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  snapshotStatLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  feedbackMiniText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  snapshotDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  historyTrail: {
    gap: SPACING.sm,
  },
  trendSection: {
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  trendTitle: {
    fontSize: 15,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
  },
  trendSubtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: FONT.medium,
  },
  lineChartWrap: {
    width: '100%',
    alignItems: 'center',
  },
  lineChartGrid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 34,
    justifyContent: 'space-between',
  },
  lineGridLine: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.2)',
  },
  lineChartArea: {
    width: 260,
    height: 140,
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  lineSegment: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    transformOrigin: '0 50%',
  },
  linePointWrap: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  linePoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOW.sm,
  },
  linePointEmoji: {
    fontSize: 16,
    marginTop: 2,
  },
  lineChartLabels: {
    width: 260,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  lineChartLabelItem: {
    alignItems: 'center',
    flex: 1,
  },
  lineChartLabelEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  lineChartLabelText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: FONT.medium,
  },
  aiInsightText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.primaryDark,
    fontWeight: FONT.medium,
    textAlign: 'center',
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  historyChipEmoji: {
    fontSize: 22,
    marginRight: SPACING.md,
  },
  historyChipTextWrap: {
    flex: 1,
  },
  historyChipTitle: {
    fontSize: 14,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  historyChipMeta: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  emptySnapshot: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptySnapshotTitle: {
    fontSize: 16,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySnapshotText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  heroCard: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOW.lg,
  },
  heroGradient: {
    padding: SPACING.xxl,
    minHeight: 180,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextArea: {
    flex: 1,
    paddingRight: SPACING.lg,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: FONT.extrabold,
    color: COLORS.textWhite,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textWhiteMuted,
    fontWeight: FONT.medium,
    lineHeight: 20,
  },
  heroEmojiContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 40,
  },
  // Steps
  sectionTitle: {
    fontSize: 18,
    fontWeight: FONT.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.lg,
    letterSpacing: 0.2,
  },
  stepsCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.xxxl,
    ...SHADOW.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  stepBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  stepIcon: {
    fontSize: 20,
  },
  stepTextArea: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: FONT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: FONT.regular,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: FONT.bold,
    color: COLORS.primaryLight,
    opacity: 0.5,
  },
  // CTA
  ctaSection: {
    marginBottom: SPACING.xxxl,
  },
  ctaButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.colored(COLORS.accent),
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: SPACING.xxl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: FONT.bold,
    letterSpacing: 0.3,
  },
  ctaArrow: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: FONT.bold,
    marginLeft: SPACING.md,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: FONT.medium,
  },
});
