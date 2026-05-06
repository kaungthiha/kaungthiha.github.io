import { useMemo } from 'react';
import { FestivalSet, ItineraryItem } from '../types/festival';
import { formatTime, getDurationMinutes } from '../lib/timeUtils';

const STAGE_COLORS: Record<string, string> = {
  'Kinetic Field':   'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
  'Circuit Grounds': 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  'Cosmic Meadow':   'bg-green-900/40 text-green-300 border-green-700/50',
  'Neon Garden':     'bg-pink-900/40 text-pink-300 border-pink-700/50',
  'Basspod':         'bg-red-900/40 text-red-300 border-red-700/50',
  'Wasteland':       'bg-orange-900/40 text-orange-300 border-orange-700/50',
  'Quantum Valley':  'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
  'Stereo Bloom':    'bg-teal-900/40 text-teal-300 border-teal-700/50',
  'Bionic Jungle':   'bg-lime-900/40 text-lime-300 border-lime-700/50',
};

const SWAP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

interface SwapModalProps {
  item: ItineraryItem;           // the set being swapped out
  allSets: FestivalSet[];        // full day lineup
  currentItineraryArtists: string[]; // to exclude already-scheduled sets
  onConfirm: (incoming: FestivalSet) => void;
  onClose: () => void;
}

export function SwapModal({ item, allSets, currentItineraryArtists, onConfirm, onClose }: SwapModalProps) {
  const candidates = useMemo(() => {
    return allSets.filter(s => {
      if (s.artist === item.artist) return false;
      if (currentItineraryArtists.includes(s.artist)) return false;
      // Within 30 min: the start times are within SWAP_WINDOW_MS of each other
      const diff = Math.abs(s.startTime.getTime() - item.startTime.getTime());
      return diff <= SWAP_WINDOW_MS;
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [item, allSets, currentItineraryArtists]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden flex flex-col"
        style={{ backgroundColor: '#0a0a0f', borderColor: '#1e1e2e', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-festival-border flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-white text-base">Swap Set</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Replacing <span className="text-slate-300 font-semibold">{item.artist}</span>
                {' '}· {formatTime(item.startTime)}
                {item.stage && <> · {item.stage}</>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 text-lg leading-none mt-0.5"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs text-slate-500 flex items-center gap-2">
            <span>🕐</span>
            <span>Showing sets starting within <span className="text-slate-400 font-semibold">30 minutes</span> of this slot — not currently in your schedule.</span>
          </div>
        </div>

        {/* Candidate list */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {candidates.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3">🌿</div>
              <p className="text-sm text-slate-500">No other sets start within 30 minutes of this slot.</p>
              <p className="text-xs text-slate-700 mt-1">Try a different set to swap, or adjust your day start time.</p>
            </div>
          ) : (
            candidates.map(s => {
              const stageColor = STAGE_COLORS[s.stage] ?? 'bg-slate-800 text-slate-300 border-slate-600';
              const durationMins = getDurationMinutes(s.startTime, s.endTime);
              const timeDiff = Math.round((s.startTime.getTime() - item.startTime.getTime()) / 60000);
              const diffLabel = timeDiff === 0
                ? 'same time'
                : timeDiff > 0
                ? `+${timeDiff} min later`
                : `${Math.abs(timeDiff)} min earlier`;

              return (
                <button
                  key={s.id}
                  onClick={() => onConfirm(s)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-festival-border hover:border-festival-blue/50 hover:bg-festival-blue/5 transition-all group"
                  style={{ backgroundColor: '#111118' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 flex-shrink-0 text-right pt-0.5">
                      <div className="text-xs font-semibold text-slate-300">{formatTime(s.startTime)}</div>
                      <div className="text-xs text-slate-700 mt-0.5">{Math.floor(durationMins / 60) > 0 ? `${Math.floor(durationMins/60)}h${durationMins%60 > 0 ? `${durationMins%60}m` : ''}` : `${durationMins}m`}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {s.artist}
                        </span>
                        <span className="text-xs text-slate-600 italic">{diffLabel}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${stageColor}`}>
                          {s.stage}
                        </span>
                        {s.genre && (
                          <span className="text-xs text-slate-600">{s.genre}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-center">
                      <span className="text-xs text-festival-blue opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        Swap →
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-festival-border flex-shrink-0">
          <p className="text-xs text-slate-600 text-center">
            Swapping will rerun your schedule with the new set locked in.
          </p>
          <button
            onClick={onClose}
            className="mt-2 w-full py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
