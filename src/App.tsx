import { useEffect } from 'react';
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

  // Main drift view
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Radar */}
        <div className="mb-8">
          <Radar size={Math.min(window.innerWidth - 40, 320)} />
        </div>

        {/* Status info */}
        <div className="text-center space-y-2 font-mono text-sm">
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
            <div className="text-amber animate-pulse">RECEIVING TRANSMISSION...</div>
          )}

          {/* LLM status */}
          {!llmState.isReady && !llmState.isLoading && (
            <div className="text-text-secondary/60 text-xs">
              AI model not loaded
            </div>
          )}
        </div>

        {/* Current transmission */}
        {currentTransmission && !isGenerating && (
          <div className="mt-6 max-w-md p-4 bg-bg-secondary/50 border border-phosphor/20 rounded-lg">
            <blockquote className="text-text-primary italic text-sm leading-relaxed">
              "{currentTransmission.transmission}"
            </blockquote>
            <div className="mt-2 text-xs text-phosphor/40 font-mono">
              [{currentTransmission.style.replace('_', ' ').toUpperCase()}]
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="p-4 border-t border-phosphor/20 bg-bg-secondary/30">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* History button */}
          <button
            onClick={() => setView('history')}
            className="p-3 text-phosphor/60 hover:text-phosphor transition-colors"
            aria-label="Transmission history"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggle}
            className={`p-4 rounded-full border-2 transition-all ${
              isPlaying
                ? 'bg-phosphor/20 border-phosphor text-phosphor'
                : 'border-phosphor/30 text-phosphor/60 hover:border-phosphor/60'
            } ${isSpeaking ? 'animate-pulse' : ''}`}
            aria-label={isPlaying ? 'Stop audio' : 'Start audio'}
          >
            {isPlaying ? (
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            )}
          </button>

          {/* Manual generate button */}
          <button
            onClick={() => generate()}
            disabled={isGenerating || !llmState.isReady}
            className={`p-3 transition-colors ${
              isGenerating || !llmState.isReady
                ? 'text-text-secondary/30 cursor-not-allowed'
                : 'text-phosphor/60 hover:text-phosphor'
            }`}
            aria-label="Generate transmission"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Settings button */}
          <button
            onClick={() => setView('settings')}
            className="p-3 text-phosphor/60 hover:text-phosphor transition-colors"
            aria-label="Settings"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
