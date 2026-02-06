/**
 * Transformers.js LLM Service
 * Fallback for devices without WebGPU support
 * Uses smaller models that run on WebGL/WASM
 *
 * IMPORTANT: We use dynamic import to avoid "can't access lexical declaration
 * before initialization" errors on mobile browsers. The Transformers.js library
 * has complex initialization that can fail if loaded too early.
 */

// Cached reference to the dynamically imported module
let transformersModule: typeof import('@huggingface/transformers') | null = null;

/**
 * Dynamically import and configure Transformers.js
 * This avoids module initialization issues on mobile browsers
 */
async function getTransformers() {
  if (transformersModule) {
    return transformersModule;
  }

  console.log('[Transformers.js] Dynamically importing library...');

  try {
    transformersModule = await import('@huggingface/transformers');

    // Configure environment after successful import
    try {
      transformersModule.env.allowLocalModels = false;
      transformersModule.env.useBrowserCache = true;
      console.log('[Transformers.js] Library loaded and configured');
    } catch (envError) {
      console.warn('[Transformers.js] Failed to configure env:', envError);
    }

    return transformersModule;
  } catch (error) {
    console.error('[Transformers.js] Failed to import library:', error);
    throw new Error(`Failed to load AI library: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Available models optimized for in-browser inference via Transformers.js + ONNX
// SmolLM2 models: trained on 2-4T tokens with DPO alignment (successor to SmolLM v1)
// Xenova models: ONNX-converted by Xenova (HF staff), proven browser compatibility
export const TRANSFORMERS_MODELS = {
  // Smallest - fast inference, good for low-end mobile (~270MB)
  SMOL2_135M: 'HuggingFaceTB/SmolLM2-135M-Instruct',
  // Small - best balance of quality and speed (~720MB, trained on 4T tokens + DPO)
  SMOL2_360M: 'HuggingFaceTB/SmolLM2-360M-Instruct',
  // Medium - strong instruction following, Xenova ONNX (~500MB)
  QWEN_05B: 'Xenova/Qwen1.5-0.5B-Chat',
  // Larger - best quality for Transformers.js, Xenova ONNX (quantized, ~800MB)
  PHI3: 'Xenova/Phi-3-mini-4k-instruct',
} as const;

export type TransformersModelId = typeof TRANSFORMERS_MODELS[keyof typeof TRANSFORMERS_MODELS];

// Default to SmolLM2-360M: excellent quality/size ratio, 4T training tokens, DPO-aligned
const DEFAULT_MODEL = TRANSFORMERS_MODELS.SMOL2_360M;

// Quantization dtype options for ONNX models
export type ModelDtype = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';

// Model-specific optimal dtype defaults (balancing size vs quality)
const MODEL_DTYPE_DEFAULTS: Record<string, ModelDtype> = {
  [TRANSFORMERS_MODELS.SMOL2_135M]: 'q8',   // Small enough that q8 is fine
  [TRANSFORMERS_MODELS.SMOL2_360M]: 'q8',   // Good quality at q8
  [TRANSFORMERS_MODELS.QWEN_05B]: 'q4',     // Larger model benefits from q4 compression
  [TRANSFORMERS_MODELS.PHI3]: 'q4',          // Large model, q4 keeps download manageable
};

/**
 * Check if WebGPU is available for accelerated inference
 */
export function hasWebGPU(): boolean {
  return 'gpu' in navigator;
}

/**
 * Get the optimal device for inference based on browser capabilities
 */
function getOptimalDevice(): string {
  if (hasWebGPU()) {
    console.log('[Transformers.js] WebGPU available - using GPU acceleration');
    return 'webgpu';
  }
  console.log('[Transformers.js] No WebGPU - using WASM (CPU) backend');
  return 'wasm';
}

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

      // Dynamically import the library to avoid mobile initialization issues
      const transformers = await getTransformers();

      // Progress callback shared across attempts
      const progressCallback = (progressData: { status: string; progress?: number; file?: string }) => {
        lastProgressTime = Date.now();
        console.log('[Transformers.js] Progress:', progressData);

        if (progressData.status === 'progress' && progressData.progress !== undefined) {
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
      };

      // Try loading with quantization + device acceleration first,
      // fall back to defaults if the model doesn't have quantized ONNX files
      const dtype = MODEL_DTYPE_DEFAULTS[modelId];
      const device = getOptimalDevice();

      if (dtype) {
        try {
          console.log(`[Transformers.js] Attempting ${modelId} with dtype=${dtype}, device=${device}`);
          const pipelineOptions: Record<string, unknown> = {
            dtype,
            progress_callback: progressCallback,
          };
          if (device === 'webgpu') {
            pipelineOptions.device = 'webgpu';
          }

          const result = await (transformers.pipeline as Function)(
            'text-generation',
            modelId,
            pipelineOptions,
          );
          console.log('[Transformers.js] Pipeline returned successfully (quantized)');
          return result;
        } catch (quantizedError) {
          console.warn('[Transformers.js] Quantized load failed, retrying without dtype/device:', quantizedError);
        }
      }

      // Fallback: load without dtype/device options (uses model defaults)
      console.log(`[Transformers.js] Loading ${modelId} with default options`);
      const result = await (transformers.pipeline as Function)(
        'text-generation',
        modelId,
        { progress_callback: progressCallback },
      );
      console.log('[Transformers.js] Pipeline returned successfully (default)');
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
 * Select the best model based on device capabilities
 * Returns the most capable model the device can reasonably handle
 */
export function selectModelForDevice(): TransformersModelId {
  const caps = getDeviceCapabilities();

  // Desktop with good specs: use Qwen 0.5B for best quality
  if (!caps.isMobile && caps.hardwareConcurrency >= 4) {
    const memory = caps.deviceMemory ?? 8;
    if (memory >= 4) {
      console.log('[Transformers.js] Desktop with good specs → Qwen1.5-0.5B-Chat');
      return TRANSFORMERS_MODELS.QWEN_05B;
    }
  }

  // Mobile or limited desktop: use SmolLM2-360M for good quality at manageable size
  if (!caps.isMobile || (caps.hardwareConcurrency >= 4 && (caps.deviceMemory ?? 4) >= 4)) {
    console.log('[Transformers.js] Standard device → SmolLM2-360M');
    return TRANSFORMERS_MODELS.SMOL2_360M;
  }

  // Low-end mobile: use SmolLM2-135M for fastest inference
  console.log('[Transformers.js] Low-end device → SmolLM2-135M');
  return TRANSFORMERS_MODELS.SMOL2_135M;
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
    repetitionPenalty?: number;
    doSample?: boolean;
  } = {}
): Promise<string> {
  if (!generator) {
    throw new Error('Model not loaded. Call loadTransformersModel first.');
  }

  const {
    maxNewTokens = 120,
    temperature = 0.85,
    topP = 0.92,
    repetitionPenalty = 1.15,
    doSample = true,
  } = options;

  const result = await generator(prompt, {
    max_new_tokens: maxNewTokens,
    temperature,
    top_p: topP,
    repetition_penalty: repetitionPenalty,
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
