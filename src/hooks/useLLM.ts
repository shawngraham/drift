import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import {
  initializeLLM,
  isLLMReady,
  isWebGPUAvailable,
  getAvailableModels,
} from '../services/llm';

/**
 * Hook to manage LLM initialization and state
 */
export function useLLM() {
  const { llmState, setLLMState } = useAppStore();

  // Initialize the LLM
  const initialize = useCallback(
    async (modelName?: string) => {
      if (llmState.isReady || llmState.isLoading) return;

      if (!isWebGPUAvailable()) {
        setLLMState({
          error: 'WebGPU is not available. Please use a compatible browser.',
          isLoading: false,
          isReady: false,
        });
        return;
      }

      setLLMState({
        isLoading: true,
        loadProgress: 0,
        error: null,
        modelName: modelName || getAvailableModels()[0],
      });

      try {
        await initializeLLM(
          modelName ? { ...{
            model: modelName,
            temperature: 0.9,
            maxTokens: 150,
            topP: 0.95,
            repetitionPenalty: 1.1,
          }} : undefined,
          (progress, status) => {
            setLLMState({ loadProgress: progress });
            console.log(`LLM Load: ${(progress * 100).toFixed(0)}% - ${status}`);
          }
        );

        setLLMState({
          isLoading: false,
          isReady: true,
          loadProgress: 1,
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
    availableModels: getAvailableModels(),
    initialize,
    checkReady: isLLMReady,
  };
}
