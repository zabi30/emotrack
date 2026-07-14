import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { COLORS, SPACING, RADIUS, FONT, SHADOW, SAFE_TOP } from '../theme';

const APP_LOGO = require('../../assets/logo.png');
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Missing Information', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject({ code: 'auth/request-timeout' });
        }, 60000);
      });

      await Promise.race([
        signInWithEmailAndPassword(auth, normalizedEmail, password),
        timeoutPromise,
      ]);
    } catch (error) {
      let message = 'Something went wrong. Please try again.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      else if (error.code === 'auth/invalid-email') message = 'Please enter a valid email.';
      else if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please try again later.';
      else if (error.code === 'auth/invalid-credential') message = 'Invalid email or password.';
      else if (error.code === 'auth/network-request-failed') message = 'Network error. Please check your internet connection.';
      else if (error.code === 'auth/request-timeout') message = 'Sign-in request timed out from this device. Try switching network (mobile data/hotspot), disable VPN/proxy, then retry.';
      else if (error.code === 'auth/operation-not-allowed') message = 'Email/password login is not enabled in Firebase Console.';
      else if (error.code) message = `${message}\n\nError code: ${error.code}`;
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (resetLoading) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert('Email Required', 'Please enter your email first, then tap Forgot password.');
      return;
    }

    try {
      setResetLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 25000);

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: normalizedEmail,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        const serverCode = data?.error?.message || 'UNKNOWN';
        throw { code: `rest/${serverCode}` };
      }

      Alert.alert('Reset Email Sent', 'If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.');
    } catch (error) {
      let message = 'Unable to send reset email. Please try again.';
      if (error?.name === 'AbortError') {
        Alert.alert(
          'Request Delayed',
          'The network is slow right now. If an account exists for this email, the reset email may still arrive shortly. Please check inbox/spam and try again after a minute.'
        );
        return;
      } else if (error.code === 'rest/EMAIL_NOT_FOUND' || error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'rest/INVALID_EMAIL' || error.code === 'auth/invalid-email') message = 'Please enter a valid email.';
      else if (error.code === 'rest/TOO_MANY_ATTEMPTS_TRY_LATER' || error.code === 'auth/too-many-requests') message = 'Too many reset requests. Please wait and try again.';
      else if (error.code === 'rest/OPERATION_NOT_ALLOWED' || error.code === 'auth/operation-not-allowed') message = 'Password reset is not enabled in Firebase Console.';
      else if (error.code === 'auth/network-request-failed') message = 'Network error. Please check your internet connection.';
      else if (error.code === 'auth/user-disabled') message = 'This account has been disabled.';
      else if (error.code === 'auth/unauthorized-continue-uri') message = 'Password reset URL is not authorized in Firebase.';
      else if (error.code === 'auth/invalid-continue-uri') message = 'Password reset URL is invalid in Firebase settings.';
      else if (error.code === 'auth/missing-continue-uri') message = 'Password reset URL is missing in Firebase settings.';
      else if (error.code === 'auth/admin-restricted-operation') message = 'Password reset is restricted by Firebase project settings.';
      else if (error.code) message = `${message}\n\nError code: ${error.code}`;
      Alert.alert('Password Reset Failed', message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Brand Header */}
          <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoFrame}>
                <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" />
              </View>
            </View>
            <Text style={styles.brandName}>Harmony</Text>
            <Text style={styles.tagline}>Emotion Intelligence, Simplified</Text>
          </Animatable.View>

          {/* Form Card */}
          <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.formCard}>
            <Text style={styles.formTitle}>Welcome back</Text>
            <Text style={styles.formSubtitle}>Sign in to your account</Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'email' && styles.inputFocused
              ]}>
                <Text style={styles.inputIcon}>✉</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.forgotText}>{resetLoading ? 'Sending...' : 'Forgot password?'}</Text>
                </TouchableOpacity>
              </View>
              <View style={[
                styles.inputContainer,
                focusedInput === 'password' && styles.inputFocused
              ]}>
                <Text style={styles.inputIcon}>🔐</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={loading ? ['#94A3B8', '#94A3B8'] : [COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.footerLink}>Create one</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SAFE_TOP + 20,
    paddingBottom: SPACING.xxxxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
    ...SHADOW.lg,
  },
  logoFrame: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.xl,
  },
  brandName: {
    fontSize: 36,
    fontWeight: FONT.extrabold,
    color: COLORS.textWhite,
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textWhiteMuted,
    fontWeight: FONT.medium,
    letterSpacing: 0.3,
  },
  formCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    ...SHADOW.xl,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  inputGroup: {
    marginBottom: SPACING.xl,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: FONT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    height: 52,
  },
  inputFocused: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: FONT.medium,
  },
  toggleText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: FONT.semibold,
    marginLeft: SPACING.sm,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: FONT.semibold,
    marginBottom: SPACING.sm,
  },
  primaryButton: {
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    overflow: 'hidden',
    ...SHADOW.colored(COLORS.primary),
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: FONT.bold,
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: FONT.medium,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: FONT.bold,
  },
});
