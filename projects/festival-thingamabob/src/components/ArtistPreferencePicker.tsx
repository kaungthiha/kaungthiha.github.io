import { useState, useEffect } from 'react';
import { FestivalSet, ArtistPreference, PreferenceLevel } from '../types/festival';
import { formatTimeRange } from '../lib/timeUtils';
import { STAGES } from '../lib/sampleData';

interface ArtistPreferencePickerProps {
  sets: FestivalSet[];
  preferences: ArtistPreference[];
  onPreferenceChange: (artist: string, level: PreferenceLevel) => void;
  selectedDay: string;
  firstSet: string;
  onFirstSetChange: (artist: string) => void;
}

const LEVEL_BUTTONS: Array<{ level: PreferenceLevel; emoji: string; label: string; color: string; activeColor: string }> = [
  { level: 'must-see', emoji: '💙', label: 'WE MUST SEE', color: 'border-blue-700 text-blue-400 hover:bg-blue-900/40', activeColor: 'bg-blue-700/60 border-blue-400 text-white shadow-glow-blue' },
  { level: 'nice-to-see', emoji: '👍', label: 'Good to see but could get tenders otherwise', color: 'border-cyan-800 text-cyan-400 hover:bg-cyan-900/40', activeColor: 'bg-cyan-700/50 border-cyan-400 text-white' },
  { level: 'neutral', emoji: '😐', label: 'Eh', color: 'border-slate-700 text-slate-400 hover:bg-slate-800/60', activeColor: 'bg-slate-700 border-slate-400 text-white' },
  { level: 'avoid', emoji: '🚫', label: 'Avoid', color: 'border-red-900 text-red-500 hover:bg-red-900/30', activeColor: 'bg-red-900/50 border-red-500 text-red-300' },
];

export function ArtistPreferencePicker({
  sets,
  preferences,
  onPreferenceChange,
  selectedDay,
  firstSet,
  onFirstSetChange,
}: ArtistPreferencePickerProps) {
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);

  useEffect(() => {
    setPendingSwitch(null);
  }, [selectedDay]);

  const daySets = sets.filter(s => s.day === selectedDay);

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

  function handleFirstSetClick(artist: string) {
    if (firstSet === artist) {
      onFirstSetChange('');
      setPendingSwitch(null);
    } else if (firstSet && firstSet !== artist) {
      setPendingSwitch(prev => prev === artist ? null : artist);
    } else {
      onFirstSetChange(artist);
    }
  }

  const mustSeeCount = preferences.filter(p => p.level === 'must-see').length;
  const niceSeeCount = preferences.filter(p => p.level === 'nice-to-see').length;
  const avoidCount = preferences.filter(p => p.level === 'avoid').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      {(mustSeeCount > 0 || niceSeeCount > 0 || avoidCount > 0) && (
        <div className="flex flex-wrap gap-2 px-4 py-3 bg-festival-card border border-festival-border rounded-xl text-sm">
          {firstSet && (
            <span className="flex items-center gap-1 text-amber-400">
              🏁 <strong>{firstSet}</strong>
            </span>
          )}
          {mustSeeCount > 0 && (
            <span className={`flex items-center gap-1 text-blue-400 ${firstSet ? 'ml-3' : ''}`}>
              💙 <strong>{mustSeeCount}</strong> WE MUST SEE
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
              const isFirstStop = firstSet === s.artist;
              const isPending = pendingSwitch === s.artist;

              return (
                <div
                  key={s.id}
                  className={`px-4 py-3 flex flex-col gap-2 transition-colors ${
                    isFirstStop
                      ? 'bg-amber-950/25 border-l-2 border-amber-500/70'
                      : currentLevel === 'must-see'
                      ? 'bg-blue-900/10'
                      : currentLevel === 'avoid'
                      ? 'bg-red-900/5 opacity-60'
                      : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Artist info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium truncate ${
                          isFirstStop
                            ? 'text-amber-200'
                            : currentLevel === 'must-see'
                            ? 'text-white'
                            : currentLevel === 'avoid'
                            ? 'text-slate-500 line-through'
                            : 'text-slate-200'
                        }`}>
                          {s.artist}
                        </span>
                        {isFirstStop && (
                          <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-500/40 text-amber-400 whitespace-nowrap flex-shrink-0">
                            ✦ First Stop
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatTimeRange(s.startTime, s.endTime)}
                        {s.genre && <span className="ml-2 text-slate-600">· {s.genre}</span>}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-1 flex-shrink-0 items-center">
                      {LEVEL_BUTTONS.map(btn => (
                        <button
                          key={btn.level}
                          onClick={() => onPreferenceChange(s.artist, btn.level)}
                          title={btn.label}
                          className={`px-2 py-1 rounded-lg border text-sm transition-all duration-150 ${
                            currentLevel === btn.level ? btn.activeColor : btn.color
                          }`}
                        >
                          {btn.emoji}
                        </button>
                      ))}

                      <div className="w-px h-5 bg-slate-700/60 mx-0.5" />

                      <button
                        onClick={() => handleFirstSetClick(s.artist)}
                        title={isFirstStop ? 'Remove as first stop' : 'Set as first stop of the day'}
                        className={`px-2 py-1 rounded-lg border text-sm transition-all duration-150 ${
                          isFirstStop
                            ? 'bg-amber-500/25 border-amber-500/60 text-amber-400'
                            : isPending
                            ? 'bg-amber-900/30 border-amber-700/50 text-amber-500'
                            : 'border-slate-700 text-slate-600 hover:border-amber-600/50 hover:text-amber-500'
                        }`}
                      >
                        🏁
                      </button>
                    </div>
                  </div>

                  {/* Inline confirm prompt */}
                  {isPending && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-700/30 text-xs">
                      <span className="text-amber-300 flex-1">
                        Switch first stop from <strong className="text-amber-200">{firstSet}</strong>?
                      </span>
                      <button
                        onClick={() => { onFirstSetChange(s.artist); setPendingSwitch(null); }}
                        className="px-2.5 py-1 rounded-lg bg-amber-600/40 border border-amber-500/50 text-amber-200 hover:bg-amber-600/60 transition-colors font-semibold whitespace-nowrap"
                      >
                        Yes, switch
                      </button>
                      <button
                        onClick={() => setPendingSwitch(null)}
                        className="text-slate-500 hover:text-slate-300 transition-colors px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
