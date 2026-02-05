import { useEffect, useState, useRef } from 'react';
import { useAppStore } from './stores/appStore';
import { useGeolocation } from './hooks/useGeolocation';
import { useWikipedia } from './hooks/useWikipedia';
import { useTransmissions } from './hooks/useTransmissions';
import { useAudio } from './hooks/useAudio';
import { Radar } from './components/Radar';
import { TransmissionLog } from './components/TransmissionLog';
import { Settings } from './components/Settings';
import { Onboarding } from './components/Onboarding';
import { getSettings } from './services/database';
import { formatCoordinates } from './utils/coordinates';

function App() {
  const {
    currentView,
    setView,
    hasCompletedOnboarding,
    position,
    isGenerating,
    currentTransmission,
    nearbyArticles,
    llmState,
    setSettings,
  } = useAppStore();

  // Calculate radar size based on screen
  const [radarSize, setRadarSize] = useState(280);
  const [showGhostMessage, setShowGhostMessage] = useState(false);
  const previousTransmissionRef = useRef(currentTransmission);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Leave room for controls and transmission text
      const maxSize = Math.min(width - 32, height - 280, 320);
      setRadarSize(Math.max(200, maxSize));
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Show ghost message when new transmission is logged
  useEffect(() => {
    if (currentTransmission && currentTransmission !== previousTransmissionRef.current) {
      previousTransmissionRef.current = currentTransmission;
      setShowGhostMessage(true);
      const timeout = setTimeout(() => setShowGhostMessage(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [currentTransmission]);

  // Initialize hooks
  useGeolocation();
  useWikipedia();
  const { generate } = useTransmissions();
  const { toggle, isPlaying, isSpeaking } = useAudio();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await getSettings();
      setSettings(savedSettings);
    };
    loadSettings();
  }, [setSettings]);

  // Show onboarding if not completed
  if (!hasCompletedOnboarding || currentView === 'onboarding') {
    return <Onboarding />;
  }

  // Show history or settings panels
  if (currentView === 'history') {
    return <TransmissionLog />;
  }

  if (currentView === 'settings') {
    return <Settings />;
  }

  // Main drift view - optimized for mobile
  return (
    <div className="h-screen flex flex-col bg-bg-primary text-text-primary overflow-hidden">
      {/* Top controls bar */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-phosphor/20 bg-bg-secondary/30">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* History button */}
          <button
            onClick={() => setView('history')}
            className="p-2 text-phosphor/60 hover:text-phosphor active:scale-90 active:text-phosphor transition-all"
            aria-label="Transmission history"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggle}
            className={`p-2 rounded-full border transition-all active:scale-90 ${
              isPlaying
                ? 'bg-phosphor/20 border-phosphor text-phosphor active:bg-phosphor/40'
                : 'border-phosphor/30 text-phosphor/60 hover:border-phosphor/60 active:border-phosphor'
            } ${isSpeaking ? 'animate-pulse' : ''}`}
            aria-label={isPlaying ? 'Stop audio' : 'Start audio'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* Manual generate button */}
          <button
            onClick={() => generate()}
            disabled={isGenerating || !llmState.isReady}
            className={`p-2 transition-all ${
              isGenerating || !llmState.isReady
                ? 'text-text-secondary/30 cursor-not-allowed'
                : 'text-phosphor/60 hover:text-phosphor active:scale-90 active:text-phosphor'
            }`}
            aria-label="Generate transmission"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Settings button */}
          <button
            onClick={() => setView('settings')}
            className="p-2 text-phosphor/60 hover:text-phosphor active:scale-90 active:text-phosphor transition-all"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content - scrollable if needed */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto">
        {/* Radar */}
        <div className="flex-shrink-0 py-3">
          <Radar size={radarSize} />
        </div>

        {/* Status info */}
        <div className="flex-shrink-0 text-center space-y-1 font-mono text-xs px-4">
          {/* Position */}
          {position ? (
            <div className="text-phosphor/60">
              {formatCoordinates(position.latitude, position.longitude)}
            </div>
          ) : (
            <div className="text-amber/60">Acquiring position...</div>
          )}

          {/* Nearby articles count */}
          <div className="text-phosphor/40">
            {nearbyArticles.length} anchors in range
          </div>

          {/* Generation status */}
          {isGenerating && (
            <div className="text-amber animate-pulse text-sm">RECEIVING TRANSMISSION...</div>
          )}

          {/* LLM status */}
          {!llmState.isReady && !llmState.isLoading && (
            <div className="text-text-secondary/60">
              AI model not loaded
            </div>
          )}
        </div>

        {/* Current transmission */}
        {currentTransmission && !isGenerating && (
          <div className="flex-shrink-0 mx-4 mt-3 mb-4 max-w-md p-3 bg-bg-secondary/50 border border-phosphor/20 rounded-lg">
            <blockquote className="text-text-primary italic text-sm leading-relaxed">
              "{currentTransmission.transmission}"
            </blockquote>
            <div className="mt-2 text-xs text-phosphor/40 font-mono">
              [{currentTransmission.style.replace('_', ' ').toUpperCase()}]
            </div>
          </div>
        )}
      </div>

      {/* Ghost message notification */}
      {showGhostMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-phosphor/10 border border-phosphor/30 rounded-full animate-pulse">
          <span className="text-phosphor/70 text-xs font-mono tracking-wider">
            TRANSCRIBED TO AUTO-LOG
          </span>
        </div>
      )}
    </div>
  );
}

export default App;
