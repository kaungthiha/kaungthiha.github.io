import { FestivalSet, ArtistPreference, PreferenceLevel } from '../types/festival';
import { formatTimeRange } from '../lib/timeUtils';
import { STAGES } from '../lib/sampleData';

interface ArtistPreferencePickerProps {
  sets: FestivalSet[];
  preferences: ArtistPreference[];
  onPreferenceChange: (artist: string, level: PreferenceLevel) => void;
  selectedDay: string;
}

const LEVEL_BUTTONS: Array<{ level: PreferenceLevel; emoji: string; label: string; color: string; activeColor: string }> = [
  { level: 'must-see', emoji: '💙', label: 'Must See', color: 'border-blue-700 text-blue-400 hover:bg-blue-900/40', activeColor: 'bg-blue-700/60 border-blue-400 text-white shadow-glow-blue' },
  { level: 'nice-to-see', emoji: '👍', label: 'Nice', color: 'border-cyan-800 text-cyan-400 hover:bg-cyan-900/40', activeColor: 'bg-cyan-700/50 border-cyan-400 text-white' },
  { level: 'neutral', emoji: '😐', label: 'Neutral', color: 'border-slate-700 text-slate-400 hover:bg-slate-800/60', activeColor: 'bg-slate-700 border-slate-400 text-white' },
  { level: 'avoid', emoji: '🚫', label: 'Avoid', color: 'border-red-900 text-red-500 hover:bg-red-900/30', activeColor: 'bg-red-900/50 border-red-500 text-red-300' },
];

export function ArtistPreferencePicker({
  sets,
  preferences,
  onPreferenceChange,
  selectedDay,
}: ArtistPreferencePickerProps) {
  const daySets = sets.filter(s => s.day === selectedDay);

  // Group by stage in STAGES order
  const byStage: Record<string, FestivalSet[]> = {};
  for (const stage of STAGES) {
    const stageSets = daySets.filter(s => s.stage === stage).sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
    if (stageSets.length > 0) {
      byStage[stage] = stageSets;
    }
  }

  function getLevel(artist: string): PreferenceLevel {
    return preferences.find(p => p.artist === artist)?.level ?? 'neutral';
  }

  // Summary counts
  const mustSeeCount = preferences.filter(p => p.level === 'must-see').length;
  const niceSeeCount = preferences.filter(p => p.level === 'nice-to-see').length;
  const avoidCount = preferences.filter(p => p.level === 'avoid').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      {(mustSeeCount > 0 || niceSeeCount > 0 || avoidCount > 0) && (
        <div className="flex flex-wrap gap-2 px-4 py-3 bg-festival-card border border-festival-border rounded-xl text-sm">
          {mustSeeCount > 0 && (
            <span className="flex items-center gap-1 text-blue-400">
              💙 <strong>{mustSeeCount}</strong> must-see
            </span>
          )}
          {niceSeeCount > 0 && (
            <span className="flex items-center gap-1 text-cyan-400 ml-3">
              👍 <strong>{niceSeeCount}</strong> nice-to-see
            </span>
          )}
          {avoidCount > 0 && (
            <span className="flex items-center gap-1 text-red-400 ml-3">
              🚫 <strong>{avoidCount}</strong> avoid
            </span>
          )}
        </div>
      )}

      {/* Artist list grouped by stage */}
      {Object.entries(byStage).map(([stage, stageSets]) => (
        <div key={stage} className="bg-festival-card border border-festival-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gradient-to-r from-festival-blue/10 to-transparent border-b border-festival-border">
            <h3 className="text-sm font-semibold text-festival-blue uppercase tracking-wider">
              {stage}
            </h3>
          </div>
          <div className="divide-y divide-festival-border/50">
            {stageSets.map(s => {
              const currentLevel = getLevel(s.artist);
              return (
                <div
                  key={s.id}
                  className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                    currentLevel === 'must-see'
                      ? 'bg-blue-900/10'
                      : currentLevel === 'avoid'
                      ? 'bg-red-900/5 opacity-60'
                      : ''
                  }`}
                >
                  {/* Artist info */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${
                      currentLevel === 'must-see'
                        ? 'text-white'
                        : currentLevel === 'avoid'
                        ? 'text-slate-500 line-through'
                        : 'text-slate-200'
                    }`}>
                      {s.artist}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatTimeRange(s.startTime, s.endTime)}
                      {s.genre && <span className="ml-2 text-slate-600">· {s.genre}</span>}
                    </div>
                  </div>

                  {/* Preference buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    {LEVEL_BUTTONS.map(btn => (
                      <button
                        key={btn.level}
                        onClick={() => onPreferenceChange(s.artist, btn.level)}
                        title={btn.label}
                        className={`px-2 py-1 rounded-lg border text-sm transition-all duration-150 ${
                          currentLevel === btn.level
                            ? btn.activeColor
                            : btn.color
                        }`}
                      >
                        {btn.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
