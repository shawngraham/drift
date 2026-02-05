import type { VoiceProfile } from '../types';

/**
 * Audio Engine
 * Manages static layer and voice synthesis
 */

let audioContext: AudioContext | null = null;
let staticSource: AudioBufferSourceNode | null = null;
let staticGain: GainNode | null = null;
let masterGain: GainNode | null = null;
let isPlaying = false;
let currentIntensity = 0.3;

// Voice synthesis state
let currentUtterance: SpeechSynthesisUtterance | null = null;
let availableVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
let sonarInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize the audio context and load voices
 */
export async function initializeAudio(): Promise<void> {
  if (audioContext) return;

  audioContext = new AudioContext();

  // Set up gain nodes
  masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  masterGain.gain.value = 0.7;

  staticGain = audioContext.createGain();
  staticGain.connect(masterGain);
  staticGain.gain.value = currentIntensity;

  // Load voices
  await loadVoices();
}

/**
 * Load available speech synthesis voices
 */
async function loadVoices(): Promise<void> {
  return new Promise((resolve) => {
    const loadVoiceList = () => {
      availableVoices = speechSynthesis.getVoices();
      voicesLoaded = availableVoices.length > 0;
      if (voicesLoaded) resolve();
    };

    loadVoiceList();

    if (!voicesLoaded) {
      speechSynthesis.onvoiceschanged = () => {
        loadVoiceList();
        resolve();
      };

      // Fallback timeout
      setTimeout(resolve, 2000);
    }
  });
}

/**
 * Generate white noise buffer
 */
function createNoiseBuffer(duration: number = 2): AudioBuffer {
  if (!audioContext) throw new Error('Audio not initialized');

  const sampleRate = audioContext.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  // Pink noise (more natural than white)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = pink * 0.11;
  }

  return buffer;
}

/**
 * Start the static layer
 */
export function startStatic(): void {
  if (!audioContext || !staticGain || isPlaying) return;

  // Resume context if suspended
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const noiseBuffer = createNoiseBuffer();

  staticSource = audioContext.createBufferSource();
  staticSource.buffer = noiseBuffer;
  staticSource.loop = true;

  // Add a low-pass filter for that radio static feel
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000;

  staticSource.connect(filter);
  filter.connect(staticGain);
  staticSource.start();

  isPlaying = true;
}

/**
 * Stop the static layer
 */
export function stopStatic(): void {
  if (staticSource) {
    staticSource.stop();
    staticSource.disconnect();
    staticSource = null;
  }
  isPlaying = false;
}

/**
 * Set static intensity
 */
export function setStaticIntensity(intensity: number): void {
  currentIntensity = Math.max(0, Math.min(1, intensity));
  if (staticGain) {
    staticGain.gain.setValueAtTime(currentIntensity, audioContext?.currentTime || 0);
  }
}

/**
 * Set master volume
 */
export function setMasterVolume(volume: number): void {
  if (masterGain) {
    masterGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      audioContext?.currentTime || 0
    );
  }
}

/**
 * Create a "swell" effect before transmission
 */
export function swellStatic(duration: number = 0.5): void {
  if (!staticGain || !audioContext) return;

  const now = audioContext.currentTime;
  staticGain.gain.setValueAtTime(currentIntensity, now);
  staticGain.gain.linearRampToValueAtTime(currentIntensity * 2, now + duration * 0.3);
  staticGain.gain.linearRampToValueAtTime(currentIntensity * 0.5, now + duration);
}

/**
 * Select a voice profile for the transmission
 */
export function selectVoiceProfile(): VoiceProfile {
  if (!voicesLoaded || availableVoices.length === 0) {
    return {
      voice: null,
      pitch: 1.0,
      rate: 0.85,
      filterFreq: 1200,
      reverbMix: 0.5,
      name: 'default',
    };
  }

  // Prefer English voices
  const englishVoices = availableVoices.filter(
    (v) => v.lang.startsWith('en')
  );
  const voicePool = englishVoices.length > 0 ? englishVoices : availableVoices;

  // Select a random voice
  const voice = voicePool[Math.floor(Math.random() * voicePool.length)];

  // Randomize parameters for variety
  return {
    voice,
    pitch: 0.8 + Math.random() * 0.4,    // 0.8 - 1.2
    rate: 0.7 + Math.random() * 0.3,      // 0.7 - 1.0
    filterFreq: 800 + Math.random() * 1200, // 800 - 2000 Hz
    reverbMix: 0.3 + Math.random() * 0.4,   // 0.3 - 0.7
    name: voice.name,
  };
}

/**
 * Speak a transmission
 */
export function speakTransmission(
  text: string,
  profile: VoiceProfile
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Cancel any ongoing speech
    if (currentUtterance) {
      speechSynthesis.cancel();
    }

    // Swell static before speaking
    swellStatic(0.5);

    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(text);

    if (profile.voice) {
      currentUtterance.voice = profile.voice;
    }
    currentUtterance.pitch = profile.pitch;
    currentUtterance.rate = profile.rate;
    currentUtterance.volume = 0.9;

    currentUtterance.onend = () => {
      currentUtterance = null;
      resolve();
    };

    currentUtterance.onerror = (event) => {
      currentUtterance = null;
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };

    // Brief pause then speak
    setTimeout(() => {
      speechSynthesis.speak(currentUtterance!);
    }, 300);
  });
}

/**
 * Stop current speech
 */
export function stopSpeaking(): void {
  if (currentUtterance) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}

/**
 * Check if audio is playing
 */
export function isStaticPlaying(): boolean {
  return isPlaying;
}

/**
 * Play a "failed transmission" - static surge with no voice
 */
export function playFailedTransmission(): Promise<void> {
  return new Promise((resolve) => {
    if (!staticGain || !audioContext) {
      resolve();
      return;
    }

    const now = audioContext.currentTime;
    staticGain.gain.setValueAtTime(currentIntensity, now);
    staticGain.gain.linearRampToValueAtTime(currentIntensity * 3, now + 0.2);
    staticGain.gain.linearRampToValueAtTime(currentIntensity * 0.3, now + 0.8);
    staticGain.gain.linearRampToValueAtTime(currentIntensity, now + 1.5);

    setTimeout(resolve, 1500);
  });
}

/**
 * Play a single sonar ping sound
 */
export function playSonarPing(): void {
  if (!audioContext || !masterGain) return;

  // Resume context if suspended
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const now = audioContext.currentTime;

  // Create oscillator for the ping tone
  const oscillator = audioContext.createOscillator();
  const pingGain = audioContext.createGain();

  // Sonar-like frequency (around 1.5kHz)
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1500, now);
  oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);

  // Quick attack, longer decay
  pingGain.gain.setValueAtTime(0, now);
  pingGain.gain.linearRampToValueAtTime(0.15, now + 0.01);
  pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  oscillator.connect(pingGain);
  pingGain.connect(masterGain);

  oscillator.start(now);
  oscillator.stop(now + 0.5);
}

/**
 * Start sonar pings during generation
 */
export function startSonarPings(): void {
  if (sonarInterval) return;

  // Play first ping immediately
  playSonarPing();

  // Then ping every 2 seconds
  sonarInterval = setInterval(() => {
    playSonarPing();
  }, 2000);
}

/**
 * Stop sonar pings
 */
export function stopSonarPings(): void {
  if (sonarInterval) {
    clearInterval(sonarInterval);
    sonarInterval = null;
  }
}

/**
 * Get available voices
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return availableVoices;
}

/**
 * Cleanup audio resources
 */
export function disposeAudio(): void {
  stopStatic();
  stopSpeaking();
  stopSonarPings();
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  masterGain = null;
  staticGain = null;
}
