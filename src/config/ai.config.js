/**
 * AI Emotion Detection Configuration
 * Public-safe setup:
 * - Keep API keys in .env only (never commit real keys)
 * - External APIs are disabled by default
 */

const toBoolean = (value) => String(value).toLowerCase() === 'true';

export const AI_CONFIG = {
  // Open-source emotion model via Hugging Face Inference API
  OPEN_SOURCE: {
    API_TOKEN: process.env.EXPO_PUBLIC_HF_API_TOKEN || '',
    MODEL_ID: process.env.EXPO_PUBLIC_HF_EMOTION_MODEL || 'trpakov/vit-face-expression',
    ENDPOINT: process.env.EXPO_PUBLIC_HF_ENDPOINT || 'https://router.huggingface.co/hf-inference',
    TIMEOUT_MS: Number(process.env.EXPO_PUBLIC_HF_TIMEOUT_MS || 12000),
    RETRIES: Number(process.env.EXPO_PUBLIC_HF_RETRIES || 2),
    enabled: Boolean(process.env.EXPO_PUBLIC_HF_API_TOKEN),
  },

  // Face++ API
  FACEPP: {
    API_KEY: process.env.EXPO_PUBLIC_FACEPP_API_KEY || '',
    API_SECRET: process.env.EXPO_PUBLIC_FACEPP_API_SECRET || '',
    enabled: toBoolean(process.env.EXPO_PUBLIC_FACEPP_ENABLED),
  },

};
