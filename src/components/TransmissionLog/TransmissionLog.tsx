import { useTransmissions } from '../../hooks/useTransmissions';
import { useAppStore } from '../../stores/appStore';
import { formatCoordinates } from '../../utils/coordinates';
import type { TransmissionLog as TransmissionLogType } from '../../types';

/**
 * Transmission History Panel
 */
export function TransmissionLog() {
  const { recentTransmissions, currentTransmission, replay } = useTransmissions();
  const { setView } = useAppStore();

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-phosphor/20">
        <h2 className="text-phosphor font-mono text-lg">TRANSMISSION LOG</h2>
        <button
          onClick={() => setView('drift')}
          className="text-phosphor/60 hover:text-phosphor transition-colors"
        >
          [CLOSE]
        </button>
      </div>

      {/* Current transmission */}
      {currentTransmission && (
        <div className="p-4 border-b border-amber/30 bg-amber/5">
          <div className="text-amber text-xs mb-2">CURRENT TRANSMISSION</div>
          <TransmissionCard
            transmission={currentTransmission}
            onReplay={() => replay(currentTransmission)}
            isCurrent
          />
        </div>
      )}

      {/* Transmission list */}
      <div className="flex-1 overflow-y-auto">
        {recentTransmissions.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            <p className="text-phosphor/40 mb-2">No transmissions received</p>
            <p className="text-sm">Walk to begin receiving signals from adjacent dimensions</p>
          </div>
        ) : (
          <div className="divide-y divide-phosphor/10">
            {recentTransmissions.map((transmission) => (
              <div key={transmission.id} className="p-4">
                <TransmissionCard
                  transmission={transmission}
                  onReplay={() => replay(transmission)}
                  isCurrent={transmission.id === currentTransmission?.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TransmissionCardProps {
  transmission: TransmissionLogType;
  onReplay: () => void;
  isCurrent?: boolean;
}

function TransmissionCard({ transmission, onReplay, isCurrent }: TransmissionCardProps) {
  const date = new Date(transmission.timestamp);
  const timeStr = date.toLocaleTimeString('en-US', { hour12: false });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      className={`group ${isCurrent ? 'bg-phosphor/5 rounded p-3 -m-3' : ''}`}
    >
      {/* Metadata */}
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-phosphor/60 font-mono">
          <span className="text-phosphor">[{timeStr}]</span> {dateStr}
        </div>
        <button
          onClick={onReplay}
          className="opacity-0 group-hover:opacity-100 text-xs text-phosphor/60 hover:text-phosphor transition-all"
        >
          [REPLAY]
        </button>
      </div>

      {/* Coordinates */}
      <div className="text-xs text-text-secondary mb-2 font-mono">
        <div>POS: {formatCoordinates(transmission.userCoordinates.lat, transmission.userCoordinates.lon)}</div>
        <div className="text-amber/60">
          PHN: {formatCoordinates(transmission.phantomCoordinates.lat, transmission.phantomCoordinates.lon)}
        </div>
      </div>

      {/* Anchors */}
      {transmission.nearbyAnchors.length > 0 && (
        <div className="text-xs text-phosphor/40 mb-2">
          [{transmission.nearbyAnchors.slice(0, 3).join(' | ')}]
        </div>
      )}

      {/* Transmission text */}
      <blockquote className="text-text-primary italic border-l-2 border-phosphor/30 pl-3 text-sm">
        "{transmission.transmission}"
      </blockquote>

      {/* Style tag */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 bg-phosphor/10 text-phosphor/60 rounded uppercase">
          {transmission.style.replace('_', ' ')}
        </span>
        {transmission.voiceProfile && transmission.voiceProfile !== 'default' && (
          <span className="text-xs text-text-secondary">
            Voice: {transmission.voiceProfile}
          </span>
        )}
      </div>
    </div>
  );
}

export default TransmissionLog;
