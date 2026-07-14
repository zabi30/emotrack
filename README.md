# Harmony - Public Distribution Guide

Harmony is an Expo React Native app for facial emotion capture and analysis with Firebase auth.

## Features

- Email/password authentication with Firebase
- Camera-based emotion capture
- Emotion result visualization

## Requirements

- Node.js 18+
- npm 9+
- Expo account

## 1) Install

```bash
npm install
```

## 2) Configure environment

Copy [.env.example](.env.example) to `.env` and fill all required values.

Required variables:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Optional AI provider variables are listed in [.env.example](.env.example).

## 3) Firebase setup

1. Create Firebase project.
2. Enable Authentication providers:
   - Email/Password
3. Add Android/iOS app entries in Firebase.
4. Keep [google-services.json](google-services.json) aligned with your Firebase Android app.

## 4) Run locally

```bash
npx expo start -c
```

## 5) Public build and distribution

1. Log in:
   ```bash
   npx expo login
   ```
2. Configure EAS project:
   ```bash
   npx eas init
   ```
3. Build:
   ```bash
   npx eas build -p android
   npx eas build -p ios
   ```
4. Submit:
   ```bash
   npx eas submit -p android
   npx eas submit -p ios
   ```

## Security checklist before publishing

- No real keys committed in source files.
- `.env` is not committed.
- Firebase rules reviewed for public app usage.
- Google OAuth consent screen set to Production.
- Face++ (or other AI provider) keys rotated if they were ever exposed.

## Notes

- This app uses Expo-managed workflow.
- Google sign-in in Expo Go uses Expo proxy redirect URI.
- For production store builds, keep OAuth/Firebase package IDs consistent.
