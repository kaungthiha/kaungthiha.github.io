import { useState } from 'react';
import { FestivalSet, ItineraryItem, MeetupPoint, PreferenceLevel } from '../types/festival';
import { formatTime, formatTimeRange, getDurationMinutes, formatDuration } from '../lib/timeUtils';
import { SwapModal } from './SwapModal';

interface ItineraryTimelineProps {
  items: ItineraryItem[];
  allDaySets?: FestivalSet[];
  pinnedArtists?: string[];
  onTogglePin?: (artist: string) => void;
  onSwap?: (outgoingArtist: string, incoming: FestivalSet) => void;
}

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Kinetic Field':   { bg: 'bg-amber-900/40',   text: 'text-amber-300',   border: 'border-amber-700/50' },
  'Circuit Grounds': { bg: 'bg-blue-900/40',    text: 'text-blue-300',    border: 'border-blue-700/50' },
  'Cosmic Meadow':   { bg: 'bg-green-900/40',   text: 'text-green-300',   border: 'border-green-700/50' },
  'Neon Garden':     { bg: 'bg-pink-900/40',    text: 'text-pink-300',    border: 'border-pink-700/50' },
  'Basspod':         { bg: 'bg-red-900/40',     text: 'text-red-300',     border: 'border-red-700/50' },
  'Wasteland':       { bg: 'bg-orange-900/40',  text: 'text-orange-300',  border: 'border-orange-700/50' },
  'Quantum Valley':  { bg: 'bg-indigo-900/40',  text: 'text-indigo-300',  border: 'border-indigo-700/50' },
  'Stereo Bloom':    { bg: 'bg-teal-900/40',    text: 'text-teal-300',    border: 'border-teal-700/50' },
  'Bionic Jungle':   { bg: 'bg-lime-900/40',    text: 'text-lime-300',    border: 'border-lime-700/50' },
};

function StageChip({ stage }: { stage: string }) {
  const c = STAGE_COLORS[stage] ?? { bg: 'bg-slate-800', text: 'text-festival-muted', border: 'border-festival-border' };
  return (
    <span className={`px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${c.bg} ${c.text} ${c.border}`}>
      {stage}
    </span>
  );
}

function PreferenceBadge({ level }: { level: PreferenceLevel | undefined }) {
  if (!level || level === 'neutral') return null;
  if (level === 'must-see') return <span className="text-xs text-festival-blue">Must See</span>;
  if (level === 'nice-to-see') return <span className="text-xs text-festival-muted">Nice</span>;
  return null;
}

function SetRow({ item, isPinned, onTogglePin, onSwap }: {
  item: ItineraryItem;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onSwap?: () => void;
}) {
  const durationMins = getDurationMinutes(item.startTime, item.endTime);
  const isMustSee = item.preferenceLevel === 'must-see';
  const isNice = item.preferenceLevel === 'nice-to-see';
  const isFirst = item.isFirstSet;

  const cardBg = isFirst
    ? 'bg-gradient-to-br from-amber-950/60 to-yellow-950/20 border-amber-500/60 shadow-[0_0_28px_rgba(245,158,11,0.15)]'
    : isPinned
    ? 'border-festival-border bg-festival-card-high'
    : isMustSee
    ? 'border-festival-blue/40 shadow-glow-blue'
    : isNice
    ? 'border-festival-border/60'
    : 'border-festival-border/40';

  const dotColor = isFirst
    ? 'bg-amber-400 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
    : isMustSee
    ? 'border-festival-blue/60 shadow-[0_0_8px_rgba(77,142,255,0.6)]'
    : isNice
    ? 'border-festival-green/50'
    : 'border-festival-border bg-festival-card-low';

  const dotFill = isMustSee ? 'bg-festival-blue-bright' : isNice ? 'bg-festival-green' : '';

  return (
    <div className={isFirst ? 'mt-4' : undefined}>
      {isFirst && (
        <div className="flex justify-center mb-[-10px] relative z-10">
          <span className="text-xs font-black tracking-widest px-4 py-1 rounded-full bg-amber-400 text-black shadow-lg">
            ✦ FIRST STOP ✦
          </span>
        </div>
      )}
      <div className={`relative rounded-xl border transition-all ${cardBg}`}
        style={{ backgroundColor: isFirst ? undefined : isMustSee ? 'rgba(77,142,255,0.07)' : isNice ? 'rgba(78,222,163,0.04)' : '#1b1f2c' }}
      >
        <div className="flex gap-4 px-4 pt-4 pb-4">
          {/* Time */}
          <div className="w-20 flex-shrink-0 text-right">
            <div className={`text-sm font-semibold font-display ${isFirst ? 'text-amber-300' : isMustSee ? 'text-festival-blue' : isNice ? 'text-festival-green' : 'text-festival-text-dim'}`}>
              {formatTime(item.startTime)}
            </div>
            <div className="text-xs text-festival-muted mt-0.5">{formatDuration(durationMins)}</div>
          </div>

          {/* Dot */}
          <div className="flex flex-col items-center flex-shrink-0 mt-1">
            <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${dotColor} ${dotFill}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`font-bold font-display ${isFirst ? 'text-amber-200' : isMustSee ? 'text-festival-text' : isNice ? 'text-festival-text' : 'text-festival-text-dim'}`}>
                {item.artist}
              </span>
              {item.isPartial && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/50 text-amber-400">partial</span>
              )}
              <PreferenceBadge level={item.preferenceLevel} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item.stage && <StageChip stage={item.stage} />}
              {item.genre && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-festival-border/50 text-festival-muted"
                  style={{ backgroundColor: '#262a37' }}
                >
                  {item.genre}
                </span>
              )}
              <span className="text-xs text-festival-muted">{formatTimeRange(item.startTime, item.endTime)}</span>
            </div>
            {item.notes && <p className="mt-1.5 text-xs text-festival-muted italic">{item.notes}</p>}
          </div>
        </div>

        {!isFirst && (onTogglePin || onSwap) && (
          <div className="px-4 pb-3 -mt-1">
            <div className="border-t border-festival-border/30 pt-2 flex items-center gap-3">
              {isPinned ? (
                <>
                  <span className="text-xs text-festival-text-dim flex-1">🔒 Locked in — <span className="text-festival-muted">sheep &gt; computer</span></span>
                  {onTogglePin && (
                    <button onClick={onTogglePin} className="text-xs text-festival-muted hover:text-red-400 transition-colors">Release</button>
                  )}
                </>
              ) : (
                <>
                  {onTogglePin && (
                    <button onClick={onTogglePin} className="text-xs text-festival-muted hover:text-festival-text-dim transition-colors">📌 Override algo</button>
                  )}
                  {onSwap && (
                    <button onClick={onSwap} className="text-xs text-festival-muted hover:text-festival-green transition-colors ml-auto">⇄ Swap set</button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ArrivalRow({ item }: { item: ItineraryItem }) {
  const durationMins = getDurationMinutes(item.startTime, item.endTime);
  return (
    <div className="flex gap-4 px-4 py-3 rounded-xl border border-festival-border/40"
      style={{ backgroundColor: '#171b28' }}
    >
      <div className="w-20 flex-shrink-0 text-right">
        <div className="text-sm font-semibold text-festival-muted">{formatTime(item.startTime)}</div>
        <div className="text-xs text-festival-muted/50 mt-0.5">{formatDuration(durationMins)}</div>
      </div>
      <div className="flex flex-col items-center flex-shrink-0 mt-1">
        <div className="w-3 h-3 rounded-full border-2 border-festival-border bg-festival-card-low flex-shrink-0" />
        <div className="w-0.5 flex-1 bg-festival-border/40 mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="text-sm font-semibold text-festival-text-dim">🐑 Sheep travel time</div>
        <div className="text-xs text-festival-muted mt-0.5">{item.notes} — first set at {formatTime(item.endTime)}</div>
      </div>
    </div>
  );
}

function TransitionRow({ item, onAddMeetup }: { item: ItineraryItem; onAddMeetup: () => void }) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="w-20 flex-shrink-0" />
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-0.5 h-6 bg-festival-border/40" />
      </div>
      <div className="flex-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-festival-muted italic">
          <span>🐾</span>
          <span>{item.notes ?? `Trekking to ${item.toStage}`}</span>
        </div>
        <button
          onClick={onAddMeetup}
          className="text-xs text-festival-muted hover:text-amber-400 transition-colors px-2 py-0.5 rounded border border-transparent hover:border-amber-700/40 flex items-center gap-1"
        >
          📍 meetup
        </button>
      </div>
    </div>
  );
}

function BreakRow({ item, onAddMeetup }: { item: ItineraryItem; onAddMeetup: () => void }) {
  const durationMins = getDurationMinutes(item.startTime, item.endTime);
  return (
    <div className="flex gap-4 px-3 py-3 rounded-lg my-1 border border-festival-green/15"
      style={{ backgroundColor: 'rgba(78,222,163,0.05)' }}
    >
      <div className="w-20 flex-shrink-0 text-right">
        <div className="text-xs font-bold text-festival-green">{formatTime(item.startTime)}</div>
      </div>
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-0.5 h-full bg-festival-green/20" />
      </div>
      <div className="flex-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-festival-green">
          <span>🌿</span>
          <span className="font-semibold">Grazing Time · {formatDuration(durationMins)}</span>
        </div>
        <button
          onClick={onAddMeetup}
          className="text-xs text-festival-muted hover:text-amber-400 transition-colors px-2 py-0.5 rounded border border-transparent hover:border-amber-700/40 flex items-center gap-1"
        >
          📍 meetup
        </button>
      </div>
    </div>
  );
}

function MeetupForm({ onSave, onCancel }: { onSave: (location: string, notes: string) => void; onCancel: () => void }) {
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <div className="mx-4 p-3 rounded-xl border border-amber-700/30" style={{ backgroundColor: 'rgba(245,158,11,0.07)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span>📍</span>
        <span className="text-xs font-semibold text-amber-300">Set Meetup Point</span>
      </div>
      <input
        type="text"
        value={location}
        onChange={e => setLocation(e.target.value)}
        placeholder="Location (e.g. Kinetic Field gate, merch tent...)"
        className="w-full px-3 py-2 rounded-lg text-sm text-festival-text border border-festival-border focus:border-amber-600 focus:outline-none mb-2 placeholder:text-festival-muted/50"
        style={{ backgroundColor: '#171b28' }}
        autoFocus
      />
      <input
        type="text"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full px-3 py-2 rounded-lg text-sm text-festival-text border border-festival-border focus:border-amber-600 focus:outline-none mb-3 placeholder:text-festival-muted/50"
        style={{ backgroundColor: '#171b28' }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (location.trim()) onSave(location.trim(), notes.trim()); }}
          disabled={!location.trim()}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-700/60 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Herd Here 🐑
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg text-xs text-festival-muted hover:text-festival-text border border-festival-border hover:border-festival-border-subtle transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MeetupCard({ meetup, onRemove }: { meetup: MeetupPoint; onRemove: () => void }) {
  return (
    <div className="mx-4 px-4 py-3 rounded-xl border border-amber-700/30 flex items-start justify-between gap-3"
      style={{ backgroundColor: 'rgba(245,158,11,0.07)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">📍</span>
        <div>
          <div className="text-sm font-semibold text-amber-300">{meetup.location}</div>
          {meetup.notes && <div className="text-xs text-festival-muted mt-0.5">{meetup.notes}</div>}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-festival-muted/40 hover:text-red-400 transition-colors text-xs mt-0.5 flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

export function ItineraryTimeline({ items, allDaySets, pinnedArtists, onTogglePin, onSwap }: ItineraryTimelineProps) {
  const [meetups, setMeetups] = useState<MeetupPoint[]>([]);
  const [addingAfter, setAddingAfter] = useState<string | null>(null);
  const [swappingItem, setSwappingItem] = useState<ItineraryItem | null>(null);

  const scheduledArtists = items.filter(i => i.type === 'set').map(i => i.artist ?? '');

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
      <div className="text-center py-16 text-festival-muted">
        <div className="text-4xl mb-3">🐑</div>
        <p className="text-lg font-bold text-festival-text font-display">The flock is empty...</p>
        <p className="text-sm mt-1 text-festival-muted">Tag some artists as Must See or Nice to See and round up the herd.</p>
      </div>
    );
  }

  const setSets = items.filter(i => i.type === 'set');
  const mustSeeCount = setSets.filter(i => i.preferenceLevel === 'must-see').length;
  const niceCount = setSets.filter(i => i.preferenceLevel === 'nice-to-see').length;

  return (
    <div>
      {/* Score bar */}
      <div className="flex flex-wrap gap-3 mb-6 px-1">
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-festival-border/50"
          style={{ backgroundColor: '#1b1f2c' }}
        >
          <div className="w-9 h-9 rounded-full border-2 border-festival-border flex items-center justify-center text-xl">🐑</div>
          <div>
            <div className="text-xs text-festival-muted uppercase tracking-wide">Sets</div>
            <div className="text-xl font-bold text-festival-text font-display">{setSets.length}</div>
          </div>
        </div>
        {mustSeeCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-festival-blue/30"
            style={{ backgroundColor: 'rgba(77,142,255,0.07)' }}
          >
            <div className="w-9 h-9 rounded-full border-2 border-festival-blue/40 bg-festival-blue/10 flex items-center justify-center text-xl">💙</div>
            <div>
              <div className="text-xs text-festival-blue uppercase tracking-wide">Must See</div>
              <div className="text-xl font-bold text-festival-text font-display">{mustSeeCount}</div>
            </div>
          </div>
        )}
        {niceCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-festival-green/20"
            style={{ backgroundColor: 'rgba(78,222,163,0.05)' }}
          >
            <div className="w-9 h-9 rounded-full border-2 border-festival-green/30 bg-festival-green/10 flex items-center justify-center text-xl">👍</div>
            <div>
              <div className="text-xs text-festival-green uppercase tracking-wide">Nice</div>
              <div className="text-xl font-bold text-festival-text font-display">{niceCount}</div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-1.5">
        {items.map(item => {
          const itemMeetups = meetups.filter(m => m.afterItemId === item.id);
          const isAddingHere = addingAfter === item.id;

          return (
            <div key={item.id}>
              {item.type === 'arrival' && <ArrivalRow item={item} />}
              {item.type === 'set' && (
                <SetRow
                  item={item}
                  isPinned={pinnedArtists?.includes(item.artist ?? '') ?? false}
                  onTogglePin={onTogglePin && item.artist ? () => onTogglePin(item.artist!) : undefined}
                  onSwap={onSwap && allDaySets && item.artist ? () => setSwappingItem(item) : undefined}
                />
              )}
              {item.type === 'transition' && (
                <TransitionRow item={item} onAddMeetup={() => setAddingAfter(isAddingHere ? null : item.id)} />
              )}
              {item.type === 'break' && (
                <BreakRow item={item} onAddMeetup={() => setAddingAfter(isAddingHere ? null : item.id)} />
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

      {swappingItem && allDaySets && onSwap && (
        <SwapModal
          item={swappingItem}
          allSets={allDaySets}
          currentItineraryArtists={scheduledArtists}
          onConfirm={incoming => {
            onSwap(swappingItem.artist!, incoming);
            setSwappingItem(null);
          }}
          onClose={() => setSwappingItem(null)}
        />
      )}
    </div>
  );
}
