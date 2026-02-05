# Aethereal Drift

## Implementation TODO

**Project Status:** Planning  
**Target MVP:** 4-6 weeks

---

## Phase 0: Project Setup

### Environment & Tooling
- [ ] Initialize project with Vite + TypeScript
- [ ] Configure PWA plugin (vite-plugin-pwa)
- [ ] Set up Tailwind CSS with custom theme
- [ ] Configure ESLint + Prettier
- [ ] Set up basic CI/CD (GitHub Actions)
- [ ] Create project structure:
  ```
  src/
  ├── components/
  │   ├── Radar/
  │   ├── TransmissionLog/
  │   └── Settings/
  ├── hooks/
  │   ├── useGeolocation.ts
  │   ├── useWikipedia.ts
  │   ├── useLLM.ts
  │   └── useAudio.ts
  ├── services/
  │   ├── latentEngine.ts
  │   ├── audioEngine.ts
  │   └── logWriter.ts
  ├── stores/
  │   └── appStore.ts
  ├── utils/
  │   ├── coordinates.ts
  │   └── prompts.ts
  └── types/
      └── index.ts
  ```

### Dependencies to Evaluate
- [ ] **LLM Runtime:** Test WebLLM vs Transformers.js vs MediaPipe
  - [ ] Benchmark Phi-3-mini on target devices
  - [ ] Benchmark Gemma-2B on target devices
  - [ ] Measure model download size and time
  - [ ] Test cold start vs warm start inference
- [ ] **State Management:** Zustand (lightweight, good for this scale)
- [ ] **Audio:** Tone.js vs raw Web Audio API
- [ ] **Storage:** IndexedDB wrapper (Dexie.js recommended)

---

## Phase 1: Core Infrastructure

### 1.1 Geolocation System
**Priority: HIGH | Effort: 2-3 days**

- [ ] Create `useGeolocation` hook
  ```typescript
  interface GeolocationState {
    position: Position | null;
    heading: number | null;
    error: GeolocationError | null;
    isWatching: boolean;
    positionHistory: Position[];
  }
  ```
- [ ] Implement position watching with configurable options
- [ ] Handle permission states (prompt, denied, granted)
- [ ] Create fallback for devices without heading data
- [ ] Implement movement threshold detection (only update on significant move)
- [ ] Add position history buffer (last N positions for trajectory)
- [ ] Test on iOS Safari and Android Chrome
- [ ] Handle backgrounding gracefully

**Acceptance Criteria:**
- Position updates within 1 second of movement
- Graceful degradation without heading data
- Clear permission prompts with explanation

### 1.2 Wikipedia Integration
**Priority: HIGH | Effort: 2-3 days**

- [ ] Create Wikipedia API service
  ```typescript
  interface WikiService {
    fetchNearby(lat: number, lon: number, radius: number): Promise<WikiArticle[]>;
    getArticleExcerpt(pageId: number): Promise<string>;  // For enhanced context
  }
  ```
- [ ] Implement geosearch query
- [ ] Set up IndexedDB caching layer
  - [ ] Cache by location tile (don't re-fetch for small movements)
  - [ ] Implement cache expiry (24 hours)
- [ ] Handle API errors and rate limiting
- [ ] Create `useWikipedia` hook that integrates with geolocation
- [ ] Fetch minimal data (title, coords, distance only for v1)
- [ ] Consider pre-fetching in movement direction

**Acceptance Criteria:**
- Articles fetched within 2 seconds of position update
- Works offline with cached data
- No redundant API calls for minor position changes

### 1.3 Data Storage
**Priority: MEDIUM | Effort: 1-2 days**

- [ ] Set up Dexie.js with schema
  ```typescript
  interface DB {
    wikiCache: Table<{
      id: string;  // geohash tile
      articles: WikiArticle[];
      fetchedAt: number;
    }>;
    transmissions: Table<TransmissionLog>;
    settings: Table<AppSettings>;
  }
  ```
- [ ] Implement transmission log storage
- [ ] Create export functionality (JSONL + formatted text)
- [ ] Add clear data function
- [ ] Implement settings persistence

---

## Phase 2: LLM Integration

### 2.1 Model Selection & Setup
**Priority: HIGH | Effort: 3-5 days**

- [ ] **Research & Decision**
  - [ ] Test WebLLM with Phi-3-mini-4k-instruct
  - [ ] Test WebLLM with TinyLlama-1.1B
  - [ ] Measure: download size, load time, inference speed, quality
  - [ ] Document device compatibility matrix
  - [ ] Choose primary model + fallback

- [ ] **WebLLM Integration** (if chosen)
  - [ ] Install @mlc-ai/web-llm
  - [ ] Create model loading service with progress callback
  - [ ] Implement model caching (Service Worker)
  - [ ] Handle WebGPU availability detection
  - [ ] Create fallback for non-WebGPU devices

- [ ] **Alternative: Transformers.js** (if WebLLM not viable)
  - [ ] Install @xenova/transformers
  - [ ] Configure ONNX runtime
  - [ ] Test with phi-3-mini ONNX export

### 2.2 Latent Engine
**Priority: HIGH | Effort: 3-4 days**

- [ ] Implement phantom coordinate generation
  ```typescript
  function generatePhantomLocation(
    userPos: Position,
    articles: WikiArticle[]
  ): PhantomLocation {
    // Find conceptual "negative space"
    // Apply dimensional drift
    // Return phantom coordinates
  }
  ```
- [ ] Create prompt templates
  - [ ] Base system prompt with style guidelines
  - [ ] Dynamic prompt constructor from articles
  - [ ] Style variations (fragment, catalog, field note, signal)
- [ ] Implement generation pipeline
  ```typescript
  async function generateTransmission(
    position: Position,
    articles: WikiArticle[],
    style: TransmissionStyle
  ): Promise<Transmission>
  ```
- [ ] Add generation queue (prevent overlapping generations)
- [ ] Implement retry logic for failed generations
- [ ] Create transmission deduplication (avoid repeats)

**Prompt Engineering TODO:**
- [ ] Draft 5 style variations
- [ ] Test prompt effectiveness across models
- [ ] Add negative prompts (avoid clichés, avoid harmful content)
- [ ] Tune temperature and sampling parameters
- [ ] Document prompt iteration results

### 2.3 Generation Triggers
**Priority: MEDIUM | Effort: 1-2 days**

- [ ] Implement trigger conditions:
  - [ ] New articles enter radius (threshold: 2+ new articles)
  - [ ] Significant position change (default: 50m)
  - [ ] Time-based (minimum interval: 30s)
  - [ ] Article configuration change (different anchors in range)
- [ ] Create trigger debouncing
- [ ] Add manual trigger option (tap to receive transmission)

---

## Phase 3: Audio System

### 3.1 Static Layer
**Priority: MEDIUM | Effort: 2-3 days**

- [ ] Create noise generator using Web Audio API
  ```typescript
  class StaticGenerator {
    private context: AudioContext;
    private noiseNode: AudioWorkletNode;
    private gainNode: GainNode;
    
    start(): void;
    stop(): void;
    setIntensity(value: number): void;
    modulateWithMovement(speed: number): void;
  }
  ```
- [ ] Implement white/pink noise generation
- [ ] Add subtle modulation (LFO on filter frequency)
- [ ] Create "swell" effect (volume increase before transmission)
- [ ] Tie intensity to user movement speed
- [ ] Ensure loop is seamless

### 3.2 Voice Synthesis
**Priority: HIGH | Effort: 2-3 days**

- [ ] Create voice management system
  ```typescript
  interface VoiceManager {
    getAvailableVoices(): SpeechSynthesisVoice[];
    selectVoiceForTransmission(): VoiceProfile;
    speak(text: string, profile: VoiceProfile): Promise<void>;
  }
  ```
- [ ] Enumerate and categorize available voices
- [ ] Implement voice selection algorithm (varied, not random)
- [ ] Configure pitch/rate variations per profile
- [ ] Handle voice loading (some are async)
- [ ] Test across browsers (voice availability varies)

### 3.3 Audio Processing Chain
**Priority: MEDIUM | Effort: 2-3 days**

- [ ] Set up audio processing graph
  ```
  Voice Output → MediaStreamDestination → 
    Low-pass Filter → Reverb (ConvolverNode) → 
    Compressor → Gain → Static Mix → Destination
  ```
- [ ] Create or source reverb impulse response
- [ ] Implement low-pass filter with dynamic frequency
- [ ] Add subtle distortion for "radio" effect
- [ ] Create crossfade between static and voice
- [ ] Implement transmission queue (play sequentially)
- [ ] Add "failed transmission" effect (static surge, no voice)

### 3.4 Audio Controls
**Priority: LOW | Effort: 1 day**

- [ ] Volume control
- [ ] Static intensity control
- [ ] Voice/static balance
- [ ] Mute toggle
- [ ] Handle audio context state (suspended on mobile)

---

## Phase 4: Visual Interface

### 4.1 Radar/Compass Component
**Priority: HIGH | Effort: 4-5 days**

- [ ] Create base radar component (Canvas or SVG)
  ```typescript
  interface RadarProps {
    position: Position;
    heading: number;
    articles: WikiArticle[];
    phantomLocation: PhantomLocation | null;
    range: number;  // meters
  }
  ```
- [ ] Implement features:
  - [ ] Range rings (250m, 500m, 1000m)
  - [ ] Cardinal direction markers
  - [ ] Heading indicator / compass rotation
  - [ ] Article markers (positioned by bearing/distance)
  - [ ] Marker sizing by proximity
  - [ ] Phantom location indicator (pulsing)
  - [ ] Scan line animation
  - [ ] User position marker (center)

- [ ] Visual polish:
  - [ ] Phosphor green color scheme
  - [ ] CRT scanline effect (CSS or canvas)
  - [ ] Glow effects on markers
  - [ ] Smooth rotation animation
  - [ ] Fade in/out for markers entering/leaving range

- [ ] Optimize for 60fps on mobile
- [ ] Handle device orientation API
- [ ] Fallback for devices without compass

### 4.2 Transmission Display
**Priority: MEDIUM | Effort: 2 days**

- [ ] Create transmission overlay
  - [ ] Text appears with typing effect
  - [ ] Coordinates displayed
  - [ ] Anchor articles listed
  - [ ] Auto-fade after reading
- [ ] Implement transmission history panel
  - [ ] Swipe-up gesture
  - [ ] Scrollable list
  - [ ] Tap to replay audio
- [ ] Add "receiving" animation during generation

### 4.3 Settings Panel
**Priority: LOW | Effort: 1-2 days**

- [ ] Create settings UI
  - [ ] Range slider (250m - 10km)
  - [ ] Transmission frequency
  - [ ] Audio settings
  - [ ] Export log button
  - [ ] Clear data button
  - [ ] About/info
- [ ] Implement swipe-down gesture
- [ ] Persist settings to IndexedDB

### 4.4 Onboarding Flow
**Priority: MEDIUM | Effort: 1-2 days**

- [ ] Create onboarding screens:
  1. Concept introduction
  2. Location permission request (with explanation)
  3. Model download progress
  4. Ready state
- [ ] Handle first-run detection
- [ ] Style consistently with app theme

### 4.5 Visual Theme
**Priority: MEDIUM | Effort: 1-2 days**

- [ ] Implement color palette
  ```css
  :root {
    --bg-primary: #0a0a0a;
    --phosphor-green: #00ff41;
    --phosphor-dim: #00aa2a;
    --amber: #ffb000;
    --text-primary: #e0e0e0;
  }
  ```
- [ ] Add monospace typography (JetBrains Mono)
- [ ] Create CRT effect (scanlines, slight curvature)
- [ ] Add subtle noise texture
- [ ] Implement glow effects

---

## Phase 5: PWA & Offline

### 5.1 Service Worker
**Priority: HIGH | Effort: 2-3 days**

- [ ] Configure Workbox via vite-plugin-pwa
- [ ] Cache strategy:
  - [ ] App shell: Cache first
  - [ ] Wikipedia API: Network first, cache fallback
  - [ ] LLM model: Cache only (after download)
- [ ] Implement model caching
- [ ] Handle updates gracefully
- [ ] Test offline functionality

### 5.2 Manifest & Installation
**Priority: MEDIUM | Effort: 1 day**

- [ ] Create manifest.json
  ```json
  {
    "name": "Aethereal Drift",
    "short_name": "Drift",
    "theme_color": "#0a0a0a",
    "background_color": "#0a0a0a",
    "display": "standalone",
    "orientation": "portrait"
  }
  ```
- [ ] Create app icons (all sizes)
- [ ] Add splash screens
- [ ] Test installation flow

---

## Phase 6: Testing & Polish

### 6.1 Testing
**Priority: HIGH | Effort: 3-4 days**

- [ ] Unit tests:
  - [ ] Coordinate calculations
  - [ ] Prompt generation
  - [ ] Phantom coordinate generation
- [ ] Integration tests:
  - [ ] Geolocation → Wikipedia → LLM flow
  - [ ] Audio pipeline
- [ ] E2E tests:
  - [ ] Basic user flow (Playwright)
- [ ] Device testing:
  - [ ] iOS Safari (iPhone 12+)
  - [ ] Android Chrome (recent)
  - [ ] Test on lower-end devices
- [ ] Performance profiling

### 6.2 Accessibility
**Priority: MEDIUM | Effort: 1-2 days**

- [ ] Screen reader support for transmissions
- [ ] High contrast mode option
- [ ] Reduce motion option (disable animations)
- [ ] Keyboard navigation (where applicable)

### 6.3 Error Handling
**Priority: HIGH | Effort: 2 days**

- [ ] Graceful handling of:
  - [ ] Location permission denied
  - [ ] No internet (initial load)
  - [ ] Model load failure
  - [ ] API errors
  - [ ] Generation failures
  - [ ] Audio context issues
- [ ] User-friendly error messages
- [ ] Recovery paths for all error states

### 6.4 Performance Optimization
**Priority: MEDIUM | Effort: 2 days**

- [ ] Profile and optimize:
  - [ ] Radar rendering
  - [ ] LLM inference
  - [ ] Memory usage
  - [ ] Battery consumption
- [ ] Implement throttling where needed
- [ ] Optimize bundle size

---

## Milestones

### MVP (Week 4)
- [ ] Geolocation working
- [ ] Wikipedia fetch working
- [ ] Basic LLM generation working
- [ ] Text-to-speech working (no effects)
- [ ] Basic radar display
- [ ] Log writing

### Beta (Week 6)
- [ ] Full audio system with static
- [ ] Polished radar UI
- [ ] Settings panel
- [ ] PWA installable
- [ ] Offline capable

### v1.0 (Week 8)
- [ ] All features complete
- [ ] Performance optimized
- [ ] Tested on multiple devices
- [ ] Onboarding flow
- [ ] Documentation

---

## Open Questions

1. **Model Choice:** Need to test Phi-3 vs Gemma vs TinyLlama for quality/speed tradeoff
2. **Voice Availability:** Web Speech API voices vary by device—need fallback strategy
3. **Battery Impact:** Need to measure and potentially add "low power" mode
4. **iOS Restrictions:** Confirm WebGPU/Web Speech work as expected on iOS
5. **Generation Quality:** May need prompt iteration to get desired uncanny tone

---

## Resources

### Documentation
- [WebLLM](https://github.com/mlc-ai/web-llm)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Wikipedia API](https://www.mediawiki.org/wiki/API:Geosearch)
- [Device Orientation](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent)

### Inspiration
- *The Atrocity Exhibition* (J.G. Ballard) — fragmentary prose
- *House of Leaves* — footnotes and marginalia
- Numbers Stations — uncanny broadcast aesthetic
- SCP Foundation — clinical documentation of impossible things
- Roadside Picnic — zones and artifacts

---

## Notes

```
Remember: The goal is not to describe what exists, 
but to give voice to the spaces between.
The map is not the territory, but between the maps 
lie territories unmapped.
```
