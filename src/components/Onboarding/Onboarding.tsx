import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useLLM } from '../../hooks/useLLM';
import { useAudio } from '../../hooks/useAudio';
import { playSonarPing } from '../../services/audioEngine';
import { isMobileDevice } from '../../services/transformersLLM';

type OnboardingStep = 'intro' | 'location' | 'model' | 'ready';

/**
 * Onboarding Flow
 */
export function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>('intro');
  const { setView, setHasCompletedOnboarding } = useAppStore();

  const { requestPermission, permissionState } = useGeolocation();
  const {
    initialize: initLLM,
    isLoading,
    loadProgress,
    error: llmError,
  } = useLLM();
  const { initialize: initAudio, start: startAudio } = useAudio();

  const handleRequestLocation = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      setStep('model');
    }
  }, [requestPermission]);

  const handleLoadModel = useCallback(async () => {
    await initLLM();
    await initAudio();
    setStep('ready');
  }, [initLLM, initAudio]);

  const handleComplete = useCallback(async () => {
    // Start audio (static layer) when entering drift mode
    await startAudio();
    // Play a sonar ping to confirm audio is working
    setTimeout(() => playSonarPing(), 300);
    setHasCompletedOnboarding(true);
    setView('drift');
  }, [setHasCompletedOnboarding, setView, startAudio]);

  const handleSkipModel = useCallback(async () => {
    await initAudio();
    setStep('ready');
  }, [initAudio]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-8 bg-bg-primary" style={{ minHeight: '100dvh' }}>
      <div className="max-w-md w-full space-y-8">
        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-phosphor text-3xl font-mono tracking-wider">
            AETHEREAL DRIFT
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Liminal Cartography v0.1.0
          </p>
        </div>

        {/* Steps */}
        <div className="bg-bg-secondary/50 rounded-lg p-6 border border-phosphor/20">
          {step === 'intro' && (
            <IntroStep onContinue={() => setStep('location')} />
          )}

          {step === 'location' && (
            <LocationStep
              onRequest={handleRequestLocation}
              permissionState={permissionState}
            />
          )}

          {step === 'model' && (
            <ModelStep
              onLoad={handleLoadModel}
              onSkip={handleSkipModel}
              isLoading={isLoading}
              progress={loadProgress}
              error={llmError}
            />
          )}

          {step === 'ready' && <ReadyStep onStart={handleComplete} />}
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2">
          {(['intro', 'location', 'model', 'ready'] as OnboardingStep[]).map(
            (s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  s === step
                    ? 'bg-phosphor'
                    : i < ['intro', 'location', 'model', 'ready'].indexOf(step)
                    ? 'bg-phosphor/50'
                    : 'bg-text-secondary/30'
                }`}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function IntroStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4 text-text-primary">
        <p>
          You are about to become a receiver, tuned to frequencies from adjacent
          dimensions.
        </p>
        <p className="text-text-secondary text-sm">
          As you walk, this app detects documented locations nearby—places that
          exist in consensus reality. But between these anchors lie spaces that
          are not documented. Gaps in the map.
        </p>
        <p className="text-text-secondary text-sm">
          Aethereal Drift generates transmissions from these phantom
          locations—brief signals describing what might exist in the spaces
          between.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 bg-phosphor/20 text-phosphor border border-phosphor/50 rounded hover:bg-phosphor/30 transition-colors font-mono"
      >
        BEGIN CALIBRATION
      </button>
    </div>
  );
}

function LocationStep({
  onRequest,
  permissionState,
}: {
  onRequest: () => void;
  permissionState: string;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-phosphor/10 border border-phosphor/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-phosphor"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h3 className="text-phosphor font-mono text-lg">LOCATION ACCESS</h3>
      </div>

      <p className="text-text-secondary text-sm text-center">
        To detect nearby documented locations and generate phantom coordinates,
        we need access to your position. Your location data never leaves your
        device.
      </p>

      {permissionState === 'denied' ? (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded text-center">
          <p className="text-red-400 text-sm">
            Location access was denied. Please enable it in your browser settings.
          </p>
        </div>
      ) : (
        <button
          onClick={onRequest}
          className="w-full py-3 bg-phosphor/20 text-phosphor border border-phosphor/50 rounded hover:bg-phosphor/30 transition-colors font-mono"
        >
          GRANT LOCATION ACCESS
        </button>
      )}
    </div>
  );
}

function ModelStep({
  onLoad,
  onSkip,
  isLoading,
  progress,
  error,
}: {
  onLoad: () => void;
  onSkip: () => void;
  isLoading: boolean;
  progress: number;
  error: string | null;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Track loading time to show helpful messages
  useEffect(() => {
    if (!isLoading) {
      setLoadingTime(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-phosphor/10 border border-phosphor/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-phosphor"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-phosphor font-mono text-lg">AI MODEL</h3>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-phosphor transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-center text-phosphor/60 text-sm font-mono">
            LOADING MODEL... {Math.round(progress * 100)}%
          </p>
          <p className="text-center text-text-secondary text-xs">
            {loadingTime < 10
              ? 'Articulating with the Ethereal Plane...'
              : loadingTime < 30
              ? 'Downloading neural patterns... (this may take a moment)'
              : loadingTime < 60
              ? 'Still working... large models take time to download'
              : 'This is taking a while. Check your connection if it stalls.'}
          </p>
          {isMobile && loadingTime > 20 && (
            <p className="text-center text-amber/60 text-xs">
              Mobile devices may take longer. Keep this tab active.
            </p>
          )}
        </div>
      ) : error ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-900/20 border border-red-900/50 rounded">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          {isMobile && (
            <p className="text-amber/60 text-xs text-center">
              Mobile browsers have limited memory. Try closing other tabs/apps.
            </p>
          )}
          <button
            onClick={onLoad}
            className="w-full py-3 bg-phosphor/20 text-phosphor border border-phosphor/50 rounded hover:bg-phosphor/30 transition-colors font-mono"
          >
            RETRY
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            Continue without AI
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-text-secondary text-sm text-center">
            Load the on-device AI model to generate unique transmissions. The
            model runs entirely on your device—no data is sent to any server.
          </p>

          {isMobile && (
            <div className="p-3 bg-amber/10 border border-amber/30 rounded">
              <p className="text-amber/80 text-xs text-center">
                Mobile device detected. Model loading may take 1-2 minutes.
                Keep screen on and tab active.
              </p>
            </div>
          )}

          <div className="p-3 bg-phosphor/10 border border-phosphor/30 rounded">
            <p className="text-phosphor/80 text-xs text-center">
              Spectral Engine: ~270MB download
            </p>
          </div>

          <button
            onClick={onLoad}
            className="w-full py-3 bg-phosphor/20 text-phosphor border border-phosphor/50 rounded hover:bg-phosphor/30 transition-colors font-mono"
          >
            LOAD AI MODEL
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}

function ReadyStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-phosphor/20 border border-phosphor flex items-center justify-center animate-pulse">
        <svg
          className="w-8 h-8 text-phosphor"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div>
        <h3 className="text-phosphor font-mono text-lg">CALIBRATION COMPLETE</h3>
        <p className="text-text-secondary text-sm mt-2">
          You are now tuned to adjacent frequencies.
        </p>
      </div>

      <p className="text-phosphor/60 text-sm italic">
        Begin walking to receive transmissions from the spaces between.
      </p>

      <button
        onClick={onStart}
        className="w-full py-3 bg-phosphor text-bg-primary font-mono rounded hover:bg-phosphor/90 transition-colors"
      >
        START DRIFT
      </button>
    </div>
  );
}

export default Onboarding;
