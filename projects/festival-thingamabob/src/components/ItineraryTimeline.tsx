import React from 'react';
import { ItineraryItem, PreferenceLevel } from '../types/festival';
import { formatTime, formatTimeRange, getDurationMinutes, formatDuration } from '../lib/timeUtils';

interface ItineraryTimelineProps {
  items: ItineraryItem[];
  score: number;
}

function StageChip({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    'Kinetic Field': 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    'Circuit Grounds': 'bg-blue-900/40 text-blue-300 border-blue-700/50',
    'Cosmic Meadow': 'bg-green-900/40 text-green-300 border-green-700/50',
    'Neon Garden': 'bg-pink-900/40 text-pink-300 border-pink-700/50',
    'Basspod': 'bg-red-900/40 text-red-300 border-red-700/50',
    'Wasteland': 'bg-orange-900/40 text-orange-300 border-orange-700/50',
    'Quantum Valley': 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
    'Stereo Bloom': 'bg-teal-900/40 text-teal-300 border-teal-700/50',
    'Bionic Jungle': 'bg-lime-900/40 text-lime-300 border-lime-700/50',
  };
  const colorClass = colors[stage] ?? 'bg-slate-800 text-slate-300 border-slate-600';
  return (
    <span className={`px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${colorClass}`}>
      {stage}
    </span>
  );
}

function PreferenceBadge({ level }: { level: PreferenceLevel | undefined }) {
  if (!level || level === 'neutral') return null;
  const styles: Record<string, string> = {
    'must-see': 'text-purple-400',
    'nice-to-see': 'text-cyan-400',
    'avoid': 'text-red-400',
  };
  const labels: Record<string, string> = {
    'must-see': '💜 Must See',
    'nice-to-see': '👍 Nice',
  };
  const label = labels[level];
  if (!label) return null;
  return (
    <span className={`text-xs ${styles[level] ?? ''}`}>{label}</span>
  );
}

function SetRow({ item }: { item: ItineraryItem }) {
  const durationMins = getDurationMinutes(item.startTime, item.endTime);
  const isMustSee = item.preferenceLevel === 'must-see';
  const isNice = item.preferenceLevel === 'nice-to-see';

  return (
    <div
      className={`relative flex gap-4 px-4 py-4 rounded-xl border transition-all ${
        isMustSee
          ? 'bg-purple-950/30 border-purple-700/60 shadow-glow-purple'
          : isNice
          ? 'bg-cyan-950/20 border-cyan-800/40'
          : 'bg-festival-card border-festival-border'
      }`}
    >
      {/* Time column */}
      <div className="w-20 flex-shrink-0 text-right">
        <div className={`text-sm font-semibold ${isMustSee ? 'text-purple-300' : isNice ? 'text-cyan-300' : 'text-slate-300'}`}>
          {formatTime(item.startTime)}
        </div>
        <div className="text-xs text-slate-600 mt-0.5">{formatDuration(durationMins)}</div>
      </div>

      {/* Dot connector */}
      <div className="flex flex-col items-center flex-shrink-0 mt-1">
        <div
          className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
            isMustSee
              ? 'bg-purple-500 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
              : isNice
              ? 'bg-cyan-500 border-cyan-400'
              : 'bg-slate-600 border-slate-500'
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`font-semibold ${isMustSee ? 'text-white' : isNice ? 'text-slate-100' : 'text-slate-200'}`}>
            {item.artist}
          </span>
          {item.isPartial && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/50 text-amber-400">
              partial
            </span>
          )}
          <PreferenceBadge level={item.preferenceLevel} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.stage && <StageChip stage={item.stage} />}
          <span className="text-xs text-slate-500">
            {formatTimeRange(item.startTime, item.endTime)}
          </span>
        </div>
        {item.notes && (
          <p className="mt-1.5 text-xs text-slate-500 italic">{item.notes}</p>
        )}
      </div>
    </div>
  );
}

function TransitionRow({ item }: { item: ItineraryItem }) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="w-20 flex-shrink-0" />
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-0.5 h-6 bg-slate-800" />
      </div>
      <div className="flex-1 flex items-center gap-2 text-xs text-slate-600 italic">
        <span>🚶</span>
        <span>{item.notes}</span>
      </div>
    </div>
  );
}

function BreakRow({ item }: { item: ItineraryItem }) {
  const durationMins = getDurationMinutes(item.startTime, item.endTime);
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="w-20 flex-shrink-0" />
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-0.5 h-6 bg-slate-800" />
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span>⏸</span>
        <span>Free time · {formatDuration(durationMins)}</span>
        {item.notes && <span className="italic">({item.notes})</span>}
      </div>
    </div>
  );
}

export function ItineraryTimeline({ items, score }: ItineraryTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="text-4xl mb-3">🎵</div>
        <p className="text-lg font-medium text-slate-400">No sets scheduled</p>
        <p className="text-sm mt-1">Mark some artists as Must See or Nice to See to build your itinerary.</p>
      </div>
    );
  }

  const setSets = items.filter(i => i.type === 'set');
  const mustSeeCount = setSets.filter(i => i.preferenceLevel === 'must-see').length;
  const niceCount = setSets.filter(i => i.preferenceLevel === 'nice-to-see').length;

  return (
    <div>
      {/* Score bar */}
      <div className="flex flex-wrap gap-4 mb-5 px-1">
        <div className="flex items-center gap-2 bg-festival-card border border-festival-border rounded-lg px-4 py-2">
          <span className="text-xl">🎯</span>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Score</div>
            <div className="text-lg font-bold text-white">{score}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-festival-card border border-festival-border rounded-lg px-4 py-2">
          <span className="text-xl">🎪</span>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Sets</div>
            <div className="text-lg font-bold text-white">{setSets.length}</div>
          </div>
        </div>
        {mustSeeCount > 0 && (
          <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-700/40 rounded-lg px-4 py-2">
            <span className="text-xl">💜</span>
            <div>
              <div className="text-xs text-purple-400 uppercase tracking-wide">Must See</div>
              <div className="text-lg font-bold text-white">{mustSeeCount}</div>
            </div>
          </div>
        )}
        {niceCount > 0 && (
          <div className="flex items-center gap-2 bg-cyan-950/30 border border-cyan-800/40 rounded-lg px-4 py-2">
            <span className="text-xl">👍</span>
            <div>
              <div className="text-xs text-cyan-400 uppercase tracking-wide">Nice</div>
              <div className="text-lg font-bold text-white">{niceCount}</div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {items.map(item => {
          if (item.type === 'set') return <SetRow key={item.id} item={item} />;
          if (item.type === 'transition') return <TransitionRow key={item.id} item={item} />;
          if (item.type === 'break') return <BreakRow key={item.id} item={item} />;
          return null;
        })}
      </div>
    </div>
  );
}
