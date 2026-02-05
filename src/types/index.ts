// Core position interface
export interface Position {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number;
  timestamp: number;
}

// Wikipedia article from geosearch API
export interface WikiArticle {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
  primary?: string;
}

// Phantom location generated in "negative space"
export interface PhantomLocation {
  lat: number;
  lon: number;
  dimensionalDrift: number;
  anchors: string[];
}

// Transmission styles
export type TransmissionStyle =
  | 'fragment'
  | 'catalog'
  | 'field_note'
  | 'signal'
  | 'whisper';

// Voice profile for speech synthesis
export interface VoiceProfile {
  voice: SpeechSynthesisVoice | null;
  pitch: number;
  rate: number;
  filterFreq: number;
  reverbMix: number;
  name: string;
}

// Transmission log entry
export interface TransmissionLog {
  id?: number;
  timestamp: string;
  userCoordinates: { lat: number; lon: number };
  phantomCoordinates: { lat: number; lon: number };
  nearbyAnchors: string[];
  transmission: string;
  voiceProfile: string;
  style: TransmissionStyle;
}

// Application settings
export interface AppSettings {
  id?: number;
  radarRange: number;         // meters (250 - 10000)
  transmissionInterval: number; // seconds (30 - 300)
  staticIntensity: number;    // 0.0 - 1.0
  voiceVolume: number;        // 0.0 - 1.0
  autoPlay: boolean;
  movementThreshold: number;  // meters to trigger update
}

// Wiki cache entry
export interface WikiCache {
  id: string; // geohash tile
  articles: WikiArticle[];
  fetchedAt: number;
}

// Geolocation state
export interface GeolocationState {
  position: Position | null;
  error: GeolocationPositionError | null;
  isWatching: boolean;
  positionHistory: Position[];
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
}

// LLM state
export interface LLMState {
  isLoading: boolean;
  isReady: boolean;
  loadProgress: number;
  error: string | null;
  modelName: string | null;
}

// Audio state
export interface AudioState {
  isPlaying: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  staticIntensity: number;
}

// Generation state
export interface GenerationState {
  isGenerating: boolean;
  currentPhantom: PhantomLocation | null;
  lastGeneratedAt: number | null;
  queue: TransmissionLog[];
}

// Application view state
export type AppView = 'drift' | 'history' | 'settings' | 'onboarding';

// Bearing calculation result
export interface BearingInfo {
  bearing: number;
  distance: number;
  direction: string;
}

// LLM Configuration
export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  repetitionPenalty: number;
}

// Default values
export const DEFAULT_SETTINGS: AppSettings = {
  radarRange: 1000,
  transmissionInterval: 60,
  staticIntensity: 0.3,
  voiceVolume: 0.7,
  autoPlay: true,
  movementThreshold: 20,
};

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  model: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
  temperature: 0.9,
  maxTokens: 150,
  topP: 0.95,
  repetitionPenalty: 1.1,
};
