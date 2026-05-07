import { useState, useMemo } from 'react';
import { FlockMemberData } from '../lib/flockApi';
import { EDC_2026_SETS, DAYS } from '../lib/sampleData';
import { generateItinerary } from '../lib/itineraryOptimizer';
import { UserPreferences, ItineraryItem } from '../types/festival';
import { formatTime } from '../lib/timeUtils';

const DEFAULT_PREFS: UserPreferences = {
  defaultWalkingMinutes: 10,
  allowPartialSets: false,
  minimumSetMinutes: 20,
};

interface FlockViewProps {
  members: FlockMemberData[];
  currentMemberId: string;
  initialDay: string;
  tripCode: string;
  isLeader: boolean;
  isLocked: boolean;
  onLockToggle: (lock: boolean) => Promise<void>;
  onLeave: () => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onBack: () => void;
}

function memberColor(index: number): { bg: string; text: string; border: string; dot: string } {
  const palette = [
    { bg: 'bg-blue-900/50',   text: 'text-blue-300',   border: 'border-blue-500/60',  dot: 'bg-blue-400' },
    { bg: 'bg-pink-900/50',   text: 'text-pink-300',   border: 'border-pink-500/60',  dot: 'bg-pink-400' },
    { bg: 'bg-emerald-900/50',text: 'text-emerald-300',border: 'border-emerald-500/60',dot: 'bg-emerald-400' },
    { bg: 'bg-violet-900/50', text: 'text-violet-300', border: 'border-violet-500/60',dot: 'bg-violet-400' },
    { bg: 'bg-amber-900/50',  text: 'text-amber-300',  border: 'border-amber-500/60', dot: 'bg-amber-400' },
    { bg: 'bg-cyan-900/50',   text: 'text-cyan-300',   border: 'border-cyan-500/60',  dot: 'bg-cyan-400' },
  ];
  return palette[index % palette.length];
}

function MemberAvatar({ name, index, size = 'md' }: { name: string; index: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = memberColor(index);
  const initials = name.slice(0, 1).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sizeClass} rounded-full border-2 ${color.border} ${color.bg} ${color.text} flex items-center justify-center font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function CompactSetItem({
  item,
  sharedWith,
  memberIndex,
}: {
  item: ItineraryItem;
  sharedWith: string[];
  memberIndex: number;
}) {
  const isShared = sharedWith.length > 0;
  const isMustSee = item.preferenceLevel === 'must-see';
  const isNice = item.preferenceLevel === 'nice-to-see';
  const color = memberColor(memberIndex);

  return (
    <div
      className={`flex gap-2 px-2.5 py-2 rounded-lg border-l-2 transition-colors ${
        isShared
          ? 'border-festival-green bg-emerald-950/30'
          : isMustSee
          ? `${color.border.replace('border-', 'border-l-')} bg-slate-900/60`
          : isNice
          ? 'border-l-slate-600 bg-slate-900/30'
          : 'border-l-transparent'
      }`}
      title={isShared ? `Together with: ${sharedWith.join(', ')}` : undefined}
    >
      <div className="w-10 flex-shrink-0 text-right">
        <span className="text-xs text-festival-muted">{formatTime(item.startTime)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={`text-xs font-semibold truncate flex-1 ${isShared ? 'text-festival-green' : 'text-festival-text'}`}>
            {item.artist}
          </span>
          {isShared && (
            <span className="text-xs font-bold text-festival-green flex-shrink-0">
              ×{sharedWith.length + 1}
            </span>
          )}
        </div>
        {item.stage && <div className="text-xs text-festival-muted truncate">{item.stage}</div>}
      </div>
    </div>
  );
}

function MemberColumn({
  member,
  memberIndex,
  setSets,
  isCurrentUser,
  canRemove,
  artistAttendance,
  onRemove,
}: {
  member: FlockMemberData;
  memberIndex: number;
  setSets: ItineraryItem[];
  isCurrentUser: boolean;
  canRemove: boolean;
  artistAttendance: Record<string, string[]>;
  onRemove: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const color = memberColor(memberIndex);

  return (
    <div className={`min-w-[190px] w-[205px] flex-shrink-0 rounded-xl border overflow-hidden flex flex-col ${
      isCurrentUser ? `border-festival-blue/50` : 'border-festival-border/60'
    }`}
      style={{ backgroundColor: '#171b28' }}
    >
      {/* Header */}
      <div className={`px-3 py-3 border-b border-festival-border/40 flex-shrink-0`}
        style={{ backgroundColor: isCurrentUser ? 'rgba(173,198,255,0.07)' : '#1b1f2c' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MemberAvatar name={member.name} index={memberIndex} size="sm" />
          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-xs truncate ${isCurrentUser ? 'text-festival-blue' : color.text}`}>
              {member.name}
              {isCurrentUser && <span className="ml-1 font-normal text-festival-muted opacity-60"> you</span>}
              {member.isLeader && <span className="ml-1 text-amber-400">★</span>}
            </div>
            {member.hasGenerated && (
              <div className="text-xs text-festival-muted opacity-60">{setSets.length} sets</div>
            )}
          </div>
          {canRemove && !confirmRemove && (
            <button
              onClick={() => setConfirmRemove(true)}
              className="text-festival-muted/40 hover:text-red-400 transition-colors text-xs flex-shrink-0 w-4 h-4 flex items-center justify-center"
            >
              ✕
            </button>
          )}
          {canRemove && confirmRemove && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onRemove}
                className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 border border-red-700/50 text-red-400"
              >
                Remove
              </button>
              <button onClick={() => setConfirmRemove(false)} className="text-xs text-festival-muted hover:text-festival-text transition-colors">✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-1.5 space-y-0.5 overflow-y-auto flex-1">
        {!member.hasGenerated ? (
          <div className="py-10 text-center">
            <p className="text-xs text-festival-muted opacity-50">Still grazing,<br />no schedule yet</p>
          </div>
        ) : setSets.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-festival-muted opacity-50">No sets this day</p>
          </div>
        ) : (
          setSets.map(item => (
            <CompactSetItem
              key={item.id}
              item={item}
              memberIndex={memberIndex}
              sharedWith={(artistAttendance[item.artist ?? ''] ?? []).filter(n => n !== member.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Flock Route Panel ────────────────────────────────────────────────

function FlockPowerBar({ members }: { members: FlockMemberData[] }) {
  const total = members.length;
  const withSchedule = members.filter(m => m.hasGenerated).length;
  const pct = total > 0 ? Math.round((withSchedule / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 px-4 py-4 rounded-xl border border-festival-border/60 mb-4"
      style={{ backgroundColor: '#1b1f2c' }}
    >
      <div className="w-10 h-10 rounded-full border-2 border-festival-green/50 bg-festival-green/10 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-festival-green">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-festival-text font-display">Flock Power</span>
          <span className="text-xs text-festival-muted">{withSchedule}/{total} Together</span>
        </div>
        <div className="h-2 rounded-full bg-festival-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #00a572, #4edea3)',
              boxShadow: '0 0 8px rgba(78,222,163,0.5)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

type FlockRouteStop =
  | { kind: 'set'; time: string; artist: string; stage: string; members: string[]; isMatch: boolean; minsLeft?: number }
  | { kind: 'trek'; label: string; destination: string }
  | { kind: 'graze'; time: string; location: string }
  | { kind: 'meetup'; time: string; location: string; label: string };

function buildFlockRoute(
  memberItineraries: { member: FlockMemberData; itinerary: { items: ItineraryItem[] } }[],
  artistAttendance: Record<string, string[]>,
): FlockRouteStop[] {
  const stops: FlockRouteStop[] = [];
  const seen = new Set<string>();

  // Collect all set items from the flock itinerary sorted by time
  const allItems: ItineraryItem[] = [];
  for (const { itinerary } of memberItineraries) {
    for (const item of itinerary.items) {
      allItems.push(item);
    }
  }
  allItems.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  let prevStage: string | null = null;

  for (const item of allItems) {
    if (item.type === 'set' && item.artist && !seen.has(item.artist)) {
      seen.add(item.artist);
      const attendees = artistAttendance[item.artist] ?? [];
      const isMatch = attendees.length > 1;

      if (prevStage && item.stage && prevStage !== item.stage) {
        stops.push({ kind: 'trek', label: '15 mins to', destination: item.stage });
      }

      stops.push({
        kind: 'set',
        time: formatTime(item.startTime),
        artist: item.artist,
        stage: item.stage ?? '',
        members: attendees,
        isMatch,
      });
      prevStage = item.stage ?? null;
    } else if (item.type === 'break') {
      const timeStr = formatTime(item.startTime);
      const note = item.notes ?? 'Grazing Time';
      if (!seen.has(`graze-${timeStr}`)) {
        seen.add(`graze-${timeStr}`);
        stops.push({ kind: 'graze', time: timeStr, location: note });
      }
    }
  }

  return stops;
}

function FlockRoutePanel({
  memberItineraries,
  artistAttendance,
}: {
  memberItineraries: { member: FlockMemberData; itinerary: { items: ItineraryItem[] } }[];
  artistAttendance: Record<string, string[]>;
}) {
  const stops = useMemo(
    () => buildFlockRoute(memberItineraries, artistAttendance),
    [memberItineraries, artistAttendance],
  );

  return (
    <div className="space-y-0">
      <div className="pb-2 space-y-0">
        {stops.length === 0 ? (
          <div className="py-10 text-center text-festival-muted text-sm">
            No members have generated schedules yet
          </div>
        ) : (
          stops.map((stop, i) => {
            if (stop.kind === 'trek') {
              return (
                <div key={i} className="flex items-center gap-3 py-2 pl-1">
                  <div className="w-5 flex-shrink-0 flex justify-center">
                    <div className="w-0.5 h-6 bg-festival-border/50" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-festival-muted italic">
                    <span>🐾</span>
                    <span>Trekking Time: {stop.label} {stop.destination}</span>
                  </div>
                </div>
              );
            }

            if (stop.kind === 'graze') {
              return (
                <div key={i} className="flex items-center gap-3 py-3 rounded-lg px-3 my-1"
                  style={{ backgroundColor: 'rgba(78,222,163,0.06)', border: '1px solid rgba(78,222,163,0.15)' }}
                >
                  <span className="text-base">🌿</span>
                  <div>
                    <span className="text-xs font-bold text-festival-green">{stop.time && `Grazing Time • ${stop.time}`}</span>
                    <div className="text-xs text-festival-muted mt-0.5">{stop.location}</div>
                  </div>
                </div>
              );
            }

            if (stop.kind === 'meetup') {
              return (
                <div key={i} className="flex items-start gap-3 py-3 px-3 rounded-lg my-1"
                  style={{ backgroundColor: 'rgba(173,198,255,0.05)', border: '1px solid rgba(173,198,255,0.15)' }}
                >
                  <div className="w-5 h-5 rounded-full bg-festival-border flex items-center justify-center mt-0.5 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-festival-muted" />
                  </div>
                  <div>
                    <div className="text-xs text-festival-muted">{stop.time}</div>
                    <div className="text-sm font-semibold text-festival-text">{stop.location}</div>
                    <div className="text-xs text-festival-muted mt-0.5">{stop.label}</div>
                  </div>
                </div>
              );
            }

            // set stop
            return (
              <div key={i} className="flex items-start gap-3 py-2">
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0 mt-1" style={{ width: '20px' }}>
                  {stop.isMatch ? (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#4edea3', boxShadow: '0 0 8px rgba(78,222,163,0.6)' }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-festival-surface" />
                    </div>
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-festival-border bg-festival-card-low flex-shrink-0" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-festival-muted">{stop.time}</span>
                    {stop.isMatch && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-festival-surface"
                        style={{ backgroundColor: '#4edea3', fontSize: '10px' }}
                      >
                        FLOCK MATCH
                      </span>
                    )}
                    {!stop.isMatch && stop.members.length > 0 && (
                      <span className="text-xs text-festival-pink-bright font-semibold">Flock Splits</span>
                    )}
                  </div>

                  {stop.isMatch ? (
                    <div className="rounded-xl p-3 border border-festival-green/25"
                      style={{ backgroundColor: 'rgba(0,165,114,0.08)' }}
                    >
                      <div className="font-bold text-festival-text font-display text-sm mb-1">{stop.artist}</div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: '#4edea3', boxShadow: '0 0 5px rgba(78,222,163,0.7)' }}
                        />
                        <span className="text-xs text-festival-muted">{stop.stage}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1b1f2c' }}>
                        <div className="h-full rounded-full w-3/5"
                          style={{ background: 'linear-gradient(90deg, #00a572, #4edea3)' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {stop.members.map((memberName, mi) => (
                        <div key={mi} className="flex items-center gap-2">
                          <div className="w-1 h-6 rounded-full flex-shrink-0"
                            style={{ backgroundColor: '#ffafd3' }}
                          />
                          <div>
                            <div className="text-sm font-semibold text-festival-text">{stop.artist}</div>
                            <div className="text-xs text-festival-muted">{stop.stage} • {memberName}</div>
                          </div>
                        </div>
                      ))}
                      {stop.members.length === 0 && (
                        <div>
                          <div className="text-sm font-semibold text-festival-text">{stop.artist}</div>
                          <div className="text-xs text-festival-muted">{stop.stage}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

// ── Main FlockView ───────────────────────────────────────────────────

export function FlockView({
  members,
  currentMemberId,
  initialDay,
  tripCode,
  isLeader,
  isLocked,
  onLockToggle,
  onLeave,
  onRemoveMember,
  onBack,
}: FlockViewProps) {
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [lockLoading, setLockLoading] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  function handleCopyInviteLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('flock', tripCode);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  const memberItineraries = useMemo(
    () =>
      members.map(member => ({
        member,
        itinerary: generateItinerary(
          EDC_2026_SETS,
          member.artistPreferences,
          member.userPrefs ?? DEFAULT_PREFS,
          selectedDay,
        ),
      })),
    [members, selectedDay],
  );

  const artistAttendance = useMemo(() => {
    const attendance: Record<string, string[]> = {};
    for (const { member, itinerary } of memberItineraries) {
      for (const item of itinerary.items) {
        if (item.type === 'set' && item.artist) {
          if (!attendance[item.artist]) attendance[item.artist] = [];
          attendance[item.artist].push(member.name);
        }
      }
    }
    return attendance;
  }, [memberItineraries]);

  const sharedCount = useMemo(
    () => Object.values(artistAttendance).filter(names => names.length > 1).length,
    [artistAttendance],
  );

  async function handleLockToggle() {
    setLockLoading(true);
    await onLockToggle(!isLocked);
    setLockLoading(false);
  }

  async function handleLeave() {
    setLeaveLoading(true);
    await onLeave();
    setLeaveLoading(false);
  }

  return (
    <div>
      {/* Lock banner */}
      {isLocked && !isLeader && (
        <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-3 text-xs text-festival-blue border border-festival-blue/20"
          style={{ backgroundColor: 'rgba(173,198,255,0.06)' }}
        >
          <span className="text-base">🔒</span>
          <span>The flock leader has locked the schedule — no changes needed. Time to rage.</span>
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-3xl font-black text-festival-text font-display leading-tight">Flock Views</h1>
            <p className="text-sm text-festival-muted mt-1 max-w-md">
              Coordinate your night with the flock. Compare schedules side-by-side or follow the master itinerary designed to minimize wandering and maximize raving.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-festival-muted hover:text-festival-text border border-festival-border/50 hover:border-festival-border transition-colors text-sm"
              style={{ backgroundColor: '#1b1f2c' }}
            >
              ← Back
            </button>

            {isLeader && (
              <button
                onClick={handleLockToggle}
                disabled={lockLoading}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
                  isLocked
                    ? 'border-festival-green/40 text-festival-green bg-festival-green/10'
                    : 'border-red-700/30 text-red-400 bg-red-950/20'
                }`}
              >
                {lockLoading ? '...' : isLocked ? '🔓 Unlock' : '🔒 Lock Schedule'}
              </button>
            )}

            {!confirmLeave ? (
              <button
                onClick={() => setConfirmLeave(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-festival-border/40 text-festival-muted hover:border-red-700/50 hover:text-red-400 transition-colors"
                style={{ backgroundColor: '#1b1f2c' }}
              >
                Leave Flock
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-festival-muted">Leave flock?</span>
                <button
                  onClick={handleLeave}
                  disabled={leaveLoading}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-red-900/40 border border-red-700/50 text-red-400 disabled:opacity-50"
                >
                  {leaveLoading ? '...' : 'Yes, leave'}
                </button>
                <button onClick={() => setConfirmLeave(false)} className="text-xs text-festival-muted hover:text-festival-text">Cancel</button>
              </div>
            )}

            {/* Trip code */}
            <div className="flex items-center gap-2 ml-2">
              <span
                className="text-xs font-mono font-bold tracking-widest px-2.5 py-1.5 rounded-lg border border-festival-blue/30"
                style={{ color: '#adc6ff', backgroundColor: 'rgba(173,198,255,0.07)' }}
              >
                {tripCode}
              </span>
              <button
                onClick={handleCopyInviteLink}
                className="text-xs px-3 py-1.5 rounded-lg border border-festival-border/50 text-festival-muted hover:text-festival-text hover:border-festival-blue/30 transition-colors"
                style={{ backgroundColor: '#1b1f2c' }}
              >
                {copiedLink ? '✓ Copied' : '🔗 Invite'}
              </button>
            </div>
          </div>
        </div>

        {/* Day selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit border border-festival-border/40"
          style={{ backgroundColor: '#171b28' }}
        >
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-5 py-1.5 rounded-lg font-medium text-sm transition-all ${
                selectedDay === day
                  ? 'text-festival-surface font-bold'
                  : 'text-festival-muted hover:text-festival-text'
              }`}
              style={selectedDay === day ? {
                background: 'linear-gradient(135deg, #4d8eff, #adc6ff)',
                boxShadow: '0 0 12px rgba(77,142,255,0.35)',
              } : {}}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Shared sets badge */}
      {sharedCount > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg w-fit border border-festival-green/25 text-xs text-festival-green mb-4"
          style={{ backgroundColor: 'rgba(78,222,163,0.08)' }}
        >
          <span className="font-bold">×{sharedCount}</span>
          <span>shared sets this day</span>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 ? (
        <div className="text-center py-20 text-festival-muted">
          <div className="text-4xl mb-3">🐑</div>
          <p className="text-lg font-medium text-festival-text font-display">No other sheep yet</p>
          <p className="text-sm mt-1 text-festival-muted">Share the flock code to bring the herd together</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: '480px' }}>

          {/* Left: member columns — fixed-height scrollable pane */}
          <div className="rounded-xl border border-festival-border/50 overflow-hidden flex flex-col" style={{ backgroundColor: '#171b28' }}>
            {/* Pane header */}
            <div className="px-4 py-3 border-b border-festival-border/40 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: '#1b1f2c' }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-festival-blue">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h2 className="text-sm font-bold text-festival-blue font-display">The Flock View</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-festival-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm border-l-2 border-festival-green inline-block" />Together</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm border-l-2 border-festival-blue/60 inline-block" />Must See</span>
                {sharedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full border border-festival-green/25 text-festival-green font-semibold" style={{ backgroundColor: 'rgba(78,222,163,0.08)' }}>
                    ×{sharedCount} shared
                  </span>
                )}
              </div>
            </div>

            {/* Horizontally scrollable columns */}
            <div className="flex gap-2 overflow-x-auto overflow-y-hidden flex-1 p-3 pb-2" style={{ scrollbarWidth: 'thin' }}>
              {memberItineraries.map(({ member, itinerary }, index) => {
                const isCurrentUser = member.id === currentMemberId;
                return (
                  <MemberColumn
                    key={member.id}
                    member={member}
                    memberIndex={index}
                    setSets={itinerary.items.filter(i => i.type === 'set')}
                    isCurrentUser={isCurrentUser}
                    canRemove={isLeader && !isCurrentUser}
                    artistAttendance={artistAttendance}
                    onRemove={() => onRemoveMember(member.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Flock Route — fixed-height scrollable pane */}
          <div className="rounded-xl border border-festival-border/60 overflow-hidden flex flex-col" style={{ backgroundColor: '#171b28' }}>
            {/* Route pane header */}
            <div className="px-4 py-3 border-b border-festival-border/40 flex-shrink-0" style={{ backgroundColor: '#1b1f2c' }}>
              <div className="flex items-center gap-2 mb-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-festival-green">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <h3 className="font-bold text-festival-green font-display text-sm">Flock Route</h3>
              </div>
              <p className="text-xs text-festival-muted">Optimal path based on overlapping favorites.</p>
            </div>

            {/* Scrollable route content */}
            <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin' }}>
              <FlockPowerBar members={members} />
              <FlockRoutePanel
                memberItineraries={memberItineraries}
                artistAttendance={artistAttendance}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
