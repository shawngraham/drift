import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import {
  initializeLLM,
  isLLMReady,
  isWebGPUAvailable,
  getWebLLMModels,
  getTransformersModels,
  getRecommendedBackend,
  getCurrentBackend,
  type LLMBackend,
} from '../services/llm';

/**
 * Hook to manage LLM initialization and state
 */
export function useLLM() {
  const { llmState, setLLMState } = useAppStore();

  // Initialize the LLM (auto-selects best backend)
  const initialize = useCallback(
    async (modelName?: string) => {
      if (llmState.isReady || llmState.isLoading) return;

      const recommended = getRecommendedBackend();

      setLLMState({
        isLoading: true,
        loadProgress: 0,
        error: null,
        modelName: modelName || (recommended === 'webllm'
          ? getWebLLMModels()[0]
          : 'SmolLM-360M'),
      });

      try {
        const backend = await initializeLLM(
          modelName ? {
            model: modelName,
            temperature: 0.9,
            maxTokens: 150,
            topP: 0.95,
            repetitionPenalty: 1.1,
          } : undefined,
          (progress, status) => {
            setLLMState({ loadProgress: progress });
            console.log(`LLM Load: ${(progress * 100).toFixed(0)}% - ${status}`);
          }
        );

        setLLMState({
          isLoading: false,
          isReady: true,
          loadProgress: 1,
          modelName: backend === 'webllm'
            ? modelName || getWebLLMModels()[0]
            : 'SmolLM-360M (Transformers.js)',
        });
      } catch (error) {
        console.error('Failed to initialize LLM:', error);
        setLLMState({
          isLoading: false,
          isReady: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load the AI model',
        });
      }
    },
    [llmState.isReady, llmState.isLoading, setLLMState]
  );

  return {
    isReady: llmState.isReady,
    isLoading: llmState.isLoading,
    loadProgress: llmState.loadProgress,
    error: llmState.error,
    modelName: llmState.modelName,
    isWebGPUSupported: isWebGPUAvailable(),
    recommendedBackend: getRecommendedBackend(),
    currentBackend: getCurrentBackend() as LLMBackend,
    webllmModels: getWebLLMModels(),
    transformersModels: getTransformersModels(),
    initialize,
    checkReady: isLLMReady,
  };
}
