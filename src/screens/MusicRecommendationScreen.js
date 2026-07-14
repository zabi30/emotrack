import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text, 
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Animatable from 'react-native-animatable';
import { fetchSongRecommendations, getMusicProfileForEmotion } from '../utils/musicRecommender';
import { auth } from '../config/firebase';
import { getRecommendationFeedbackStats, recordRecommendationFeedback } from '../utils/recommendationFeedback';
import { COLORS, SPACING, RADIUS, FONT, SHADOW, SAFE_TOP } from '../theme';

export default function MusicRecommendationScreen({ navigation, route }) {
  const { emotion = 'neutral', confidence = 0 } = route.params || {};
  const profile = getMusicProfileForEmotion(emotion);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [songs, setSongs] = useState([]);
  const [activeSongId, setActiveSongId] = useState(null);
  const [activeSong, setActiveSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [matchRate, setMatchRate] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const soundRef = useRef(null);
  const seenSongIdsRef = useRef(new Set());
  const currentUserId = auth.currentUser?.uid || 'guest';

  useEffect(() => {
    let mounted = true;

    const loadRecommendations = async () => {
      try {
        const result = await fetchSongRecommendations(emotion, {
          excludeSongIds: Array.from(seenSongIdsRef.current),
          limit: 8,
          requestId: Date.now(),
        });
        if (mounted) {
          setSongs(result.songs);
          result.songs.forEach((song) => seenSongIdsRef.current.add(String(song.id)));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadFeedbackStats = async () => {
      const stats = await getRecommendationFeedbackStats(currentUserId);
      if (mounted) {
        setMatchRate(stats.matchRate);
        setFeedbackCount(stats.total);
      }
    };

    loadRecommendations();
    loadFeedbackStats();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [emotion]);

  const refreshRecommendations = async () => {
    setRefreshing(true);
    try {
      const result = await fetchSongRecommendations(emotion, {
        excludeSongIds: Array.from(seenSongIdsRef.current),
        limit: 8,
        requestId: Date.now(),
      });

      if (result.songs.length === 0) {
        seenSongIdsRef.current.clear();
        const fallbackResult = await fetchSongRecommendations(emotion, {
          limit: 8,
          requestId: Date.now(),
        });
        setSongs(fallbackResult.songs);
        fallbackResult.songs.forEach((song) => seenSongIdsRef.current.add(String(song.id)));
      } else {
        setSongs(result.songs);
        result.songs.forEach((song) => seenSongIdsRef.current.add(String(song.id)));
      }
    } finally {
      setRefreshing(false);
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setActiveSongId(null);
    setActiveSong(null);
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(0);
  };

  const togglePlayback = async (song) => {
    if (!song.previewUrl) {
      if (song.trackViewUrl) {
        Linking.openURL(song.trackViewUrl);
      }
      return;
    }

    if (activeSongId === song.id && soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    await stopPlayback();
    const { sound } = await Audio.Sound.createAsync(
      { uri: song.previewUrl },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setActiveSongId(song.id);
    setActiveSong(song);
    setIsPlaying(true);

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        return;
      }

      setPositionMillis(status.positionMillis || 0);
      setDurationMillis(status.durationMillis || 0);
      setIsPlaying(status.isPlaying || false);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPositionMillis(0);
      }
    });
  };

  const progress = durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;

  const formatTime = (millis) => {
    const totalSeconds = Math.floor((millis || 0) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const handleRecommendationFeedback = async (match) => {
    const updated = await recordRecommendationFeedback(currentUserId, {
      emotion,
      match,
      activeSongId,
      activeSongTitle: activeSong?.title || null,
    });
    setFeedbackCount(updated.length);
    const stats = await getRecommendationFeedbackStats(currentUserId);
    setMatchRate(stats.matchRate);

    if (match === false) {
      await refreshRecommendations();
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#111827', '#1E293B']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Recommended for your mood</Text>
          <Text style={styles.subtitle}>
            {profile.title} · {emotion} · {confidence}% confidence
          </Text>
          <Text style={styles.feedbackMini}>Match rate: {matchRate}% · {feedbackCount} feedback entries</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshRecommendations} disabled={refreshing}>
          <Text style={styles.refreshText}>{refreshing ? 'Refreshing...' : 'New Songs'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Finding songs that match your state...</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <Animatable.View animation="fadeInUp" delay={index * 60} style={styles.songCard}>
              <Image
                source={{ uri: item.artwork || 'https://via.placeholder.com/120' }}
                style={styles.artwork}
              />
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                <Text style={styles.songGenre}>{item.genre || profile.title}</Text>
              </View>
              <TouchableOpacity style={styles.playButton} onPress={() => togglePlayback(item)}>
                <Text style={styles.playButtonText}>{activeSongId === item.id ? 'Stop' : 'Play'}</Text>
              </TouchableOpacity>
            </Animatable.View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No preview tracks available</Text>
              <Text style={styles.emptyText}>Try again or open the song listing in your browser.</Text>
            </View>
          }
        />
      )}

      {activeSong && (
        <View style={styles.playerShell}>
          <View style={styles.playerHeader}>
            <Image source={{ uri: activeSong.artwork || 'https://via.placeholder.com/120' }} style={styles.playerArtwork} />
            <View style={styles.playerInfo}>
              <Text style={styles.playerTitle} numberOfLines={1}>{activeSong.title}</Text>
              <Text style={styles.playerArtist} numberOfLines={1}>{activeSong.artist}</Text>
            </View>
            <TouchableOpacity style={styles.playerButton} onPress={() => togglePlayback(activeSong)}>
              <Text style={styles.playerButtonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playerStopButton} onPress={stopPlayback}>
              <Text style={styles.playerStopText}>Stop</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.playerTimes}>
            <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
            <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
          </View>

          <View style={styles.feedbackBlock}>
            <Text style={styles.feedbackPrompt}>Do these recommendations match your mood?</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity style={styles.feedbackYesButton} onPress={() => handleRecommendationFeedback(true)}>
                <Text style={styles.feedbackYesText}>Yes, good match</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.feedbackNoButton} onPress={() => handleRecommendationFeedback(false)}>
                <Text style={styles.feedbackNoText}>Not really</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('Camera')}>
          <Text style={styles.primaryActionText}>Detect Again</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: SAFE_TOP + SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.full,
  },
  backText: {
    color: COLORS.white,
    fontWeight: FONT.semibold,
  },
  headerCopy: {
    gap: 6,
  },
  title: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: FONT.extrabold,
  },
  subtitle: {
    color: COLORS.textWhiteMuted,
    fontSize: 14,
    fontWeight: FONT.medium,
  },
  feedbackMini: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  refreshText: {
    color: COLORS.white,
    fontWeight: FONT.semibold,
    fontSize: 13,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  loadingText: {
    color: COLORS.textWhiteMuted,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xxl,
    padding: SPACING.md,
    ...SHADOW.md,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.border,
  },
  songInfo: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
  },
  songArtist: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  songGenre: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  playButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
  },
  playButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: FONT.bold,
  },
  emptyState: {
    padding: SPACING.xxl,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xxl,
    marginHorizontal: SPACING.xl,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: FONT.bold,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  playerShell: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: SPACING.md,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerArtwork: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.border,
  },
  playerInfo: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  playerTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: FONT.bold,
  },
  feedbackBlock: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  feedbackPrompt: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: FONT.semibold,
    marginBottom: SPACING.sm,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  feedbackYesButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    paddingVertical: 12,
  },
  feedbackYesText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: FONT.bold,
  },
  feedbackNoButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    paddingVertical: 12,
  },
  feedbackNoText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: FONT.bold,
  },
  playerArtist: {
    color: COLORS.textWhiteMuted,
    fontSize: 12,
    marginTop: 2,
  },
  playerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
  },
  playerButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: FONT.bold,
  },
  playerStopButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
  },
  playerStopText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: FONT.semibold,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  playerTimes: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: COLORS.textWhiteMuted,
    fontSize: 11,
    fontWeight: FONT.medium,
  },
  footerActions: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SAFE_TOP + SPACING.md,
  },
  primaryAction: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    paddingVertical: 16,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: FONT.bold,
  },
});
