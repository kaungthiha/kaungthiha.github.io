import { useState } from 'react';
import { ConflictExplanation } from '../types/festival';
import { formatTimeRange } from '../lib/timeUtils';
import { InfoTip } from './InfoTip';

interface ConflictPanelProps {
  conflicts: ConflictExplanation[];
  onForceIn?: (artist: string) => void;
  pinnedArtists?: string[];
}

export function ConflictPanel({ conflicts, onForceIn, pinnedArtists }: ConflictPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (conflicts.length === 0) {
    return (
      <div className="bg-festival-card border border-green-800/40 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <div className="font-semibold text-green-400">Flock Intact 🐑 </div>
          <div className="text-sm text-slate-500">All your must-see sheep are good.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-festival-card border border-red-800/40 rounded-xl overflow-hidden">
      <div
        className="px-4 py-3 flex items-center justify-between hover:bg-red-900/10 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="text-left">
            <div className="flex items-center gap-2 font-semibold text-red-400">
              {conflicts.length} Lost Sheep
              <InfoTip text="Must-see artists whose sets overlap with other sets the algorithm chose. Use 'fight the algo' to force them in, or adjust preferences and re-herd." />
            </div>
            <div className="text-xs text-slate-500">
              Must-see artists that slipped out of the herd
            </div>
          </div>
        </div>
        <span className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>

      {expanded && (
        <div className="border-t border-festival-border divide-y divide-festival-border/50">
          {conflicts.map(conflict => {
            const missed = conflict.conflictingSets[0];
            const chosen = conflict.conflictingSets.slice(1);
            const isForced = pinnedArtists?.includes(missed.artist) ?? false;

            return (
              <div key={conflict.id} className="px-4 py-4">
                <div className="flex flex-wrap gap-2 items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{missed.artist}</span>
                      {isForced ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/50 text-amber-400">
                          🔒 override active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 border border-red-700/50 text-red-400">
                          🐑 sheep we'll miss
                        </span>
                      )}
                      {onForceIn && (
                        <button
                          onClick={() => onForceIn(missed.artist)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            isForced
                              ? 'border-slate-700 text-slate-600 hover:border-red-700/50 hover:text-red-400'
                              : 'border-amber-700/50 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40'
                          }`}
                          title={isForced ? 'Remove override — let algo decide' : 'Fight the algo — force this set in, sheep > computer'}
                        >
                          {isForced ? 'Release' : '✊ fight the algo'}
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {missed.stage} · {formatTimeRange(missed.startTime, missed.endTime)}
                    </div>
                  </div>

                  {chosen.length > 0 && (
                    <div className="flex-1 min-w-0">
                      {chosen.map(c => (
                        <div key={c.id}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-200">{c.artist}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 border border-green-700/50 text-green-400">
                              herded ✓
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {c.stage} · {formatTimeRange(c.startTime, c.endTime)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-festival-border/50">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {conflict.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
