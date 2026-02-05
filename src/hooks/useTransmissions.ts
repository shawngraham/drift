import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { generateTransmission, haveArticlesChanged, shouldTriggerGeneration } from '../services/latentEngine';
import { getRecentTransmissions } from '../services/database';
import { useAudio } from './useAudio';
import type { TransmissionLog, WikiArticle } from '../types';

/**
 * Hook to manage transmission generation and playback
 */
export function useTransmissions() {
  const previousArticlesRef = useRef<WikiArticle[]>([]);
  const generationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    position,
    nearbyArticles,
    isGenerating,
    currentTransmission,
    lastGeneratedAt,
    recentTransmissions,
    settings,
    llmState,
    setIsGenerating,
    setCurrentTransmission,
    setLastGeneratedAt,
    setCurrentPhantom,
    addTransmission,
    setRecentTransmissions,
  } = useAppStore();

  const { speak, isPlaying } = useAudio();

  // Load recent transmissions from database
  useEffect(() => {
    const loadTransmissions = async () => {
      const transmissions = await getRecentTransmissions(50);
      setRecentTransmissions(transmissions);
    };
    loadTransmissions();
  }, [setRecentTransmissions]);

  // Generate a new transmission
  const generate = useCallback(async () => {
    if (!position || !llmState.isReady || isGenerating) return null;

    setIsGenerating(true);

    try {
      const result = await generateTransmission(position, nearbyArticles);

      setCurrentPhantom(result.phantom);
      setCurrentTransmission(result.transmission);
      setLastGeneratedAt(Date.now());
      addTransmission(result.transmission);

      // Speak the transmission if audio is playing
      if (isPlaying && settings.autoPlay) {
        const voiceName = await speak(result.transmission);
        result.transmission.voiceProfile = voiceName;
      }

      return result.transmission;
    } catch (error) {
      console.error('Failed to generate transmission:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [
    position,
    nearbyArticles,
    llmState.isReady,
    isGenerating,
    isPlaying,
    settings.autoPlay,
    setIsGenerating,
    setCurrentPhantom,
    setCurrentTransmission,
    setLastGeneratedAt,
    addTransmission,
    speak,
  ]);

  // Auto-generate transmissions based on triggers
  useEffect(() => {
    if (!position || !llmState.isReady || isGenerating) return;

    const articlesChanged = haveArticlesChanged(
      previousArticlesRef.current,
      nearbyArticles
    );
    previousArticlesRef.current = nearbyArticles;

    const shouldGenerate = shouldTriggerGeneration(
      lastGeneratedAt,
      settings.transmissionInterval * 1000,
      articlesChanged
    );

    if (shouldGenerate && settings.autoPlay) {
      // Small delay to avoid rapid triggers
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }

      generationTimeoutRef.current = setTimeout(() => {
        generate();
      }, 1000);
    }

    return () => {
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
    };
  }, [
    position,
    nearbyArticles,
    llmState.isReady,
    isGenerating,
    lastGeneratedAt,
    settings.transmissionInterval,
    settings.autoPlay,
    generate,
  ]);

  // Replay a transmission
  const replay = useCallback(
    async (transmission: TransmissionLog) => {
      setCurrentTransmission(transmission);
      if (isPlaying) {
        await speak(transmission);
      }
    },
    [isPlaying, setCurrentTransmission, speak]
  );

  return {
    currentTransmission,
    recentTransmissions,
    isGenerating,
    generate,
    replay,
  };
}
