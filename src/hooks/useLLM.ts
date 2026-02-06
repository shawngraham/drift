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
  getCurrentModel,
  type LLMBackend,
} from '../services/llm';

/**
 * Hook to manage LLM initialization and state
 */
export function useLLM() {
  const { llmState, setLLMState } = useAppStore();

  // Initialize the LLM (auto-selects best backend)
  // Returns true if successful, false if failed
  const initialize = useCallback(
    async (modelName?: string): Promise<boolean> => {
      // Read current state directly from store to avoid stale closures
      const currentState = useAppStore.getState().llmState;

      if (currentState.isReady) {
        console.log('[useLLM] Already ready, skipping init');
        return true;
      }

      if (currentState.isLoading) {
        console.log('[useLLM] Already loading, skipping init');
        return false;
      }

      console.log('[useLLM] Starting initialization...');

      setLLMState({
        isLoading: true,
        loadProgress: 0,
        error: null,
        modelName: modelName || 'Auto-selecting best model...',
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
            console.log(`[useLLM] Load: ${(progress * 100).toFixed(0)}% - ${status}`);
          }
        );

        console.log('[useLLM] Initialization successful, backend:', backend);

        setLLMState({
          isLoading: false,
          isReady: true,
          loadProgress: 1,
          modelName: getCurrentModel() || modelName || 'Unknown model',
        });

        return true;
      } catch (error) {
        console.error('[useLLM] Failed to initialize LLM:', error);
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to load the AI model';

        setLLMState({
          isLoading: false,
          isReady: false,
          error: errorMessage,
        });

        return false;
      }
    },
    [setLLMState]
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
