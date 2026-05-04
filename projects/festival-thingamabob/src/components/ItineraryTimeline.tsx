import { useState } from 'react';
import { ItineraryItem, MeetupPoint, PreferenceLevel } from '../types/festival';
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
    'must-see': 'text-blue-400',
    'nice-to-see': 'text-cyan-400',
  };
  const labels: Record<string, string> = {
    'must-see': '💙 Must See',
    'nice-to-see': '👍 Nice',
  };
  const label = labels[level];
  if (!label) return null;
  return <span className={`text-xs ${styles[level] ?? ''}`}>{label}</span>;
}

function SetRow({ item }: { item: ItineraryItem }) {
  const durationMins = getDurationMinutes(item.startTime, item.endTime);
  const isMustSee = item.preferenceLevel === 'must-see';
  const isNice = item.preferenceLevel === 'nice-to-see';

  return (
    <div
      className={`relative flex gap-4 px-4 py-4 rounded-xl border transition-all ${
        isMustSee
          ? 'bg-blue-950/30 border-blue-700/60 shadow-glow-blue'
          : isNice
          ? 'bg-cyan-950/20 border-cyan-800/40'
          : 'bg-festival-card border-festival-border'
      }`}
    >
      {/* Time column */}
      <div className="w-20 flex-shrink-0 text-right">
        <div className={`text-sm font-semibold ${isMustSee ? 'text-blue-300' : isNice ? 'text-cyan-300' : 'text-slate-300'}`}>
          {formatTime(item.startTime)}
        </div>
        <div className="text-xs text-slate-600 mt-0.5">{formatDuration(durationMins)}</div>
      </div>

      {/* Dot connector */}
      <div className="flex flex-col items-center flex-shrink-0 mt-1">
        <div
          className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
            isMustSee
              ? 'bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.8)]'
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
          {item.genre && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400">
              {item.genre}
            </span>
          )}
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

function TransitionRow({
  item,
  onAddMeetup,
}: {
  item: ItineraryItem;
  onAddMeetup: () => void;
}) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="w-20 flex-shrink-0" />
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-0.5 h-6 bg-slate-800" />
      </div>
      <div className="flex-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-600 italic">
          <span>🐑</span>
          <span>{item.notes ?? `Trekking to ${item.toStage}`}</span>
        </div>
        <button
          onClick={onAddMeetup}
          className="text-xs text-slate-600 hover:text-yellow-400 transition-colors px-2 py-0.5 rounded border border-transparent hover:border-yellow-700/40 flex items-center gap-1"
        >
          📍 meetup
        </button>
      </div>
    </div>
  );
}

function BreakRow({
  item,
  onAddMeetup,
}: {
  item: ItineraryItem;
  onAddMeetup: () => void;
}) {
  const durationMins = getDurationMinutes(item.startTime, item.endTime);
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="w-20 flex-shrink-0" />
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-0.5 h-6 bg-slate-800" />
      </div>
      <div className="flex-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>🌿</span>
          <span>Grazing Time · {formatDuration(durationMins)}</span>
        </div>
        <button
          onClick={onAddMeetup}
          className="text-xs text-slate-600 hover:text-yellow-400 transition-colors px-2 py-0.5 rounded border border-transparent hover:border-yellow-700/40 flex items-center gap-1"
        >
          📍 meetup
        </button>
      </div>
    </div>
  );
}

function MeetupForm({
  onSave,
  onCancel,
}: {
  onSave: (location: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="mx-4 p-3 bg-yellow-950/20 border border-yellow-700/30 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span>📍</span>
        <span className="text-xs font-semibold text-yellow-300">Set Meetup Point</span>
      </div>
      <input
        type="text"
        value={location}
        onChange={e => setLocation(e.target.value)}
        placeholder="Location (e.g. Kinetic Field gate, merch tent...)"
        className="w-full px-3 py-2 rounded-lg text-sm text-white bg-slate-900/60 border border-slate-700 focus:border-yellow-600 focus:outline-none mb-2 placeholder:text-slate-600"
        autoFocus
      />
      <input
        type="text"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full px-3 py-2 rounded-lg text-sm text-white bg-slate-900/60 border border-slate-700 focus:border-yellow-600 focus:outline-none mb-3 placeholder:text-slate-600"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (location.trim()) onSave(location.trim(), notes.trim()); }}
          disabled={!location.trim()}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-yellow-700/60 hover:bg-yellow-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Herd Here 🐑
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MeetupCard({
  meetup,
  onRemove,
}: {
  meetup: MeetupPoint;
  onRemove: () => void;
}) {
  return (
    <div className="mx-4 px-4 py-3 bg-yellow-950/20 border border-yellow-700/40 rounded-xl flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">📍</span>
        <div>
          <div className="text-sm font-semibold text-yellow-300">{meetup.location}</div>
          {meetup.notes && <div className="text-xs text-slate-500 mt-0.5">{meetup.notes}</div>}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-slate-600 hover:text-red-400 transition-colors text-xs mt-0.5 flex-shrink-0"
        title="Remove meetup"
      >
        ✕
      </button>
    </div>
  );
}

export function ItineraryTimeline({ items, score }: ItineraryTimelineProps) {
  const [meetups, setMeetups] = useState<MeetupPoint[]>([]);
  const [addingAfter, setAddingAfter] = useState<string | null>(null);

  function addMeetup(afterItemId: string, location: string, notes: string) {
    const item = items.find(i => i.id === afterItemId);
    const time = item ? item.endTime : new Date();
    setMeetups(prev => [
      ...prev,
      { id: `meetup-${Date.now()}`, afterItemId, time, location, notes: notes || undefined },
    ]);
    setAddingAfter(null);
  }

  function removeMeetup(id: string) {
    setMeetups(prev => prev.filter(m => m.id !== id));
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="text-4xl mb-3">🐑</div>
        <p className="text-lg font-medium text-slate-400">The flock is empty...</p>
        <p className="text-sm mt-1">Tag some artists as Must See or Nice to See and round up the herd.</p>
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
          <span className="text-xl">🐑</span>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Sets</div>
            <div className="text-lg font-bold text-white">{setSets.length}</div>
          </div>
        </div>
        {mustSeeCount > 0 && (
          <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-700/40 rounded-lg px-4 py-2">
            <span className="text-xl">💙</span>
            <div>
              <div className="text-xs text-blue-400 uppercase tracking-wide">Must See</div>
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
          const itemMeetups = meetups.filter(m => m.afterItemId === item.id);
          const isAddingHere = addingAfter === item.id;

          return (
            <div key={item.id}>
              {item.type === 'set' && <SetRow item={item} />}
              {item.type === 'transition' && (
                <TransitionRow
                  item={item}
                  onAddMeetup={() => setAddingAfter(isAddingHere ? null : item.id)}
                />
              )}
              {item.type === 'break' && (
                <BreakRow
                  item={item}
                  onAddMeetup={() => setAddingAfter(isAddingHere ? null : item.id)}
                />
              )}

              {isAddingHere && (
                <MeetupForm
                  onSave={(loc, notes) => addMeetup(item.id, loc, notes)}
                  onCancel={() => setAddingAfter(null)}
                />
              )}

              {itemMeetups.map(m => (
                <MeetupCard key={m.id} meetup={m} onRemove={() => removeMeetup(m.id)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
