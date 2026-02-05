import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js for better mobile compatibility
// Disable local model check to force CDN fetch
env.allowLocalModels = false;
// Use remote models from Hugging Face CDN
env.useBrowserCache = true;

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
 * Check if SharedArrayBuffer is available (needed for multithreaded WASM)
 */
export function isSharedArrayBufferAvailable(): boolean {
  try {
    return typeof SharedArrayBuffer !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Get detailed device capabilities for debugging
 */
export function getDeviceCapabilities(): {
  isMobile: boolean;
  hasWebGL: boolean;
  hasWebGL2: boolean;
  hasSharedArrayBuffer: boolean;
  userAgent: string;
  hardwareConcurrency: number;
  deviceMemory: number | null;
} {
  let hasWebGL = false;
  let hasWebGL2 = false;

  try {
    const canvas = document.createElement('canvas');
    hasWebGL = !!canvas.getContext('webgl');
    hasWebGL2 = !!canvas.getContext('webgl2');
  } catch {
    // WebGL not available
  }

  return {
    isMobile: isMobileDevice(),
    hasWebGL,
    hasWebGL2,
    hasSharedArrayBuffer: isSharedArrayBufferAvailable(),
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    deviceMemory: (navigator as { deviceMemory?: number }).deviceMemory || null,
  };
}

/**
 * Check if Transformers.js can run (WebGL or WASM available)
 */
export function isTransformersSupported(): boolean {
  const caps = getDeviceCapabilities();
  console.log('[Transformers.js] Device capabilities:', caps);

  // Transformers.js can run on most browsers via WASM
  // SharedArrayBuffer improves performance but isn't required
  if (!caps.hasSharedArrayBuffer) {
    console.warn('[Transformers.js] SharedArrayBuffer not available - will use single-threaded WASM (slower but should work)');
  }

  return true;
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

  // Log device capabilities at load time
  const caps = getDeviceCapabilities();
  console.log('[Transformers.js] Starting model load:', modelId);
  console.log('[Transformers.js] Device:', caps);

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
          console.warn(`[Transformers.js] Model loading stalled for ${Math.round(stallTime / 1000)}s`);
          onProgress?.({
            status: 'downloading',
            progress: 0.01,
            file: 'Loading stalled - check console for errors'
          });
        }
      }, 10000);

      // Store timeoutId so we can clear it
      (timeoutPromise as unknown as { _timeoutId: ReturnType<typeof setTimeout> })._timeoutId = timeoutId;
    });

    // Create the actual loading promise
    const loadPromise = (async () => {
      console.log('[Transformers.js] Calling pipeline()...');

      // Use type assertion to avoid complex union type errors
      const result = await (pipeline as Function)('text-generation', modelId, {
        progress_callback: (progressData: { status: string; progress?: number; file?: string }) => {
          lastProgressTime = Date.now(); // Update last progress time

          // Log all progress events for debugging
          console.log('[Transformers.js] Progress:', progressData);

          if (progressData.status === 'progress' && progressData.progress !== undefined) {
            // Clamp progress to 0-100 range (Transformers.js returns 0-100)
            const clampedProgress = Math.min(100, Math.max(0, progressData.progress)) / 100;
            onProgress?.({
              status: 'downloading',
              progress: clampedProgress,
              file: progressData.file,
            });
          } else if (progressData.status === 'done') {
            console.log('[Transformers.js] File done:', progressData.file);
            onProgress?.({ status: 'loading', progress: 0.95 });
          } else if (progressData.status === 'initiate') {
            console.log('[Transformers.js] Starting download:', progressData.file);
          }
        },
      });

      console.log('[Transformers.js] Pipeline returned successfully');
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
