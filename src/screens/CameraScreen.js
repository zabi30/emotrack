import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { detectEmotion } from '../utils/emotionDetector';
import { COLORS, SPACING, RADIUS, FONT, SHADOW, SAFE_TOP } from '../theme';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState('front');
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);

  const captureAndAnalyze = async () => {
    if (!cameraRef.current) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      const result = await detectEmotion(photo.uri, photo.base64);
      const emotion = typeof result === 'string' ? result : result.emotion;
      const confidence = typeof result === 'object' ? result.confidence : 0;

      navigation.navigate('EmotionResult', {
        emotion,
        confidence,
        image: photo.uri,
      });
    } catch (error) {
      Alert.alert('Analysis Failed', 'Could not analyze your expression. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.centeredContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionCard}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            We need your camera to detect facial expressions. Your photos are processed on-device and never stored.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <LinearGradient
          colors={['rgba(15,23,42,0.7)', 'transparent', 'transparent', 'rgba(15,23,42,0.8)']}
          locations={[0, 0.25, 0.65, 1]}
          style={styles.overlay}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backPill}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.backIcon}>←</Text>
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>
            <View style={styles.liveBadge}>
              <View style={styles.liveIndicator} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {/* Face Guide */}
          <View style={styles.centerContent}>
            <Animatable.View
              animation="pulse"
              iterationCount="infinite"
              duration={2500}
              style={styles.faceGuide}
            >
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </Animatable.View>
            <Text style={styles.guideText}>Position your face in the frame</Text>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomBar}>
            {isProcessing ? (
              <Animatable.View animation="fadeIn" style={styles.processingContainer}>
                <ActivityIndicator size="large" color={COLORS.white} />
                <Text style={styles.processingText}>Analyzing expression…</Text>
              </Animatable.View>
            ) : (
              <View style={styles.captureArea}>
                <Text style={styles.instructionText}>Ensure good lighting and a clear view of your face</Text>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={captureAndAnalyze}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.accent, COLORS.accentLight]}
                    style={styles.captureButtonGradient}
                  >
                    <View style={styles.captureButtonInner} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const GUIDE_SIZE = width * 0.65;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  // Top bar
  topBar: {
    paddingTop: SAFE_TOP,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginRight: SPACING.sm,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: FONT.bold,
    letterSpacing: 1,
  },
  // Center - face guide
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: GUIDE_SIZE,
    height: GUIDE_SIZE * 1.2,
    borderRadius: GUIDE_SIZE * 0.5,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.white,
    borderTopLeftRadius: GUIDE_SIZE * 0.5,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.white,
    borderTopRightRadius: GUIDE_SIZE * 0.5,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.white,
    borderBottomLeftRadius: GUIDE_SIZE * 0.5,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.white,
    borderBottomRightRadius: GUIDE_SIZE * 0.5,
  },
  guideText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: FONT.medium,
    marginTop: SPACING.xl,
    textAlign: 'center',
  },
  // Bottom
  bottomBar: {
    paddingBottom: SPACING.xxxxl + 10,
    alignItems: 'center',
  },
  captureArea: {
    alignItems: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
    fontWeight: FONT.medium,
    paddingHorizontal: SPACING.xxxl,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  captureButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.white,
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: SPACING.lg,
    fontWeight: FONT.semibold,
    letterSpacing: 0.2,
  },
  // Permission screen
  permissionCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxxl,
    alignItems: 'center',
    width: '100%',
    ...SHADOW.xl,
  },
  permissionEmoji: {
    fontSize: 48,
    marginBottom: SPACING.xl,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  permissionButton: {
    width: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.colored(COLORS.primary),
  },
  permissionButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: FONT.bold,
  },
  goBackButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  goBackText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontWeight: FONT.semibold,
  },
});
