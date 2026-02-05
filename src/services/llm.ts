import * as webllm from '@mlc-ai/web-llm';
import type { LLMConfig } from '../types';
import { DEFAULT_LLM_CONFIG } from '../types';
import {
  loadTransformersModel,
  generateWithTransformers,
  isTransformersModelLoaded,
  unloadTransformersModel,
  TRANSFORMERS_MODELS,
  type TransformersModelId,
} from './transformersLLM';

/**
 * LLM Backend types
 */
export type LLMBackend = 'webllm' | 'transformers' | 'none';

let engine: webllm.MLCEngine | null = null;
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
  // SmolLM-360M is ~720MB vs Phi-3-mini at ~2GB
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
 */
export function getTransformersModels(): { id: TransformersModelId; name: string; size: string }[] {
  return [
    { id: TRANSFORMERS_MODELS.SMOL_135M, name: 'SmolLM 135M', size: '~270MB' },
    { id: TRANSFORMERS_MODELS.SMOL_360M, name: 'SmolLM 360M', size: '~720MB' },
    { id: TRANSFORMERS_MODELS.OPENELM, name: 'OpenELM', size: '~270MB' },
    { id: TRANSFORMERS_MODELS.PHI3, name: 'Phi3', size: 'oh, around 1 gb maybe?' },
  ]; 
}

/**
 * Initialize LLM with WebLLM (requires WebGPU) - optional upgrade
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
      engine = new webllm.MLCEngine();

      engine.setInitProgressCallback((report) => {
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
  modelId: TransformersModelId = TRANSFORMERS_MODELS.SMOL_360M,
  onProgress?: ProgressCallback
): Promise<void> {
  if (isTransformersModelLoaded()) return;

  isInitializing = true;

  try {
    await loadTransformersModel(modelId, (progress) => {
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
  } finally {
    isInitializing = false;
  }
}

/**
 * Initialize the LLM - uses Transformers.js by default for faster load
 */
export async function initializeLLM(
  _config: LLMConfig = DEFAULT_LLM_CONFIG,
  onProgress?: ProgressCallback
): Promise<LLMBackend> {
  // Always use Transformers.js by default for faster initial load
  // Users can optionally switch to WebLLM later for better quality
  await initializeTransformers(TRANSFORMERS_MODELS.OPENELM, onProgress);
  return 'transformers';
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
    return 'Qwen2-0.5B (Transformers.js)';
  }
  return null;
}
