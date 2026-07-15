# Harmony

Harmony is a cross-platform mobile application built with React Native and Expo that captures facial expressions and analyzes emotions using AI. The app provides a simple and secure authentication system with Firebase and presents emotion analysis results through an intuitive user interface.

Watch a quick walkthrough of Emotrack in action:

[ Click here to view the demo](https://drive.google.com/file/d/1dsSDEGxuODH1y7XOcl0gupRXJLXtcRa9/view?usp=sharing)


## Features

- User authentication with Firebase
- Facial emotion detection using the device camera
- Emotion analysis and visualization
- Secure configuration using environment variables
- Cross-platform support (Android and iOS)
- Built with Expo Managed Workflow

## Tech Stack

- React Native
- Expo
- Firebase Authentication
- JavaScript
- AI Emotion Recognition API

## Project Structure

```
.
├── assets/
├── src/
│   ├── components/
│   ├── config/
│   ├── screens/
│   └── utils/
├── App.js
├── app.json
├── package.json
├── babel.config.js
└── README.md
```

## Prerequisites

Before running the project, make sure you have:

- Node.js 18 or later
- npm
- Expo CLI (optional)
- Firebase project

## Installation

Clone the repository:

```bash
git clone https://github.com/your-username/harmony.git
```

Navigate to the project directory:

```bash
cd harmony
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root by copying `.env.example`.

```bash
cp .env.example .env
```

Configure the following Firebase variables:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

If you're using an external AI provider for emotion detection, add the required API credentials as documented in `.env.example`.

## Firebase Setup

1. Create a Firebase project.
2. Enable **Email/Password Authentication**.
3. Register your Android and/or iOS application.
4. Download the Firebase configuration file.
5. Place `google-services.json` in the project root for Android.

## Running the Project

Start the Expo development server:

```bash
npx expo start
```

Run the application on:

- Android Emulator
- iOS Simulator
- Physical device using Expo Go

## Building for Production

Login to Expo:

```bash
npx expo login
```

Initialize EAS:

```bash
npx eas init
```

Build Android:

```bash
npx eas build -p android
```

Build iOS:

```bash
npx eas build -p ios
```

Submit builds:

```bash
npx eas submit -p android
npx eas submit -p ios
```

## Security

Before publishing the application:

- Do not commit the `.env` file.
- Store API keys securely.
- Review Firebase security rules.
- Ensure OAuth credentials are configured correctly.
- Rotate API keys if they have been exposed.

## License

This project is intended for educational and development purposes.

## Author

**Zabi Ullah**

GitHub: https://github.com/zabi30
