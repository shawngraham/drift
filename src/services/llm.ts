import * as webllm from '@mlc-ai/web-llm';
import type { LLMConfig } from '../types';
import { DEFAULT_LLM_CONFIG } from '../types';

let engine: webllm.MLCEngine | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

export type ProgressCallback = (progress: number, status: string) => void;

/**
 * Check if WebGPU is available
 */
export function isWebGPUAvailable(): boolean {
  return 'gpu' in navigator;
}

/**
 * Get available models that work well for this use case
 */
export function getAvailableModels(): string[] {
  return [
    'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  ];
}

/**
 * Initialize the LLM engine
 */
export async function initializeLLM(
  config: LLMConfig = DEFAULT_LLM_CONFIG,
  onProgress?: ProgressCallback
): Promise<void> {
  if (engine) return;
  if (initPromise) return initPromise;

  if (!isWebGPUAvailable()) {
    throw new Error('WebGPU is not available in this browser');
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
 * Check if LLM is ready
 */
export function isLLMReady(): boolean {
  return engine !== null && !isInitializing;
}

/**
 * Check if LLM is currently loading
 */
export function isLLMLoading(): boolean {
  return isInitializing;
}

/**
 * Generate text using the LLM
 */
export async function generateText(
  prompt: string,
  config: Partial<LLMConfig> = {}
): Promise<string> {
  if (!engine) {
    throw new Error('LLM not initialized. Call initializeLLM first.');
  }

  const fullConfig = { ...DEFAULT_LLM_CONFIG, ...config };

  try {
    const response = await engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: fullConfig.temperature,
      max_tokens: fullConfig.maxTokens,
      top_p: fullConfig.topP,
      frequency_penalty: fullConfig.repetitionPenalty - 1, // WebLLM uses different scale
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('LLM generation error:', error);
    throw error;
  }
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
}

/**
 * Reset the conversation context
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
  return engine ? DEFAULT_LLM_CONFIG.model : null;
}
