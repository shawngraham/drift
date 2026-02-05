# Aethereal Drift

## Specification Document

**Version:** 0.1.0  
**Codename:** *Liminal Cartography*

---

## Vision

Aethereal Drift is a psychogeographic exploration tool that transforms physical movement through space into a journey through the latent dimensions of machine consciousness. As users walk, the app detects nearby Wikipedia geolocated articles—documented fragments of consensus reality—and uses the conceptual *spaces between* these anchors to generate uncanny textual transmissions from a parallel dimension.

The experience is fundamentally ambient and liminal: voices emerge from static, speaking of places that almost exist, events that nearly happened, entities that flicker at the edge of perception. The user becomes a receiver, a walker between worlds, leaving behind a log of phantom coordinates and aethereal snippets—a map of nowhere.

---

## Core Concepts

### The Latent Space Between

The central generative mechanism does not describe *what exists*, but interpolates *what might exist in the gaps*. Given two or more nearby Wikipedia articles (e.g., "St. Mary's Church" and "River Thames"), the app does not summarize these. Instead, it prompts the on-device LLM to generate content that exists in the conceptual negative space—the unwritten, the adjacent possible, the phantom.

This is achieved by:
1. Extracting semantic anchors from nearby articles (titles, categories, brief context)
2. Constructing prompts that explicitly ask for *what is not documented*
3. Generating coordinates that exist between real coordinates (phantom locations)
4. Producing text that feels like intercepted transmissions from elsewhere

### Aethereal Transmissions

Generated snippets are styled as:
- Fragmentary field notes from parallel surveyors
- Intercepted radio transmissions
- Catalog entries from impossible museums
- Whispered memories of places that forgot themselves
- Technical readouts from instruments measuring nothing

### The Static Presence

All audio output exists within an ambient layer of static—not silence, but *almost-presence*. This creates:
- A sense of tuning into frequencies
- Plausible deniability for the uncanny (is it real or interference?)
- Continuity between transmissions
- An atmosphere of liminality

---

## Technical Architecture

### Platform

Progressive Web App (PWA) targeting mobile devices with:
- Offline-first architecture (all processing on-device)
- No server communication post-installation
- Full functionality without internet after initial load

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     AETHEREAL DRIFT                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Geolocation │───▶│  Wikipedia   │───▶│   Latent    │     │
│  │    Watcher   │    │   Fetcher    │    │   Engine    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                                      │            │
│         │                                      ▼            │
│         │                              ┌─────────────┐     │
│         │                              │  On-Device  │     │
│         │                              │     LLM     │     │
│         │                              └─────────────┘     │
│         │                                      │            │
│         ▼                                      ▼            │
│  ┌─────────────┐                       ┌─────────────┐     │
│  │   Radar/    │                       │   Audio     │     │
│  │   Compass   │                       │   Engine    │     │
│  └─────────────┘                       └─────────────┘     │
│                                               │            │
│                                               ▼            │
│                                        ┌─────────────┐     │
│                                        │    Log      │     │
│                                        │   Writer    │     │
│                                        └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. Geolocation Watcher

**API:** Geolocation API (`navigator.geolocation.watchPosition`)

**Behavior:**
- High accuracy mode enabled
- Updates on significant movement (configurable threshold, default 20m)
- Tracks heading for compass orientation
- Maintains position history for trajectory analysis

**Data Structure:**
```typescript
interface Position {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number;
  timestamp: number;
}
```

### 2. Wikipedia Fetcher

**API:** Wikipedia Geosearch API (fetched at app load, cached locally)

**Endpoint:**
```
https://en.wikipedia.org/w/api.php?action=query&list=geosearch
  &gscoord={lat}|{lon}&gsradius={radius}&gslimit=50&format=json
```

**Behavior:**
- Queries on position update
- Caches results in IndexedDB
- Radius configurable (default: 1000m, max: 10000m)
- Fetches basic article metadata only (title, pageid, coordinates, distance)

**Data Structure:**
```typescript
interface WikiArticle {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;  // distance from user in meters
  primary: string;  // category hint if available
}
```

### 3. Latent Engine

The conceptual core. Transforms real-world anchors into prompts for phantom generation.

**Input:** Array of nearby WikiArticles + current position
**Output:** Generative prompt + phantom coordinates

**Phantom Coordinate Generation:**
```typescript
function generatePhantomCoordinates(
  articles: WikiArticle[], 
  userPos: Position
): PhantomLocation {
  // Find centroid of "negative space"
  // Add controlled randomness
  // Ensure phantom is BETWEEN articles, not on them
  // Apply slight dimensional drift (coordinates that "shouldn't exist")
}
```

**Prompt Construction:**

The prompt explicitly instructs the LLM to generate content for what is *not* documented:

```
You are a receiver tuned to frequencies from adjacent dimensions.

Nearby anchors in consensus reality:
- {article1.title} ({article1.dist}m, bearing {bearing1}°)
- {article2.title} ({article2.dist}m, bearing {bearing2}°)
- {article3.title} ({article3.dist}m, bearing {bearing3}°)

You are located in the space BETWEEN these documented places.
Your coordinates: {phantom.lat}, {phantom.lon}

Generate a brief transmission (2-4 sentences) describing what exists 
at your phantom location—something adjacent to but distinct from 
the documented anchors. This is not summary. This is interstitial. 
Speak as if reporting from a place that almost exists.

Style: [fragmentary / catalog entry / field note / intercepted signal]
Tone: [liminal / uncanny / matter-of-fact-yet-wrong]
```

### 4. On-Device LLM

**Options (in order of preference):**

1. **WebLLM** (transformers compiled to WebGPU)
   - Models: Phi-3-mini, Gemma-2B, TinyLlama
   - Pros: True on-device, no server
   - Cons: Requires WebGPU support, initial model download

2. **Transformers.js** (ONNX runtime in browser)
   - Models: Various small models via Hugging Face
   - Pros: Broader compatibility
   - Cons: Slower inference

3. **MediaPipe LLM Inference** (Google's on-device solution)
   - Pros: Optimized for mobile
   - Cons: Limited model selection

**Requirements:**
- Model size: <2GB for reasonable mobile download
- Inference time: <5 seconds per generation
- Context window: 512+ tokens sufficient
- No external API calls—fully air-gapped after model load

**Configuration:**
```typescript
interface LLMConfig {
  model: string;
  temperature: 0.9;  // High for creativity
  maxTokens: 150;
  topP: 0.95;
  repetitionPenalty: 1.1;
}
```

### 5. Audio Engine

**Components:**

1. **Static Layer** (continuous)
   - Web Audio API oscillators + noise generators
   - Subtle modulation tied to movement speed
   - Volume: Low but always present (configurable)

2. **Voice Synthesizer**
   - Web Speech API (`speechSynthesis`)
   - Multiple voices selected pseudo-randomly
   - Pitch/rate variations per transmission
   - Processed through audio effects

3. **Effect Chain:**
   ```
   Voice → Low-pass Filter → Reverb → Compressor → Static Mix → Output
   ```

4. **Voice Selection:**
   ```typescript
   interface VoiceProfile {
     voice: SpeechSynthesisVoice;
     pitch: number;      // 0.8 - 1.2
     rate: number;       // 0.7 - 1.0
     filterFreq: number; // 800 - 2000 Hz
     reverbMix: number;  // 0.3 - 0.7
   }
   ```

**Behavior:**
- Transmissions queue and play sequentially
- Minimum gap between transmissions (configurable, default 30s)
- Static swells slightly before voice begins
- Occasional "failed transmissions" (static surge, no voice)

### 6. Radar/Compass Display

**Visual Design:**

```
        N
        │
   ╭────┼────╮
   │    │    │
W ─┼────●────┼─ E    ● = User position
   │    │    │       ◆ = Wiki articles (sized by proximity)
   │    │    │       ○ = Phantom location (pulsing)
   ╰────┼────╰
        │
        S
```

**Features:**
- Rotates with device heading (using DeviceOrientationEvent)
- Wikipedia articles shown as markers with distance
- Phantom generation point pulses when active
- Range rings at 250m, 500m, 1000m
- Dark theme with phosphor-green aesthetic (think old radar)
- Subtle scan line animation

**Technical:**
- Canvas or SVG rendering
- RequestAnimationFrame for smooth rotation
- Optimized for 60fps on mobile

### 7. Log Writer

**Output Format:**

```typescript
interface TransmissionLog {
  timestamp: string;           // ISO 8601
  userCoordinates: {
    lat: number;
    lon: number;
  };
  phantomCoordinates: {
    lat: number;
    lon: number;
  };
  nearbyAnchors: string[];     // Article titles
  transmission: string;        // Generated text
  voiceProfile: string;        // Voice used
}
```

**Storage:**
- Appended to local file (via File System Access API or download)
- Format: JSONL (one JSON object per line) or formatted text
- Option to export as single file

**Export Format (Human-Readable):**
```
═══════════════════════════════════════════════════════════════
TRANSMISSION LOG: AETHEREAL DRIFT
Generated: 2025-02-04T14:32:00Z
═══════════════════════════════════════════════════════════════

[14:32:00] Position: 51.5074° N, 0.1278° W
           Phantom: 51.5076° N, 0.1275° W (Dimension Drift: +0.0002°)
           Anchors: Tower of London, Thames Path, All Hallows Church
           
           "The surveyor's notes mention a fourth tower, unlisted. 
            Its shadow falls on water that remembers being land. 
            Coordinates confirmed but unlocatable."

───────────────────────────────────────────────────────────────

[14:35:22] Position: 51.5080° N, 0.1265° W
           ...
```

---

## User Interface

### Screens

1. **Main Screen (Drift Mode)**
   - Full-screen radar/compass
   - Minimal UI—immersion first
   - Swipe up: Recent transmissions
   - Swipe down: Settings
   - Tap: Toggle audio

2. **Transmission History**
   - Scrollable list of recent transmissions
   - Tap to replay audio
   - Map view showing phantom locations

3. **Settings**
   - Radar range (250m - 10km)
   - Transmission frequency
   - Voice settings
   - Static intensity
   - Export log
   - Clear data

4. **Onboarding**
   - Brief explanation of concept
   - Permission requests (location)
   - Model download progress

### Visual Language

- **Color Palette:** Deep black (#0a0a0a), phosphor green (#00ff41), amber (#ffb000)
- **Typography:** Monospace (e.g., JetBrains Mono, IBM Plex Mono)
- **Effects:** CRT scanlines, subtle noise texture, glow effects
- **Animations:** Radar sweep, signal pulse, text "typing" effect

---

## Privacy & Ethics

### Data Handling
- **No data leaves device** after initial Wikipedia fetch
- Location data stored only locally
- No analytics, no tracking
- User can delete all data instantly

### Transparency
- Clear explanation that generated content is machine-fabricated
- No attempt to present transmissions as real
- Artistic/experiential framing, not deceptive

### Content Safety
- LLM prompted to avoid harmful/disturbing content
- System prompt includes guardrails
- Generated content is ambient/atmospheric, not narrative-heavy

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial load (cached) | <3s |
| Model load (first run) | <60s on 4G |
| Position update latency | <1s |
| Generation time | <5s |
| Frame rate (radar) | 60fps |
| Battery impact | <15% per hour active use |
| Offline functionality | 100% after initial setup |

---

## Future Considerations

### Phase 2
- Multiple "frequency bands" (different prompt styles)
- Collaborative phantom maps (opt-in sharing)
- AR overlay mode
- Custom voice packs

### Phase 3
- Integration with other geolocated datasets (OpenStreetMap, historical maps)
- Time-based variations (different at night)
- "Signal strength" based on article density

---

## Appendix: Sample Transmissions

**Near: British Museum, Russell Square, University of London**
> "Catalog entry 7,291-B: Object removed from display. 
> Described as 'stone that remembers forward.' 
> Location: Gallery between galleries. 
> Status: Present but unobservable."

**Near: Golden Gate Bridge, Fort Point, Presidio**
> "The fog here has weight. Surveyor reports 
> coordinates that shift with humidity. 
> Bridge visible from neither end. 
> Recommend classification: infrastructural phantom."

**Near: Shibuya Crossing, Hachiko Statue, Tower Records**
> "Frequency analysis confirms: one pedestrian 
> crosses in both directions simultaneously. 
> Subject unaware. Intersection geometry 
> non-Euclidean during peak hours."

---

*"The map is not the territory, but between the maps lie territories unmapped."*
