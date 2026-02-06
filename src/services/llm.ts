/**
 * LLM Service - orchestrates model backends
 *
 * IMPORTANT: WebLLM is loaded via dynamic import to avoid
 * "can't access lexical declaration before initialization" errors.
 * The WebLLM bundle (5MB+) has complex internal initialization that
 * fails with TDZ errors when eagerly loaded on many browsers.
 */

import type { LLMConfig } from '../types';
import { DEFAULT_LLM_CONFIG } from '../types';
import {
  loadTransformersModel,
  generateWithTransformers,
  isTransformersModelLoaded,
  unloadTransformersModel,
  getCurrentTransformersModel,
  selectModelForDevice,
  TRANSFORMERS_MODELS,
  type TransformersModelId,
} from './transformersLLM';

/**
 * LLM Backend types
 */
export type LLMBackend = 'webllm' | 'transformers' | 'none';

// WebLLM engine is lazily loaded - no static import to avoid TDZ errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let engine: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;
let currentBackend: LLMBackend = 'none';

export type ProgressCallback = (progress: number, status: string) => void;

/**
 * Check if WebGPU is available
 */
export function isWebGPUAvailable(): boolean {
  return 'gpu' in navigator;
}

/**
 * Get the default backend - always Transformers.js for faster initial load
 * WebLLM is available as an upgrade option for users with WebGPU
 */
export function getRecommendedBackend(): LLMBackend {
  // Default to Transformers.js for faster initial experience
  // SmolLM2/Qwen models are auto-selected based on device capabilities
  return 'transformers';
}

/**
 * Get available WebLLM models (requires WebGPU)
 */
export function getWebLLMModels(): string[] {
  return [
    'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  ];
}

/**
 * Get available Transformers.js models (default, works everywhere)
 * Sizes shown are approximate download sizes with quantization applied
 */
export function getTransformersModels(): { id: TransformersModelId; name: string; size: string }[] {
  return [
    { id: TRANSFORMERS_MODELS.SMOL2_135M, name: 'SmolLM2 135M', size: '~150MB (q8)' },
    { id: TRANSFORMERS_MODELS.SMOL2_360M, name: 'SmolLM2 360M', size: '~400MB (q8)' },
    { id: TRANSFORMERS_MODELS.QWEN_05B, name: 'Qwen1.5 0.5B', size: '~350MB (q4)' },
    { id: TRANSFORMERS_MODELS.PHI3, name: 'Phi-3 Mini', size: '~800MB (q4)' },
  ];
}

/**
 * Initialize LLM with WebLLM (requires WebGPU) - optional upgrade
 * Uses dynamic import to avoid "can't access lexical declaration before initialization"
 * errors caused by the WebLLM bundle's complex initialization code.
 */
export async function initializeWebLLM(
  config: LLMConfig = DEFAULT_LLM_CONFIG,
  onProgress?: ProgressCallback
): Promise<void> {
  if (engine) return;
  if (initPromise) return initPromise;

  if (!isWebGPUAvailable()) {
    throw new Error('WebGPU is not available in this browser.');
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      // Dynamic import to avoid eager loading of 5MB+ WebLLM bundle
      const webllm = await import('@mlc-ai/web-llm');

      engine = new webllm.MLCEngine();

      engine.setInitProgressCallback((report: { progress?: number; text?: string }) => {
        const progress = report.progress || 0;
        const status = report.text || 'Loading...';
        onProgress?.(progress, status);
      });

      await engine.reload(config.model);
      currentBackend = 'webllm';
      isInitializing = false;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      engine = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Initialize LLM with Transformers.js (default, works everywhere)
 */
export async function initializeTransformers(
  modelId?: TransformersModelId,
  onProgress?: ProgressCallback
): Promise<void> {
  // Auto-select best model for device if none specified
  const selectedModel = modelId || selectModelForDevice();
  console.log('[llm] initializeTransformers called with model:', selectedModel);

  if (isTransformersModelLoaded()) {
    console.log('[llm] Model already loaded, skipping');
    return;
  }

  isInitializing = true;
  console.log('[llm] Starting Transformers.js initialization...');

  try {
    await loadTransformersModel(selectedModel, (progress) => {
      const pct = progress.progress;
      const status = progress.status === 'downloading'
        ? `Downloading${progress.file ? `: ${progress.file}` : '...'}`
        : progress.status === 'loading'
        ? 'Loading model...'
        : progress.status === 'ready'
        ? 'Ready'
        : progress.error || 'Loading...';
      onProgress?.(pct, status);
    });
    currentBackend = 'transformers';
    console.log('[llm] Transformers.js initialization successful');
  } catch (error) {
    console.error('[llm] Transformers.js initialization failed:', error);
    throw error; // Re-throw to propagate to caller
  } finally {
    isInitializing = false;
  }
}

/**
 * Initialize the LLM - uses Transformers.js by default for faster load
 * Auto-selects the best model for the device when no config model is specified
 */
export async function initializeLLM(
  _config: LLMConfig = DEFAULT_LLM_CONFIG,
  onProgress?: ProgressCallback
): Promise<LLMBackend> {
  console.log('[llm] initializeLLM called');

  // Always use Transformers.js by default for faster initial load
  // Model is auto-selected based on device capabilities
  // Users can optionally switch to WebLLM later for better quality
  try {
    await initializeTransformers(undefined, onProgress);
    console.log('[llm] initializeLLM completed successfully');
    return 'transformers';
  } catch (error) {
    console.error('[llm] initializeLLM failed:', error);
    throw error; // Re-throw to propagate to useLLM hook
  }
}

/**
 * Check if LLM is ready
 */
export function isLLMReady(): boolean {
  return currentBackend !== 'none' && !isInitializing;
}

/**
 * Check if LLM is currently loading
 */
export function isLLMLoading(): boolean {
  return isInitializing;
}

/**
 * Get current backend
 */
export function getCurrentBackend(): LLMBackend {
  return currentBackend;
}

/**
 * Generate text using the current LLM backend
 */
export async function generateText(
  prompt: string,
  config: Partial<LLMConfig> = {}
): Promise<string> {
  if (currentBackend === 'none') {
    throw new Error('LLM not initialized. Call initializeLLM first.');
  }

  const fullConfig = { ...DEFAULT_LLM_CONFIG, ...config };

  if (currentBackend === 'webllm' && engine) {
    try {
      const response = await engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature: fullConfig.temperature,
        max_tokens: fullConfig.maxTokens,
        top_p: fullConfig.topP,
        frequency_penalty: fullConfig.repetitionPenalty - 1,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('WebLLM generation error:', error);
      throw error;
    }
  }

  if (currentBackend === 'transformers') {
    try {
      return await generateWithTransformers(prompt, {
        maxNewTokens: fullConfig.maxTokens,
        temperature: fullConfig.temperature,
        topP: fullConfig.topP,
        repetitionPenalty: fullConfig.repetitionPenalty,
      });
    } catch (error) {
      console.error('Transformers.js generation error:', error);
      throw error;
    }
  }

  throw new Error('No LLM backend available');
}

/**
 * Unload the LLM to free memory
 */
export async function unloadLLM(): Promise<void> {
  if (engine) {
    await engine.unload();
    engine = null;
    initPromise = null;
  }

  await unloadTransformersModel();
  currentBackend = 'none';
}

/**
 * Reset the conversation context (WebLLM only)
 */
export async function resetChat(): Promise<void> {
  if (engine) {
    await engine.resetChat();
  }
}

/**
 * Get current model name
 */
export function getCurrentModel(): string | null {
  if (currentBackend === 'webllm') {
    return DEFAULT_LLM_CONFIG.model;
  }
  if (currentBackend === 'transformers') {
    const modelId = getCurrentTransformersModel();
    if (modelId) {
      // Extract a readable name from the model path
      const parts = modelId.split('/');
      return `${parts[parts.length - 1]} (Transformers.js)`;
    }
    return 'Transformers.js';
  }
  return null;
}
