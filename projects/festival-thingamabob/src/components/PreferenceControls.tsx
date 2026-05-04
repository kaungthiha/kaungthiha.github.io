import { UserPreferences } from '../types/festival';

interface PreferenceControlsProps {
  preferences: UserPreferences;
  onChange: (prefs: UserPreferences) => void;
}

const WALKING_OPTIONS = [5, 10, 15, 20] as const;
const MIN_SET_OPTIONS = [20, 30, 45] as const;

export function PreferenceControls({ preferences, onChange }: PreferenceControlsProps) {
  function setWalking(minutes: number) {
    onChange({ ...preferences, defaultWalkingMinutes: minutes });
  }

  function togglePartial() {
    onChange({ ...preferences, allowPartialSets: !preferences.allowPartialSets });
  }

  function setMinSet(minutes: number) {
    onChange({ ...preferences, minimumSetMinutes: minutes });
  }

  return (
    <div className="bg-festival-card border border-festival-border rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-gradient-to-r from-festival-cyan/10 to-transparent border-b border-festival-border">
        <h3 className="text-sm font-semibold text-festival-cyan uppercase tracking-wider">
          🐑 Herd Settings
        </h3>
      </div>

      <div className="p-4 space-y-5">
        {/* Walking buffer */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Trekking Time Between Stages
          </label>
          <div className="flex gap-2">
            {WALKING_OPTIONS.map(min => (
              <button
                key={min}
                onClick={() => setWalking(min)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${
                  preferences.defaultWalkingMinutes === min
                    ? 'bg-festival-cyan/20 border-festival-cyan text-festival-cyan'
                    : 'border-festival-border text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {min}m
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            How long does it take da sheep to roll between stages?
          </p>
        </div>

        {/* Partial sets toggle */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-300">Allow Late Arrival</label>
              <p className="text-xs text-slate-600 mt-0.5">
                Run to catch the other half of the show gdmnit
              </p>
            </div>
            <button
              onClick={togglePartial}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                preferences.allowPartialSets ? 'bg-festival-blue' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  preferences.allowPartialSets ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Minimum set time — only relevant when partial sets are on */}
        <div className={preferences.allowPartialSets ? '' : 'opacity-40 pointer-events-none'}>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Minimum Time @ Stage worth trekking for
          </label>
          <div className="flex gap-2">
            {MIN_SET_OPTIONS.map(min => (
              <button
                key={min}
                onClick={() => setMinSet(min)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${
                  preferences.minimumSetMinutes === min
                    ? 'bg-festival-blue/20 border-festival-blue text-festival-blue'
                    : 'border-festival-border text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {min}m
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            Not worth running for anything less, sheep logic
          </p>
        </div>
      </div>
    </div>
  );
}
