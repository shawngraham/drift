import { useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { updateSettings, clearTransmissions, clearAllData } from '../../services/database';
import { downloadTextLog, downloadJSONLog } from '../../services/logWriter';

/**
 * Settings Panel
 */
export function Settings() {
  const { settings, setSettings, setView, setRecentTransmissions } = useAppStore();

  const handleSettingChange = useCallback(
    async (key: keyof typeof settings, value: number | boolean) => {
      setSettings({ [key]: value });
      await updateSettings({ [key]: value });
    },
    [setSettings]
  );

  const handleClearTransmissions = useCallback(async () => {
    if (confirm('Clear all transmission history? This cannot be undone.')) {
      await clearTransmissions();
      setRecentTransmissions([]);
    }
  }, [setRecentTransmissions]);

  const handleClearAllData = useCallback(async () => {
    if (
      confirm(
        'Clear ALL data including settings, cache, and history? This cannot be undone.'
      )
    ) {
      await clearAllData();
      window.location.reload();
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-phosphor/20">
        <h2 className="text-phosphor font-mono text-lg">SETTINGS</h2>
        <button
          onClick={() => setView('drift')}
          className="text-phosphor/60 hover:text-phosphor transition-colors"
        >
          [CLOSE]
        </button>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Radar Range */}
        <SettingGroup title="RADAR RANGE">
          <RangeSlider
            value={settings.radarRange}
            min={250}
            max={10000}
            step={250}
            onChange={(v) => handleSettingChange('radarRange', v)}
            formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}km` : `${v}m`)}
          />
        </SettingGroup>

        {/* Transmission Interval */}
        <SettingGroup title="TRANSMISSION INTERVAL">
          <RangeSlider
            value={settings.transmissionInterval}
            min={30}
            max={300}
            step={15}
            onChange={(v) => handleSettingChange('transmissionInterval', v)}
            formatValue={(v) => `${v}s`}
          />
        </SettingGroup>

        {/* Audio Settings */}
        <SettingGroup title="AUDIO">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-secondary mb-2 block">
                Voice Volume
              </label>
              <RangeSlider
                value={settings.voiceVolume}
                min={0}
                max={1}
                step={0.1}
                onChange={(v) => handleSettingChange('voiceVolume', v)}
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-2 block">
                Static Intensity
              </label>
              <RangeSlider
                value={settings.staticIntensity}
                min={0}
                max={1}
                step={0.1}
                onChange={(v) => handleSettingChange('staticIntensity', v)}
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />
            </div>
            <Toggle
              label="Auto-play transmissions"
              value={settings.autoPlay}
              onChange={(v) => handleSettingChange('autoPlay', v)}
            />
          </div>
        </SettingGroup>

        {/* Movement */}
        <SettingGroup title="MOVEMENT THRESHOLD">
          <RangeSlider
            value={settings.movementThreshold}
            min={5}
            max={100}
            step={5}
            onChange={(v) => handleSettingChange('movementThreshold', v)}
            formatValue={(v) => `${v}m`}
          />
          <p className="text-xs text-text-secondary mt-2">
            Minimum movement before position updates
          </p>
        </SettingGroup>

        {/* Export */}
        <SettingGroup title="EXPORT">
          <div className="flex gap-2">
            <button
              onClick={() => downloadTextLog()}
              className="flex-1 py-2 px-4 bg-phosphor/10 text-phosphor border border-phosphor/30 rounded hover:bg-phosphor/20 transition-colors text-sm"
            >
              Download Text Log
            </button>
            <button
              onClick={() => downloadJSONLog()}
              className="flex-1 py-2 px-4 bg-phosphor/10 text-phosphor border border-phosphor/30 rounded hover:bg-phosphor/20 transition-colors text-sm"
            >
              Download JSON
            </button>
          </div>
        </SettingGroup>

        {/* Danger Zone */}
        <SettingGroup title="DATA" danger>
          <div className="space-y-2">
            <button
              onClick={handleClearTransmissions}
              className="w-full py-2 px-4 bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/30 transition-colors text-sm"
            >
              Clear Transmission History
            </button>
            <button
              onClick={handleClearAllData}
              className="w-full py-2 px-4 bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/30 transition-colors text-sm"
            >
              Clear All Data
            </button>
          </div>
        </SettingGroup>

        {/* About */}
        <div className="pt-4 border-t border-phosphor/10 text-center">
          <h3 className="text-phosphor text-sm font-mono">AETHEREAL DRIFT</h3>
          <p className="text-xs text-text-secondary mt-1">v0.1.0 — Liminal Cartography</p>
          <p className="text-xs text-phosphor/40 mt-2 italic">
            "The map is not the territory, but between the maps lie territories unmapped."
          </p>
        </div>
      </div>
    </div>
  );
}

interface SettingGroupProps {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}

function SettingGroup({ title, children, danger }: SettingGroupProps) {
  return (
    <div className="space-y-3">
      <h3
        className={`text-xs font-mono ${danger ? 'text-red-400' : 'text-phosphor/60'}`}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
}

function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: RangeSliderProps) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-phosphor"
      />
      <span className="text-phosphor font-mono text-sm w-16 text-right">
        {formatValue(value)}
      </span>
    </div>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-text-primary">{label}</span>
      <div
        className={`w-12 h-6 rounded-full relative transition-colors ${
          value ? 'bg-phosphor/30' : 'bg-bg-secondary'
        }`}
        onClick={() => onChange(!value)}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
            value ? 'left-7 bg-phosphor' : 'left-1 bg-text-secondary'
          }`}
        />
      </div>
    </label>
  );
}

export default Settings;
