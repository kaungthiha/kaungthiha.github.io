import { useState, useMemo } from 'react';
import { FlockMemberData } from '../lib/flockApi';
import { EDC_2026_SETS, DAYS } from '../lib/sampleData';
import { generateItinerary } from '../lib/itineraryOptimizer';
import { generateFlockItinerary } from '../lib/flockItinerary';
import { FestivalSet, UserPreferences, ItineraryItem } from '../types/festival';
import { formatTime } from '../lib/timeUtils';
import { SwapModal } from './SwapModal';

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
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-festival-border/60 mb-3"
      style={{ backgroundColor: '#1b1f2c' }}
    >
      <div className="w-8 h-8 rounded-full border-2 border-festival-green/50 bg-festival-green/10 flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-festival-green">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-festival-text font-display">Flock Power</span>
          <span className="text-xs text-festival-muted">{withSchedule}/{total} synced</span>
        </div>
        <div className="h-1.5 rounded-full bg-festival-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #00a572, #4edea3)',
              boxShadow: '0 0 6px rgba(78,222,163,0.5)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Per-member status at a given set: either attending it or at something else
interface MemberStatus {
  member: FlockMemberData;
  memberIndex: number;
  attending: boolean;
  // if not attending, what are they doing at this time?
  elsewhereArtist?: string;
  elsewhereStage?: string;
}

// One stop in the primary flock itinerary
interface FlockStop {
  kind: 'set' | 'transition' | 'break';
  item: ItineraryItem;
  // for set stops: per-member attendance breakdown
  memberStatuses?: MemberStatus[];
  allPresent?: boolean;
}

function buildFlockStops(
  flockItems: ItineraryItem[],
  memberItineraries: { member: FlockMemberData; itinerary: { items: ItineraryItem[] } }[],
  allMembers: FlockMemberData[],
): FlockStop[] {
  return flockItems.map(item => {
    if (item.type !== 'set') return { kind: item.type as 'transition' | 'break', item };

    const startMs = new Date(item.startTime).getTime();
    const endMs = new Date(item.endTime).getTime();

    const statuses: MemberStatus[] = allMembers
      .filter(m => m.hasGenerated)
      .map(member => {
        const memberIdx = allMembers.indexOf(member);
        const theirItinerary = memberItineraries.find(mi => mi.member.id === member.id);
        if (!theirItinerary) return { member, memberIndex: memberIdx, attending: false };

        // Check if this member has this exact artist in their schedule
        const attending = theirItinerary.itinerary.items.some(
          i => i.type === 'set' && i.artist === item.artist,
        );

        if (attending) return { member, memberIndex: memberIdx, attending: true };

        // Find what they ARE doing at the flock set's start time
        const overlap = theirItinerary.itinerary.items.find(i => {
          if (i.type !== 'set') return false;
          const s = new Date(i.startTime).getTime();
          const e = new Date(i.endTime).getTime();
          return s < endMs && e > startMs;
        });

        return {
          member,
          memberIndex: memberIdx,
          attending: false,
          elsewhereArtist: overlap?.artist,
          elsewhereStage: overlap?.stage,
        };
      });

    return {
      kind: 'set',
      item,
      memberStatuses: statuses,
      allPresent: statuses.every(s => s.attending),
    };
  });
}

// Small popover that opens when clicking a missing member's avatar.
// `dotIndex` is the 0-based position of this dot in the row, used to
// anchor the popover so it never clips out of the panel on the left.
function MissingPopover({
  status,
  dotIndex,
  onClose,
}: {
  status: MemberStatus;
  dotIndex: number;
  onClose: () => void;
}) {
  // First dot: anchor left edge to the dot. Others: center on the dot.
  const posClass = dotIndex === 0
    ? 'left-0'
    : 'left-1/2 -translate-x-1/2';

  return (
    <div
      className={`absolute z-20 bottom-full mb-2 ${posClass} w-44 rounded-xl border border-festival-border shadow-lg text-xs`}
      style={{ backgroundColor: '#1b1f2c' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 py-2.5 pr-6">
        <div className="font-semibold text-festival-text mb-1">{status.member.name}</div>
        {status.elsewhereArtist ? (
          <>
            <div className="text-festival-muted">at that time:</div>
            <div className="font-semibold text-festival-pink mt-0.5">{status.elsewhereArtist}</div>
            {status.elsewhereStage && (
              <div className="text-festival-muted">{status.elsewhereStage}</div>
            )}
          </>
        ) : (
          <div className="text-festival-muted">No conflicting set — free agent</div>
        )}
      </div>
      <button
        onClick={onClose}
        className="absolute top-1.5 right-2 text-festival-muted hover:text-festival-text"
      >
        ✕
      </button>
    </div>
  );
}

function MemberDot({ status, dotIndex }: { status: MemberStatus; dotIndex: number }) {
  const [open, setOpen] = useState(false);
  const color = memberColor(status.memberIndex);

  if (status.attending) {
    return (
      <div
        className={`w-6 h-6 rounded-full border-2 ${color.border} ${color.bg} ${color.text} flex items-center justify-center text-xs font-bold flex-shrink-0`}
        title={status.member.name}
      >
        {status.member.name[0].toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0" onClick={() => setOpen(v => !v)}>
      <div
        className="w-6 h-6 rounded-full border-2 border-festival-border bg-festival-card-low flex items-center justify-center text-xs font-bold cursor-pointer hover:border-festival-muted transition-colors"
        style={{ color: '#424754' }}
        title={`${status.member.name} is elsewhere — click to see`}
      >
        {status.member.name[0].toUpperCase()}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-festival-pink-bright border border-festival-surface" />
      {open && (
        <MissingPopover
          status={status}
          dotIndex={dotIndex}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function RouteSetCard({
  stop,
  isLeader,
  allDaySets,
  scheduledArtists,
  onSwap,
}: {
  stop: FlockStop;
  isLeader: boolean;
  allDaySets: FestivalSet[];
  scheduledArtists: string[];
  onSwap?: (outgoing: string, incoming: FestivalSet) => void;
}) {
  const [swapping, setSwapping] = useState(false);
  const { item, memberStatuses = [], allPresent } = stop;
  const presentCount = memberStatuses.filter(s => s.attending).length;
  const totalTracked = memberStatuses.length;

  return (
    <>
      <div
        className="rounded-xl border px-3 py-3 transition-all"
        style={{
          backgroundColor: allPresent ? 'rgba(0,165,114,0.07)' : '#1b1f2c',
          borderColor: allPresent ? 'rgba(78,222,163,0.3)' : '#424754',
        }}
      >
        {/* Time + artist + badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-xs text-festival-muted mb-0.5">{formatTime(item.startTime)}</div>
            <div className="font-bold text-festival-text font-display text-sm leading-tight">{item.artist}</div>
            {item.stage && (
              <div className="flex items-center gap-1 mt-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: allPresent ? '#4edea3' : '#8c909f' }}
                />
                <span className="text-xs text-festival-muted">{item.stage}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLeader && item.artist && onSwap && (
              <button
                onClick={() => setSwapping(true)}
                className="text-xs text-festival-muted hover:text-festival-green transition-colors"
                title="Swap this set for another"
              >
                ⇄
              </button>
            )}
            {allPresent && totalTracked > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(78,222,163,0.15)', color: '#4edea3', fontSize: '10px' }}
              >
                all in
              </span>
            )}
            {!allPresent && totalTracked > 0 && (
              <span className="text-xs text-festival-muted">
                {presentCount}/{totalTracked}
              </span>
            )}
          </div>
        </div>

        {/* Member dots */}
        {memberStatuses.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {memberStatuses.map((s, idx) => (
              <MemberDot key={s.member.id} status={s} dotIndex={idx} />
            ))}
          </div>
        )}
      </div>

      {swapping && item.artist && onSwap && (
        <SwapModal
          item={item}
          allSets={allDaySets}
          currentItineraryArtists={scheduledArtists}
          onConfirm={incoming => {
            onSwap(item.artist!, incoming);
            setSwapping(false);
          }}
          onClose={() => setSwapping(false)}
        />
      )}
    </>
  );
}

function FlockRoutePanel({
  flockItems,
  memberItineraries,
  members,
  isLeader,
  selectedDay,
  onFlockSwap,
}: {
  flockItems: ItineraryItem[];
  memberItineraries: { member: FlockMemberData; itinerary: { items: ItineraryItem[] } }[];
  members: FlockMemberData[];
  isLeader: boolean;
  selectedDay: string;
  onFlockSwap: (outgoing: string, incoming: FestivalSet) => void;
}) {
  const stops = useMemo(
    () => buildFlockStops(flockItems, memberItineraries, members),
    [flockItems, memberItineraries, members],
  );

  const allDaySets = useMemo(
    () => EDC_2026_SETS.filter(s => s.day === selectedDay),
    [selectedDay],
  );

  const scheduledArtists = useMemo(
    () => flockItems.filter(i => i.type === 'set').map(i => i.artist ?? ''),
    [flockItems],
  );

  if (stops.length === 0) {
    return (
      <div className="py-10 text-center text-festival-muted text-sm">
        No members have generated schedules yet
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {stops.map(stop => {
        if (stop.kind === 'set') {
          return (
            <RouteSetCard
              key={stop.item.id}
              stop={stop}
              isLeader={isLeader}
              allDaySets={allDaySets}
              scheduledArtists={scheduledArtists}
              onSwap={isLeader ? onFlockSwap : undefined}
            />
          );
        }
        if (stop.kind === 'transition') {
          return (
            <div key={stop.item.id} className="flex items-center gap-2 px-2 py-1">
              <div className="w-4 flex justify-center flex-shrink-0">
                <div className="w-px h-5 bg-festival-border/50" />
              </div>
              <span className="text-xs text-festival-muted italic">
                🐾 {stop.item.notes ?? `Trek to ${stop.item.toStage}`}
              </span>
            </div>
          );
        }
        if (stop.kind === 'break') {
          return (
            <div key={stop.item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'rgba(78,222,163,0.05)', border: '1px solid rgba(78,222,163,0.12)' }}
            >
              <span className="text-sm">🌿</span>
              <span className="text-xs font-semibold text-festival-green">
                Grazing Time · {formatTime(stop.item.startTime)}
              </span>
            </div>
          );
        }
        return null;
      })}
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

  const [flockPinnedByDay, setFlockPinnedByDay] = useState<Record<string, string[]>>({});

  const flockItinerary = useMemo(() => {
    const base = generateFlockItinerary(members.filter(m => m.hasGenerated), selectedDay);
    const pinned = flockPinnedByDay[selectedDay] ?? [];
    if (pinned.length === 0) return base;
    const flockPrefs = base.items
      .filter(i => i.type === 'set')
      .map((i: ItineraryItem) => ({ artist: i.artist ?? '', level: i.preferenceLevel ?? 'neutral' as const }));
    return generateItinerary(
      EDC_2026_SETS,
      flockPrefs,
      { defaultWalkingMinutes: 10, allowPartialSets: false, minimumSetMinutes: 20, pinnedByDay: flockPinnedByDay },
      selectedDay,
    );
  }, [members, selectedDay, flockPinnedByDay]);

  function handleFlockSwap(outgoing: string, incoming: FestivalSet) {
    setFlockPinnedByDay(prev => {
      const current = prev[selectedDay] ?? [];
      const without = current.filter(a => a !== outgoing);
      const next = without.includes(incoming.artist) ? without : [...without, incoming.artist];
      return { ...prev, [selectedDay]: next };
    });
  }

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
                flockItems={flockItinerary.items}
                memberItineraries={memberItineraries}
                members={members}
                isLeader={isLeader}
                selectedDay={selectedDay}
                onFlockSwap={handleFlockSwap}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
