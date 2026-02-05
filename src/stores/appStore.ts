import { create } from 'zustand';
import type {
  Position,
  WikiArticle,
  TransmissionLog,
  PhantomLocation,
  AppSettings,
  AppView,
  LLMState,
  AudioState,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';

interface AppState {
  // View state
  currentView: AppView;
  setView: (view: AppView) => void;

  // Geolocation state
  position: Position | null;
  positionHistory: Position[];
  heading: number | null;
  geolocationError: GeolocationPositionError | null;
  isWatching: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
  setPosition: (position: Position) => void;
  setHeading: (heading: number | null) => void;
  setGeolocationError: (error: GeolocationPositionError | null) => void;
  setIsWatching: (watching: boolean) => void;
  setPermissionState: (state: 'prompt' | 'granted' | 'denied' | 'unknown') => void;

  // Wikipedia articles
  nearbyArticles: WikiArticle[];
  setNearbyArticles: (articles: WikiArticle[]) => void;

  // Generation state
  isGenerating: boolean;
  currentPhantom: PhantomLocation | null;
  lastGeneratedAt: number | null;
  currentTransmission: TransmissionLog | null;
  transmissionQueue: TransmissionLog[];
  setIsGenerating: (generating: boolean) => void;
  setCurrentPhantom: (phantom: PhantomLocation | null) => void;
  setLastGeneratedAt: (timestamp: number | null) => void;
  setCurrentTransmission: (transmission: TransmissionLog | null) => void;
  addToQueue: (transmission: TransmissionLog) => void;
  removeFromQueue: (id: number) => void;

  // LLM state
  llmState: LLMState;
  setLLMState: (state: Partial<LLMState>) => void;

  // Audio state
  audioState: AudioState;
  setAudioState: (state: Partial<AudioState>) => void;

  // Settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;

  // Transmission history (in-memory for quick access)
  recentTransmissions: TransmissionLog[];
  setRecentTransmissions: (transmissions: TransmissionLog[]) => void;
  addTransmission: (transmission: TransmissionLog) => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // View state
  currentView: 'onboarding',
  setView: (view) => set({ currentView: view }),

  // Geolocation state
  position: null,
  positionHistory: [],
  heading: null,
  geolocationError: null,
  isWatching: false,
  permissionState: 'unknown',
  setPosition: (position) =>
    set((state) => ({
      position,
      positionHistory: [...state.positionHistory.slice(-19), position], // Keep last 20
    })),
  setHeading: (heading) => set({ heading }),
  setGeolocationError: (error) => set({ geolocationError: error }),
  setIsWatching: (watching) => set({ isWatching: watching }),
  setPermissionState: (permissionState) => set({ permissionState }),

  // Wikipedia articles
  nearbyArticles: [],
  setNearbyArticles: (articles) => set({ nearbyArticles: articles }),

  // Generation state
  isGenerating: false,
  currentPhantom: null,
  lastGeneratedAt: null,
  currentTransmission: null,
  transmissionQueue: [],
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setCurrentPhantom: (phantom) => set({ currentPhantom: phantom }),
  setLastGeneratedAt: (timestamp) => set({ lastGeneratedAt: timestamp }),
  setCurrentTransmission: (transmission) => set({ currentTransmission: transmission }),
  addToQueue: (transmission) =>
    set((state) => ({
      transmissionQueue: [...state.transmissionQueue, transmission],
    })),
  removeFromQueue: (id) =>
    set((state) => ({
      transmissionQueue: state.transmissionQueue.filter((t) => t.id !== id),
    })),

  // LLM state
  llmState: {
    isLoading: false,
    isReady: false,
    loadProgress: 0,
    error: null,
    modelName: null,
  },
  setLLMState: (newState) =>
    set((state) => ({
      llmState: { ...state.llmState, ...newState },
    })),

  // Audio state
  audioState: {
    isPlaying: false,
    isMuted: false,
    isSpeaking: false,
    staticIntensity: 0.3,
  },
  setAudioState: (newState) =>
    set((state) => ({
      audioState: { ...state.audioState, ...newState },
    })),

  // Settings
  settings: DEFAULT_SETTINGS,
  setSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  // Transmission history
  recentTransmissions: [],
  setRecentTransmissions: (transmissions) =>
    set({ recentTransmissions: transmissions }),
  addTransmission: (transmission) =>
    set((state) => ({
      recentTransmissions: [transmission, ...state.recentTransmissions].slice(0, 50),
    })),

  // Onboarding
  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: (completed) =>
    set({ hasCompletedOnboarding: completed }),
}));
