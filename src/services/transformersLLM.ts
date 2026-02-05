import { pipeline } from '@huggingface/transformers';

/**
 * Transformers.js LLM Service
 * Fallback for devices without WebGPU support
 * Uses smaller models that run on WebGL/WASM
 */

// Available small models (in order of size/quality tradeoff)
export const TRANSFORMERS_MODELS = {
  // Smallest - fast but limited
  SMOL_135M: 'HuggingFaceTB/SmolLM-135M-Instruct',
  // Small - good balance
  SMOL_360M: 'HuggingFaceTB/SmolLM-360M-Instruct',
  // Medium - better quality
  QWEN_0_5B: 'Qwen/Qwen2-0.5B-Instruct',
  // Larger - best quality for Transformers.js
  QWEN_1_5B: 'Qwen/Qwen2-1.5B-Instruct',
} as const;

export type TransformersModelId = typeof TRANSFORMERS_MODELS[keyof typeof TRANSFORMERS_MODELS];

// Default to SmolLM-360M for good balance of size and quality
const DEFAULT_MODEL = TRANSFORMERS_MODELS.SMOL_360M;

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
 * Check if Transformers.js can run (WebGL or WASM available)
 */
export function isTransformersSupported(): boolean {
  // Transformers.js uses ONNX runtime which works on most browsers
  // via WebGL or WASM fallback
  return true;
}

/**
 * Load a model using Transformers.js
 */
export async function loadTransformersModel(
  modelId: TransformersModelId = DEFAULT_MODEL,
  onProgress?: ProgressCallback
): Promise<void> {
  if (isLoading) {
    throw new Error('Model is already loading');
  }

  if (generator && currentModelId === modelId) {
    onProgress?.({ status: 'ready', progress: 100 });
    return;
  }

  isLoading = true;

  try {
    onProgress?.({ status: 'downloading', progress: 0 });

    // Use type assertion to avoid complex union type errors
    generator = await (pipeline as Function)('text-generation', modelId, {
      progress_callback: (progressData: { status: string; progress?: number; file?: string }) => {
        if (progressData.status === 'progress' && progressData.progress !== undefined) {
          onProgress?.({
            status: 'downloading',
            progress: progressData.progress,
            file: progressData.file,
          });
        } else if (progressData.status === 'done') {
          onProgress?.({ status: 'loading', progress: 95 });
        }
      },
    });

    currentModelId = modelId;
    onProgress?.({ status: 'ready', progress: 100 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    onProgress?.({ status: 'error', progress: 0, error: message });
    throw error;
  } finally {
    isLoading = false;
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
