// Emotion detection pipeline:
// 1) Open-source Hugging Face image classification model
// 2) Face++ fallback
// 3) Demo mode fallback
import { AI_CONFIG } from '../config/ai.config';

/**
 * Real emotion detection using Face++ API
 * @param {string} imageUri - URI of the captured image
 * @param {string} base64 - Base64 encoded image data
 * @returns {Promise<{emotion: string, confidence: number}>} - Detected emotion and confidence
 */
export const detectEmotion = async (imageUri, base64) => {
  try {
    if (AI_CONFIG.OPEN_SOURCE.enabled) {
      const openSourceResult = await detectWithOpenSourceModel(base64, imageUri);
      if (openSourceResult) {
        return openSourceResult;
      }
    }

    if (AI_CONFIG.FACEPP.enabled) {
      const faceppResult = await detectWithFacePP(base64);
      if (faceppResult) {
        return faceppResult;
      }
    }

    console.log('⚠️ No AI provider configured - using demo mode');
    return { emotion: demoEmotionDetection(), confidence: 0 };
  } catch (error) {
    console.error('❌ Emotion detection pipeline failed:', error.message);
    console.log('⚠️ Falling back to demo mode');
    return { emotion: demoEmotionDetection(), confidence: 0 };
  }
};

const detectWithOpenSourceModel = async (base64, imageUri) => {
  try {
    const { API_TOKEN, MODEL_ID, ENDPOINT, TIMEOUT_MS, RETRIES } = AI_CONFIG.OPEN_SOURCE;

    if (!API_TOKEN) {
      return null;
    }

    console.log('🔍 Analyzing emotion with open-source model...');

    const candidateModels = [
      MODEL_ID,
      'dima806/facial_emotions_image_detection',
      'trpakov/vit-face-expression',
    ].filter(Boolean);

    const uniqueModels = [...new Set(candidateModels)];

    for (const model of uniqueModels) {
      const emotion = await queryHuggingFaceModel({
        token: API_TOKEN,
        model,
        endpoint: ENDPOINT,
        timeoutMs: TIMEOUT_MS,
        retries: RETRIES,
        base64,
        imageUri,
      });

      if (emotion) {
        console.log(`✅ Open-source model (${model}) detected:`, emotion.emotion, `(${emotion.confidence}% confidence)`);
        return emotion;
      }
    }

    console.log('⚠️ Open-source models did not return a usable prediction');
    return null;
  } catch (error) {
    console.error('❌ Open-source emotion detection error:', error.message);
    return null;
  }
};

const queryHuggingFaceModel = async ({ token, model, endpoint, timeoutMs, retries, base64, imageUri }) => {
  const baseEndpoint = String(endpoint || 'https://api-inference.huggingface.co').replace(/\/$/, '');
  const url = `${baseEndpoint}/models/${model}`;

  const binaryBody = await getImageBinary(imageUri, base64);
  if (binaryBody) {
    const binaryResponse = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
      },
      body: binaryBody,
    }, {
      retries,
      timeoutMs,
      model,
      mode: 'binary',
    });

    const binaryEmotion = await parseHuggingFaceResponse(binaryResponse, model, 'binary');
    if (binaryEmotion) {
      return binaryEmotion;
    }
  }

  const jsonResponse = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: base64,
      options: { wait_for_model: true },
    }),
  }, {
    retries,
    timeoutMs,
    model,
    mode: 'json',
  });

  return parseHuggingFaceResponse(jsonResponse, model, 'json');
};

const fetchWithRetry = async (url, options, { retries = 2, timeoutMs = 12000, model, mode }) => {
  const attempts = Math.max(1, Number(retries) + 1);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (error) {
      const isLastAttempt = attempt === attempts;
      console.log(`⚠️ Hugging Face ${mode} network attempt ${attempt}/${attempts} failed for ${model}: ${error.message}`);
      if (isLastAttempt) {
        throw error;
      }
      await sleep(400 * attempt);
    }
  }

  throw new Error('Request failed after retries');
};

const fetchWithTimeout = async (url, options, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(timeoutMs) || 12000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getImageBinary = async (imageUri, base64) => {
  try {
    if (imageUri) {
      const fileResponse = await fetch(imageUri);
      const blob = await fileResponse.blob();
      if (blob) {
        return blob;
      }
    }
  } catch (error) {
    console.log('⚠️ Could not read image URI for binary upload:', error.message);
  }

  if (!base64) {
    return null;
  }

  try {
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    return await response.blob();
  } catch (error) {
    console.log('⚠️ Could not build base64 binary payload:', error.message);
    return null;
  }
};

const parseHuggingFaceResponse = async (response, model, mode) => {
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `HTTP ${response.status}`;
    console.log(`⚠️ Hugging Face ${mode} request failed for ${model}: ${message}`);
    return null;
  }

  const emotion = parseOpenSourceEmotion(data);
  if (!emotion) {
    console.log(`⚠️ Hugging Face ${mode} response had no valid labels for ${model}`);
  }
  return emotion;
};

const parseOpenSourceEmotion = (data) => {
  if (!data) return null;

  const results = Array.isArray(data) ? data.flatMap((item) => (Array.isArray(item) ? item : [item])) : [data];
  const best = results
    .filter((item) => item && typeof item === 'object' && item.label)
    .sort((left, right) => (right.score || 0) - (left.score || 0))[0];

  if (!best) return null;

  const emotionMap = {
    happy: 'happy',
    happiness: 'happy',
    sad: 'sad',
    sadness: 'sad',
    angry: 'angry',
    anger: 'angry',
    surprised: 'surprised',
    surprise: 'surprised',
    neutral: 'neutral',
    fear: 'fear',
    fearful: 'fear',
    disgust: 'disgust',
    calm: 'calm',
  };

  return {
    emotion: emotionMap[String(best.label).toLowerCase()] || 'neutral',
    confidence: Math.round((best.score || 0) * 100),
  };
};

const detectWithFacePP = async (base64) => {
  try {
    const { API_KEY, API_SECRET } = AI_CONFIG.FACEPP;

    if (!API_KEY || !API_SECRET) {
      return null;
    }

    console.log('🔍 Analyzing emotion with Face++ fallback...');

    const formData = new FormData();
    formData.append('api_key', API_KEY);
    formData.append('api_secret', API_SECRET);
    formData.append('return_attributes', 'emotion');
    formData.append('image_base64', base64);

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.faces && data.faces.length > 0) {
      const emotions = data.faces[0].attributes.emotion;
      const emotionMap = {
        happiness: 'happy',
        sadness: 'sad',
        anger: 'angry',
        surprise: 'surprised',
        neutral: 'neutral',
        fear: 'fear',
        disgust: 'disgust',
      };

      let maxEmotion = 'neutral';
      let maxValue = 0;

      for (const [key, value] of Object.entries(emotions)) {
        if (value > maxValue) {
          maxValue = value;
          maxEmotion = emotionMap[key] || key;
        }
      }

      console.log('✅ Face++ detected:', maxEmotion, `(${maxValue.toFixed(1)}% confidence)`);
      return { emotion: maxEmotion, confidence: Math.round(maxValue) };
    }

    console.log('⚠️ Face++ returned no face');
    return null;
  } catch (error) {
    console.error('❌ Face++ emotion detection error:', error.message);
    return null;
  }
};

/**
 * Demo emotion detection (fallback)
 */
const demoEmotionDetection = () => {
  const weightedEmotions = [
    { emotion: 'neutral', weight: 40 },
    { emotion: 'happy', weight: 30 },
    { emotion: 'calm', weight: 15 },
    { emotion: 'surprised', weight: 5 },
    { emotion: 'sad', weight: 5 },
    { emotion: 'angry', weight: 3 },
    { emotion: 'fear', weight: 2 },
  ];
  
  const totalWeight = weightedEmotions.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of weightedEmotions) {
    if (random < item.weight) {
      return item.emotion;
    }
    random -= item.weight;
  }
  
  return 'neutral';
};

/**
 * Load TensorFlow Lite model for emotion detection
 * This function will be implemented when integrating the actual model
 */
export const loadEmotionModel = async () => {
  // TODO: Implement TensorFlow Lite model loading
  // Example:
  // import * as tf from '@tensorflow/tfjs';
  // import '@tensorflow/tfjs-react-native';
  // const model = await tf.loadLayersModel('path/to/model.json');
  // return model;
  
  console.log('Model loading not yet implemented');
  return null;
};

/**
 * Preprocess image for emotion detection
 * @param {string} imageUri - URI of the image to preprocess
 * @returns {Promise<Tensor>} - Preprocessed image tensor
 */
export const preprocessImage = async (imageUri) => {
  // TODO: Implement image preprocessing
  // 1. Decode image
  // 2. Resize to model input size (e.g., 48x48 for FER-2013)
  // 3. Convert to grayscale if needed
  // 4. Normalize pixel values
  // 5. Expand dimensions for batch processing
  
  console.log('Image preprocessing not yet implemented');
  return null;
};
