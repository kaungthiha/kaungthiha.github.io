import { useState } from 'react';
import { ConflictExplanation } from '../types/festival';
import { formatTimeRange } from '../lib/timeUtils';

interface ConflictPanelProps {
  conflicts: ConflictExplanation[];
}

export function ConflictPanel({ conflicts }: ConflictPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (conflicts.length === 0) {
    return (
      <div className="bg-festival-card border border-green-800/40 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <div className="font-semibold text-green-400">No Conflicts</div>
          <div className="text-sm text-slate-500">All your must-see artists fit your itinerary.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-festival-card border border-red-800/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-900/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="text-left">
            <div className="font-semibold text-red-400">
              {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-slate-500">
              Must-see artists that couldn't be scheduled
            </div>
          </div>
        </div>
        <span className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="border-t border-festival-border divide-y divide-festival-border/50">
          {conflicts.map(conflict => {
            const missed = conflict.conflictingSets[0];
            const chosen = conflict.conflictingSets.slice(1);

            return (
              <div key={conflict.id} className="px-4 py-4">
                <div className="flex flex-wrap gap-2 items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{missed.artist}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 border border-red-700/50 text-red-400">
                        missed
                      </span>
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
                              chosen
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
