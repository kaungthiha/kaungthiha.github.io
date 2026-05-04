import { useState, useMemo } from 'react';
import { FlockMemberData } from '../lib/flockApi';
import { generateFlockItinerary } from '../lib/flockItinerary';
import { EDC_2026_SETS, DAYS } from '../lib/sampleData';
import { generateItinerary } from '../lib/itineraryOptimizer';
import { UserPreferences, ItineraryItem } from '../types/festival';
import { formatTime } from '../lib/timeUtils';
import { ItineraryTimeline } from './ItineraryTimeline';

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
  onBack: () => void;
}

function CompactSetItem({
  item,
  sharedWith,
}: {
  item: ItineraryItem;
  sharedWith: string[];
}) {
  const isShared = sharedWith.length > 0;
  const isMustSee = item.preferenceLevel === 'must-see';
  const isNice = item.preferenceLevel === 'nice-to-see';

  return (
    <div
      className={`flex gap-2 px-2 py-2 rounded-lg border-l-2 transition-colors ${
        isShared
          ? 'border-amber-400 bg-amber-950/25'
          : isMustSee
          ? 'border-blue-500 bg-blue-950/20'
          : isNice
          ? 'border-cyan-600 bg-cyan-950/10'
          : 'border-slate-800'
      }`}
      title={isShared ? `Together with: ${sharedWith.join(', ')}` : undefined}
    >
      <div className="w-11 flex-shrink-0 text-right">
        <span className="text-xs text-slate-600">{formatTime(item.startTime)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={`text-xs font-medium truncate flex-1 ${isShared ? 'text-amber-200' : 'text-slate-200'}`}>
            {item.artist}
          </span>
          {isShared && (
            <span className="text-xs font-bold text-amber-400 flex-shrink-0 whitespace-nowrap">
              ×{sharedWith.length + 1}🐑
            </span>
          )}
        </div>
        {item.stage && <div className="text-xs text-slate-600 truncate">{item.stage}</div>}
      </div>
    </div>
  );
}

function MemberColumn({
  member,
  setSets,
  isCurrentUser,
  artistAttendance,
}: {
  member: FlockMemberData;
  setSets: ItineraryItem[];
  isCurrentUser: boolean;
  artistAttendance: Record<string, string[]>;
}) {
  return (
    <div
      className={`min-w-[200px] w-[220px] flex-shrink-0 rounded-xl border overflow-hidden flex flex-col ${
        isCurrentUser ? 'border-festival-blue/60' : 'border-festival-border'
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 py-3 border-b border-festival-border flex-shrink-0 ${
          isCurrentUser ? 'bg-blue-950/20' : 'bg-festival-card'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{member.isLeader ? '👑' : '🐑'}</span>
          <div className="min-w-0">
            <div className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-blue-300' : 'text-slate-200'}`}>
              {member.name}
              {isCurrentUser && <span className="ml-1 text-xs font-normal text-blue-400/60">(you)</span>}
            </div>
          </div>
        </div>
        {member.hasGenerated && (
          <div className="mt-1 text-xs text-slate-600">{setSets.length} sets</div>
        )}
      </div>

      {/* Timeline */}
      <div
        className="p-2 space-y-1 overflow-y-auto flex-1"
        style={{ maxHeight: '540px', backgroundColor: '#0a0a0f' }}
      >
        {!member.hasGenerated ? (
          <div className="py-10 text-center">
            <div className="text-2xl mb-2">🌿</div>
            <p className="text-xs text-slate-600">Still grazing,<br />no schedule yet</p>
          </div>
        ) : setSets.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-slate-600">No sets for this day</p>
          </div>
        ) : (
          setSets.map(item => (
            <CompactSetItem
              key={item.id}
              item={item}
              sharedWith={(artistAttendance[item.artist ?? ''] ?? []).filter(n => n !== member.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function FlockView({
  members,
  currentMemberId,
  initialDay,
  tripCode,
  isLeader,
  isLocked,
  onLockToggle,
  onBack,
}: FlockViewProps) {
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [showFlockRoute, setShowFlockRoute] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);

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

  // Maps artist name → list of ALL member names attending that set
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

  const flockItinerary = useMemo(() => {
    if (!showFlockRoute) return null;
    return generateFlockItinerary(members.filter(m => m.hasGenerated), selectedDay);
  }, [showFlockRoute, members, selectedDay]);

  async function handleLockToggle() {
    setLockLoading(true);
    await onLockToggle(!isLocked);
    setLockLoading(false);
  }

  return (
    <div>
      {/* Lock banner for non-leaders */}
      {isLocked && !isLeader && (
        <div className="mb-4 px-4 py-3 bg-blue-950/20 border border-blue-700/30 rounded-xl flex items-center gap-3 text-xs text-blue-300">
          <span className="text-base">🔒</span>
          <span>The flock leader has locked the schedule — no changes needed. Enjoy the show.</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-festival-card border border-festival-border text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-sm"
        >
          ← Back
        </button>

        <div className="flex gap-2">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                selectedDay === day
                  ? 'bg-festival-blue text-white'
                  : 'bg-festival-card border border-festival-border text-slate-400 hover:text-white hover:border-festival-blue/40'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Overlap summary */}
        {sharedCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-700/30 text-xs text-amber-400">
            <span>×{sharedCount}🐑</span>
            <span className="hidden sm:inline">shared sets</span>
          </div>
        )}

        {/* Lock button (leader only) */}
        {isLeader && (
          <button
            onClick={handleLockToggle}
            disabled={lockLoading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
              isLocked
                ? 'bg-green-950/30 border-green-700/40 text-green-400 hover:bg-green-950/50'
                : 'bg-red-950/20 border-red-700/30 text-red-400 hover:bg-red-950/40'
            }`}
          >
            {lockLoading ? '...' : isLocked ? '🔓 Unlock Schedule' : '🔒 Lock Schedule'}
          </button>
        )}

        {/* Trip code */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-600 hidden sm:inline">Flock:</span>
          <span
            className="text-xs font-mono font-bold tracking-widest px-2 py-1 rounded-lg border border-festival-blue/30 bg-festival-blue/10"
            style={{ color: '#38bdf8' }}
          >
            {tripCode}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400/30 border-l-2 border-amber-400 inline-block" />
          Together
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-950/40 border-l-2 border-blue-500 inline-block" />
          Must See
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-cyan-950/30 border-l-2 border-cyan-600 inline-block" />
          Nice to See
        </span>
      </div>

      {/* Member columns */}
      {members.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-3">🐑</div>
          <p className="text-lg font-medium text-slate-400">No other sheep yet</p>
          <p className="text-sm mt-1 text-slate-600">Share the flock code to bring the herd together</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {memberItineraries.map(({ member, itinerary }) => (
            <MemberColumn
              key={member.id}
              member={member}
              setSets={itinerary.items.filter(i => i.type === 'set')}
              isCurrentUser={member.id === currentMemberId}
              artistAttendance={artistAttendance}
            />
          ))}
        </div>
      )}

      {/* Flock Route section */}
      <div className="mt-6 border border-festival-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowFlockRoute(v => !v)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <span>🐑</span>
            <div>
              <span className="font-semibold text-slate-300 text-sm">Flock Route</span>
              <span className="text-xs text-slate-600 ml-2">combined itinerary from all schedules</span>
            </div>
          </div>
          <span className={`text-slate-600 transition-transform duration-200 ${showFlockRoute ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showFlockRoute && (
          <div className="border-t border-festival-border p-4">
            {flockItinerary && flockItinerary.items.length > 0 ? (
              <ItineraryTimeline items={flockItinerary.items} score={flockItinerary.score} />
            ) : (
              <div className="text-center py-10 text-slate-600 text-sm">
                <div className="text-3xl mb-2">🌿</div>
                No members have generated their schedules yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
