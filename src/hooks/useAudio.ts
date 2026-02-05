import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import {
  initializeAudio,
  startStatic,
  stopStatic,
  setStaticIntensity,
  setMasterVolume,
  speakTransmission,
  selectVoiceProfile,
  stopSpeaking,
  isSpeaking,
  isStaticPlaying,
  disposeAudio,
  startSonarPings,
  stopSonarPings,
} from '../services/audioEngine';
import type { TransmissionLog } from '../types';

/**
 * Hook to manage audio playback
 */
export function useAudio() {
  const isInitializedRef = useRef(false);
  const { audioState, settings, setAudioState } = useAppStore();

  // Initialize audio system
  const initialize = useCallback(async () => {
    if (isInitializedRef.current) return;

    try {
      await initializeAudio();
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }, []);

  // Start static playback
  const start = useCallback(async () => {
    if (!isInitializedRef.current) {
      await initialize();
    }

    startStatic();
    setStaticIntensity(settings.staticIntensity);
    setMasterVolume(settings.voiceVolume);
    setAudioState({ isPlaying: true });
  }, [initialize, settings.staticIntensity, settings.voiceVolume, setAudioState]);

  // Stop all audio
  const stop = useCallback(() => {
    stopStatic();
    stopSpeaking();
    stopSonarPings();
    setAudioState({ isPlaying: false, isSpeaking: false });
  }, [setAudioState]);

  // Toggle audio
  const toggle = useCallback(() => {
    if (audioState.isPlaying) {
      stop();
    } else {
      start();
    }
  }, [audioState.isPlaying, start, stop]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !audioState.isMuted;
    setMasterVolume(newMuted ? 0 : settings.voiceVolume);
    setAudioState({ isMuted: newMuted });
  }, [audioState.isMuted, settings.voiceVolume, setAudioState]);

  // Speak a transmission
  const speak = useCallback(
    async (transmission: TransmissionLog): Promise<string> => {
      if (!isInitializedRef.current) {
        await initialize();
      }

      const profile = selectVoiceProfile();
      setAudioState({ isSpeaking: true });

      try {
        await speakTransmission(transmission.transmission, profile);
        return profile.name;
      } finally {
        setAudioState({ isSpeaking: false });
      }
    },
    [initialize, setAudioState]
  );

  // Update settings when they change
  useEffect(() => {
    if (audioState.isPlaying && !audioState.isMuted) {
      setStaticIntensity(settings.staticIntensity);
      setMasterVolume(settings.voiceVolume);
    }
  }, [
    settings.staticIntensity,
    settings.voiceVolume,
    audioState.isPlaying,
    audioState.isMuted,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeAudio();
    };
  }, []);

  return {
    isPlaying: audioState.isPlaying,
    isMuted: audioState.isMuted,
    isSpeaking: audioState.isSpeaking,
    initialize,
    start,
    stop,
    toggle,
    toggleMute,
    speak,
    checkPlaying: isStaticPlaying,
    checkSpeaking: isSpeaking,
    startSonarPings,
    stopSonarPings,
  };
}
