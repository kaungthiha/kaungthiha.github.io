import { useState } from 'react';
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
  onBack: () => void;
}

function CompactSetItem({ item }: { item: ItineraryItem }) {
  const isMustSee = item.preferenceLevel === 'must-see';
  const isNice = item.preferenceLevel === 'nice-to-see';

  return (
    <div className={`flex gap-2 px-2 py-2 rounded-lg border-l-2 ${
      isMustSee
        ? 'border-blue-500 bg-blue-950/20'
        : isNice
        ? 'border-cyan-600 bg-cyan-950/10'
        : 'border-slate-800'
    }`}>
      <div className="w-11 flex-shrink-0 text-right">
        <span className="text-xs text-slate-600">{formatTime(item.startTime)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-200 truncate">{item.artist}</div>
        {item.stage && <div className="text-xs text-slate-600 truncate">{item.stage}</div>}
      </div>
    </div>
  );
}

function MemberColumn({
  member,
  itinerary,
  isCurrentUser,
}: {
  member: FlockMemberData;
  itinerary: ReturnType<typeof generateItinerary>;
  isCurrentUser: boolean;
}) {
  const setSets = itinerary.items.filter(i => i.type === 'set');

  return (
    <div className={`min-w-[200px] w-[220px] flex-shrink-0 rounded-xl border overflow-hidden flex flex-col ${
      isCurrentUser ? 'border-festival-blue/60' : 'border-festival-border'
    }`}>
      {/* Header */}
      <div className={`px-3 py-3 border-b border-festival-border flex-shrink-0 ${
        isCurrentUser ? 'bg-blue-950/20' : 'bg-festival-card'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">🐑</span>
          <div className="min-w-0">
            <div className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-blue-300' : 'text-slate-200'}`}>
              {member.name}
              {isCurrentUser && <span className="ml-1 text-xs font-normal text-blue-400/60">(you)</span>}
            </div>
          </div>
        </div>
        {member.hasGenerated && (
          <div className="mt-1 text-xs text-slate-600">
            {setSets.length} sets · {itinerary.score} pts
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="p-2 space-y-1 overflow-y-auto flex-1" style={{ maxHeight: '520px', backgroundColor: '#0a0a0f' }}>
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
          setSets.map(item => <CompactSetItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

export function FlockView({ members, currentMemberId, initialDay, tripCode, onBack }: FlockViewProps) {
  const [selectedDay, setSelectedDay] = useState(initialDay);

  const memberItineraries = members.map(member => ({
    member,
    itinerary: generateItinerary(
      EDC_2026_SETS,
      member.artistPreferences,
      member.userPrefs ?? DEFAULT_PREFS,
      selectedDay,
    ),
  }));

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
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

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-600">Flock code:</span>
          <span
            className="text-xs font-mono font-bold tracking-widest px-2 py-1 rounded-lg border border-festival-blue/30 bg-festival-blue/10"
            style={{ color: '#38bdf8' }}
          >
            {tripCode}
          </span>
        </div>
      </div>

      {/* Columns */}
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
              itinerary={itinerary}
              isCurrentUser={member.id === currentMemberId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
