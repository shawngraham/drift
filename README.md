# Aethereal Drift

A psychogeographic exploration progressive web app (PWA) that transforms physical movement into transmissions from parallel dimensions. (PWA: you open in your phone's browser, and you can then pin it to your home screen.)

## Overview

As you walk, Aethereal Drift detects nearby Wikipedia geolocated articles—documented fragments of consensus reality—and generates uncanny textual transmissions from the conceptual *spaces between* these anchors. The app uses an on-device LLM to create brief, evocative descriptions of phantom locations that almost exist.

The experience is ambient and liminal: voices emerge from static, speaking of places that nearly happened, entities that flicker at the edge of perception.

## Features

- **On-Device AI**: Uses WebLLM (Phi-3-mini) for fully offline text generation after initial model download
- **Geolocation Tracking**: Monitors position and heading with configurable movement thresholds
- **Wikipedia Integration**: Fetches nearby geolocated articles via the Geosearch API
- **Phantom Coordinates**: Generates locations in the "negative space" between documented places
- **Audio Engine**: Pink noise static layer with processed speech synthesis
- **Radar Display**: Animated compass showing nearby anchors and phantom locations
- **Transmission Log**: History of received transmissions with export functionality
- **PWA**: Installable, works offline after initial setup

## Getting Started

### Prerequisites

- Node.js 18+
- A browser with WebGPU support (Chrome 113+, Edge 113+) for AI features

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Usage

1. Open the app and complete the onboarding flow
2. Grant location permissions when prompted
3. Optionally load the AI model (requires WebGPU)
4. Start walking to receive transmissions
5. Tap the audio button to hear static and voice synthesis

## Architecture

```
src/
├── components/      # React components
│   ├── Radar/       # Animated radar/compass display
│   ├── TransmissionLog/  # History panel
│   ├── Settings/    # Configuration panel
│   └── Onboarding/  # Initial setup flow
├── hooks/           # Custom React hooks
│   ├── useGeolocation   # Position tracking
│   ├── useWikipedia     # Article fetching
│   ├── useLLM           # Model management
│   ├── useAudio         # Static & voice
│   └── useTransmissions # Generation orchestration
├── services/        # Core business logic
│   ├── database     # IndexedDB via Dexie.js
│   ├── wikipedia    # Geosearch API client
│   ├── latentEngine # Phantom generation & prompts
│   ├── llm          # WebLLM integration
│   ├── audioEngine  # Web Audio & Speech APIs
│   └── logWriter    # Export functionality
├── stores/          # Zustand state management
├── types/           # TypeScript interfaces
└── utils/           # Helper functions
```

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **Storage**: Dexie.js (IndexedDB)
- **LLM**: WebLLM (Phi-3-mini)
- **Audio**: Web Audio API + Web Speech API
- **PWA**: vite-plugin-pwa with Workbox

## Configuration

Settings are accessible via the gear icon:

- **Radar Range**: 250m - 10km detection radius
- **Transmission Interval**: 30s - 5min between auto-generations
- **Voice Volume**: 0-100%
- **Static Intensity**: 0-100%
- **Auto-play**: Toggle automatic transmission generation

## Privacy

- All processing happens on-device after initial setup
- Location data is stored only locally in IndexedDB
- No analytics or tracking
- Wikipedia API calls are the only network requests post-installation

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview build
npm run lint     # Run ESLint
npm run format   # Run Prettier
```

## License

MIT

---

*"The map is not the territory, but between the maps lie territories unmapped."*
