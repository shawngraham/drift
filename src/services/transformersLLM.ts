import { pipeline } from '@huggingface/transformers';

/**
 * Transformers.js LLM Service
 * Fallback for devices without WebGPU support
 * Uses smaller models that run on WebGL/WASM
 */

// Available small models (in order of size/quality tradeoff)
export const TRANSFORMERS_MODELS = {
  // Smallest - fast but limited
  SMOL_135M: 'HuggingFaceTB/SmolLM-135M-Instruct', //find better working with onxx
  // Small - good balance
  SMOL_360M: 'HuggingFaceTB/SmolLM-360M-Instruct',//find better working with onxx
  // Medium - better quality
  OPENELM: 'Xenova/OpenELM-270M-Instruct', //works with onxx
  // Larger - best quality for Transformers.js
  PHI3: 'Xenova/Phi-3-mini-4k-instruct_fp16', //works with onxx
} as const;

export type TransformersModelId = typeof TRANSFORMERS_MODELS[keyof typeof TRANSFORMERS_MODELS];

// Default to Qwen2-0.5B for good balance of size and quality
const DEFAULT_MODEL = TRANSFORMERS_MODELS.OPENELM;

// Use a more generic type to avoid complex union types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let generator: any = null;
let currentModelId: string | null = null;
let isLoading = false;

export interface TransformersLoadProgress {
  status: 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  file?: string;
  error?: string;
}

type ProgressCallback = (progress: TransformersLoadProgress) => void;

/**
 * Detect if running on mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if Transformers.js can run (WebGL or WASM available)
 */
export function isTransformersSupported(): boolean {
  // Transformers.js uses ONNX runtime which works on most browsers
  // via WebGL or WASM fallback
  try {
    // Check for basic WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (!gl) {
      console.warn('WebGL not available, will fall back to WASM');
    }
    return true;
  } catch {
    return true; // WASM fallback should still work
  }
}

// Timeout for model loading (longer on mobile due to slower connections)
const LOAD_TIMEOUT_MS = isMobileDevice() ? 180000 : 120000; // 3min mobile, 2min desktop

/**
 * Load a model using Transformers.js with timeout and better error handling
 */
export async function loadTransformersModel(
  modelId: TransformersModelId = DEFAULT_MODEL,
  onProgress?: ProgressCallback
): Promise<void> {
  if (isLoading) {
    throw new Error('Model is already loading');
  }

  if (generator && currentModelId === modelId) {
    onProgress?.({ status: 'ready', progress: 1 });
    return;
  }

  isLoading = true;
  let lastProgressTime = Date.now();
  let progressCheckInterval: ReturnType<typeof setInterval> | undefined;

  try {
    onProgress?.({ status: 'downloading', progress: 0 });

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(
          isMobileDevice()
            ? 'Model loading timed out. Mobile browsers may have limited memory. Try refreshing the page or using a smaller model.'
            : 'Model loading timed out. Please check your connection and try again.'
        ));
      }, LOAD_TIMEOUT_MS);

      // Also set up a stall detector - if no progress for 30 seconds, warn
      progressCheckInterval = setInterval(() => {
        const stallTime = Date.now() - lastProgressTime;
        if (stallTime > 30000 && isLoading) {
          console.warn(`Model loading stalled for ${Math.round(stallTime / 1000)}s`);
        }
      }, 10000);

      // Store timeoutId so we can clear it
      (timeoutPromise as unknown as { _timeoutId: ReturnType<typeof setTimeout> })._timeoutId = timeoutId;
    });

    // Create the actual loading promise
    const loadPromise = (async () => {
      // Use type assertion to avoid complex union type errors
      const result = await (pipeline as Function)('text-generation', modelId, {
        progress_callback: (progressData: { status: string; progress?: number; file?: string }) => {
          lastProgressTime = Date.now(); // Update last progress time

          if (progressData.status === 'progress' && progressData.progress !== undefined) {
            // Clamp progress to 0-100 range (Transformers.js returns 0-100)
            const clampedProgress = Math.min(100, Math.max(0, progressData.progress)) / 100;
            onProgress?.({
              status: 'downloading',
              progress: clampedProgress,
              file: progressData.file,
            });
          } else if (progressData.status === 'done') {
            onProgress?.({ status: 'loading', progress: 0.95 });
          } else if (progressData.status === 'initiate') {
            console.log(`Starting download: ${progressData.file}`);
          }
        },
      });
      return result;
    })();

    // Race between loading and timeout
    generator = await Promise.race([loadPromise, timeoutPromise]);

    currentModelId = modelId;
    onProgress?.({ status: 'ready', progress: 1 });
    console.log('Model loaded successfully:', modelId);
  } catch (error) {
    generator = null;
    currentModelId = null;

    let message = error instanceof Error ? error.message : 'Unknown error';

    // Provide more helpful error messages for common mobile issues
    if (isMobileDevice()) {
      if (message.includes('memory') || message.includes('OOM')) {
        message = 'Not enough memory to load the AI model. Try closing other apps and refreshing.';
      } else if (message.includes('network') || message.includes('fetch')) {
        message = 'Network error while downloading the model. Check your connection and try again.';
      } else if (message.includes('WebGL') || message.includes('context')) {
        message = 'Graphics acceleration not available. The model may still work but could be slow.';
      }
    }

    console.error('Model loading failed:', message, error);
    onProgress?.({ status: 'error', progress: 0, error: message });
    throw new Error(message);
  } finally {
    isLoading = false;
    if (progressCheckInterval) {
      clearInterval(progressCheckInterval);
    }
  }
}

/**
 * Generate text using Transformers.js
 */
export async function generateWithTransformers(
  prompt: string,
  options: {
    maxNewTokens?: number;
    temperature?: number;
    topP?: number;
    doSample?: boolean;
  } = {}
): Promise<string> {
  if (!generator) {
    throw new Error('Model not loaded. Call loadTransformersModel first.');
  }

  const {
    maxNewTokens = 150,
    temperature = 0.8,
    topP = 0.9,
    doSample = true,
  } = options;

  const result = await generator(prompt, {
    max_new_tokens: maxNewTokens,
    temperature,
    top_p: topP,
    do_sample: doSample,
    return_full_text: false,
  });

  // Extract generated text
  if (Array.isArray(result) && result.length > 0) {
    const generated = result[0];
    if (typeof generated === 'object' && 'generated_text' in generated) {
      return String(generated.generated_text);
    }
  }

  return '';
}

/**
 * Check if a model is currently loaded
 */
export function isTransformersModelLoaded(): boolean {
  return generator !== null;
}

/**
 * Get the currently loaded model ID
 */
export function getCurrentTransformersModel(): string | null {
  return currentModelId;
}

/**
 * Unload the current model to free memory
 */
export async function unloadTransformersModel(): Promise<void> {
  generator = null;
  currentModelId = null;
}
