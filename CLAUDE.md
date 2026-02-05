# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aethereal Drift is a psychogeographic exploration PWA that transforms physical movement into "transmissions from a parallel dimension." As users walk, the app detects nearby Wikipedia geolocated articles and uses an on-device LLM to generate uncanny text about the conceptual "spaces between" these real-world anchors. Generated transmissions are read aloud through processed speech synthesis layered over ambient static.

## Tech Stack

- **Framework:** Vite + TypeScript
- **Styling:** Tailwind CSS (custom dark theme with phosphor-green aesthetic)
- **State:** Zustand
- **Storage:** Dexie.js (IndexedDB wrapper)
- **LLM:** WebLLM (Phi-3-mini or TinyLlama) or Transformers.js as fallback
- **Audio:** Web Audio API (static/effects) + Web Speech API (voice synthesis)
- **PWA:** vite-plugin-pwa with Workbox

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Run Prettier
npm run test         # Run tests
```

## Architecture

```
src/
├── components/      # React components (Radar/, TransmissionLog/, Settings/)
├── hooks/           # Custom hooks (useGeolocation, useWikipedia, useLLM, useAudio)
├── services/        # Core services (latentEngine, audioEngine, logWriter)
├── stores/          # Zustand stores (appStore)
├── utils/           # Helpers (coordinates, prompts)
└── types/           # TypeScript interfaces
```

### Core Data Flow

1. **Geolocation Watcher** → tracks user position and heading
2. **Wikipedia Fetcher** → queries geosearch API, caches in IndexedDB
3. **Latent Engine** → generates phantom coordinates in "negative space" between real articles, constructs LLM prompts
4. **On-Device LLM** → generates 2-4 sentence "transmissions" (no server calls)
5. **Audio Engine** → plays continuous static, processes and speaks transmissions
6. **Log Writer** → persists transmission history locally

### Key Interfaces

```typescript
interface Position {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number;
  timestamp: number;
}

interface WikiArticle {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
}

interface TransmissionLog {
  timestamp: string;
  userCoordinates: { lat: number; lon: number };
  phantomCoordinates: { lat: number; lon: number };
  nearbyAnchors: string[];
  transmission: string;
  voiceProfile: string;
}
```

## Design Principles

- **Offline-first:** All processing on-device after initial load. No server communication post-installation.
- **Privacy:** Location data stored only locally. No analytics or tracking.
- **Ambient/Liminal UX:** Minimal UI, immersion first. Dark theme (#0a0a0a), phosphor green (#00ff41), monospace typography.
- **The generated content describes what is NOT documented** — interpolating the conceptual negative space between real Wikipedia articles.

## External APIs

- **Wikipedia Geosearch:** `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord={lat}|{lon}&gsradius={radius}&gslimit=50&format=json`
- **Geolocation API:** `navigator.geolocation.watchPosition`
- **Device Orientation:** `DeviceOrientationEvent` for compass heading

## Performance Targets

- Initial load (cached): <3s
- LLM generation: <5s
- Radar frame rate: 60fps
- Battery impact: <15% per hour
