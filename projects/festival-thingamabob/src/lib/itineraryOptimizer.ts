import {
  FestivalSet,
  ArtistPreference,
  UserPreferences,
  ItineraryItem,
  ConflictExplanation,
  GeneratedItinerary,
  PreferenceLevel,
} from '../types/festival';
import { getDurationMinutes, addMinutes, parseDayStartTime } from './timeUtils';

const PREFERENCE_SCORES: Record<PreferenceLevel, number> = {
  'must-see': 100,
  'nice-to-see': 40,
  'neutral': 10,
  'avoid': -100,
};

function getPreferenceLevel(artist: string, preferences: ArtistPreference[]): PreferenceLevel {
  const pref = preferences.find(p => p.artist === artist);
  return pref ? pref.level : 'neutral';
}

function scoreSet(
  festivalSet: FestivalSet,
  preferences: ArtistPreference[],
  isFullSet: boolean
): number {
  const level = getPreferenceLevel(festivalSet.artist, preferences);
  const baseScore = PREFERENCE_SCORES[level];
  const fullBonus = isFullSet ? 10 : 0;
  return baseScore + fullBonus;
}

/**
 * Returns true if we can transition from set A to set B given walking time.
 * Same stage: no walking time needed.
 * Different stage: need walkingMinutes between A end and B start.
 */
function canTransition(
  a: FestivalSet,
  b: FestivalSet,
  walkingMinutes: number
): boolean {
  if (a.stage === b.stage) {
    // Same stage: just need A to end before B starts
    return a.endTime <= b.startTime;
  }
  const arrivalAtB = addMinutes(a.endTime, walkingMinutes);
  return arrivalAtB <= b.startTime;
}

/**
 * For partial set support: can we catch at least `minimumSetMinutes` of set B
 * after walking from A?
 */
function canCatchPartial(
  a: FestivalSet,
  b: FestivalSet,
  walkingMinutes: number,
  minimumSetMinutes: number
): boolean {
  const walkTime = a.stage === b.stage ? 0 : walkingMinutes;
  const arrivalAtB = addMinutes(a.endTime, walkTime);
  if (arrivalAtB >= b.endTime) return false;
  const remainingMinutes = getDurationMinutes(arrivalAtB, b.endTime);
  return remainingMinutes >= minimumSetMinutes;
}

export function generateItinerary(
  sets: FestivalSet[],
  preferences: ArtistPreference[],
  userPrefs: UserPreferences,
  selectedDay: string
): GeneratedItinerary {
  // 1. Filter to selected day, remove "avoid" sets, apply day start threshold
  const startThreshold = userPrefs.dayStartTimes?.[selectedDay]
    ? parseDayStartTime(selectedDay, userPrefs.dayStartTimes[selectedDay])
    : null;

  const daySets = sets
    .filter(s => s.day === selectedDay)
    .filter(s => getPreferenceLevel(s.artist, preferences) !== 'avoid')
    .filter(s => !startThreshold || s.startTime >= startThreshold);

  if (daySets.length === 0) {
    return { items: [], conflicts: [], score: 0 };
  }

  // 2. Sort by start time
  const sorted = [...daySets].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const n = sorted.length;

  // 3. For each set, find which previous sets it's compatible with
  // dp[i] = { score, prevIndex } — best score achievable ending at set i
  const dp: Array<{ score: number; prevIndex: number; partial: boolean }> = new Array(n);

  for (let i = 0; i < n; i++) {
    const current = sorted[i];
    const level = getPreferenceLevel(current.artist, preferences);
    const baseScore = PREFERENCE_SCORES[level];

    // Start with this set alone (full)
    dp[i] = { score: baseScore + 10, prevIndex: -1, partial: false };

    for (let j = i - 1; j >= 0; j--) {
      const prev = sorted[j];
      const prevLevel = getPreferenceLevel(prev.artist, preferences);
      if (prevLevel === 'avoid') continue;

      // Try full transition
      if (canTransition(prev, current, userPrefs.defaultWalkingMinutes)) {
        const candidate = dp[j].score + baseScore + 10;
        if (candidate > dp[i].score) {
          dp[i] = { score: candidate, prevIndex: j, partial: false };
        }
      } else if (userPrefs.allowPartialSets) {
        // Try partial attendance of current set
        if (canCatchPartial(prev, current, userPrefs.defaultWalkingMinutes, userPrefs.minimumSetMinutes)) {
          // Partial: lower score (no full bonus, small penalty)
          const candidate = dp[j].score + baseScore - 5;
          if (candidate > dp[i].score) {
            dp[i] = { score: candidate, prevIndex: j, partial: true };
          }
        }
      }
    }
  }

  // 4. Find the best ending set
  let bestScore = -Infinity;
  let bestEnd = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i].score > bestScore) {
      bestScore = dp[i].score;
      bestEnd = i;
    }
  }

  // 5. Backtrack to get the selected set indices
  const selectedIndices: number[] = [];
  let cur = bestEnd;
  while (cur !== -1) {
    selectedIndices.unshift(cur);
    cur = dp[cur].prevIndex;
  }

  const selectedSets = selectedIndices.map(i => sorted[i]);
  const selectedIds = new Set(selectedSets.map(s => s.id));

  // 6. Build itinerary items with transitions
  const items: ItineraryItem[] = [];
  let itemCounter = 0;

  for (let idx = 0; idx < selectedSets.length; idx++) {
    const festSet = selectedSets[idx];
    const isPartial = dp[selectedIndices[idx]].partial;
    const level = getPreferenceLevel(festSet.artist, preferences);

    // Determine actual start (may be late if partial)
    let actualStart = festSet.startTime;
    if (idx > 0 && isPartial) {
      const prev = selectedSets[idx - 1];
      const walkTime = prev.stage === festSet.stage ? 0 : userPrefs.defaultWalkingMinutes;
      actualStart = addMinutes(prev.endTime, walkTime);
    }

    // Add transition row if needed
    if (idx > 0) {
      const prev = selectedSets[idx - 1];
      const prevEndTime = prev.endTime;

      if (prev.stage !== festSet.stage) {
        const walkTime = userPrefs.defaultWalkingMinutes;
        const transitionEnd = addMinutes(prevEndTime, walkTime);

        if (transitionEnd <= actualStart) {
          // There might be a gap — add break if > 5 min
          items.push({
            id: `transition-${++itemCounter}`,
            type: 'transition',
            startTime: prevEndTime,
            endTime: transitionEnd,
            fromStage: prev.stage,
            toStage: festSet.stage,
            notes: `Walk ${walkTime} min from ${prev.stage} to ${festSet.stage}`,
          });

          const gapMinutes = getDurationMinutes(transitionEnd, actualStart);
          if (gapMinutes > 5) {
            items.push({
              id: `break-${++itemCounter}`,
              type: 'break',
              startTime: transitionEnd,
              endTime: actualStart,
              notes: `Free time (${gapMinutes} min)`,
            });
          }
        }
      } else {
        // Same stage — check for gap
        const gapMinutes = getDurationMinutes(prevEndTime, actualStart);
        if (gapMinutes > 2) {
          items.push({
            id: `break-${++itemCounter}`,
            type: 'break',
            startTime: prevEndTime,
            endTime: actualStart,
            notes: `Gap at ${festSet.stage} (${gapMinutes} min)`,
          });
        }
      }
    }

    items.push({
      id: `set-${festSet.id}`,
      type: 'set',
      startTime: actualStart,
      endTime: festSet.endTime,
      artist: festSet.artist,
      stage: festSet.stage,
      genre: festSet.genre,
      isPartial,
      preferenceLevel: level,
      notes: isPartial
        ? `Arriving late — catching last ${getDurationMinutes(actualStart, festSet.endTime)} min`
        : undefined,
    });
  }

  // 7. Prepend sheep travel / arrival block if a start threshold was set and the first set doesn't start at it
  if (startThreshold && items.length > 0) {
    const firstStart = items[0].startTime;
    if (firstStart > startThreshold) {
      items.unshift({
        id: 'arrival-block',
        type: 'arrival',
        startTime: startThreshold,
        endTime: firstStart,
        notes: 'Sheep travel time — rolling to the festival',
      });
    }
  }

  // 8. Detect conflicts: must-see sets that were NOT included
  const mustSeeSets = daySets.filter(
    s => getPreferenceLevel(s.artist, preferences) === 'must-see'
  );
  const missedMustSee = mustSeeSets.filter(s => !selectedIds.has(s.id));

  const conflicts: ConflictExplanation[] = [];
  let conflictCounter = 0;

  for (const missed of missedMustSee) {
    // Find which selected set(s) conflict with this missed set
    const conflicting = selectedSets.filter(sel => {
      // Overlap check
      return sel.startTime < missed.endTime && missed.startTime < sel.endTime;
    });

    if (conflicting.length > 0) {
      conflicts.push({
        id: `conflict-${++conflictCounter}`,
        conflictingSets: [missed, ...conflicting],
        reason: conflicting.length === 1
          ? `"${missed.artist}" at ${missed.stage} overlaps with "${conflicting[0].artist}" at ${conflicting[0].stage}. The algorithm chose "${conflicting[0].artist}" (score: ${scoreSet(conflicting[0], preferences, true)} vs ${scoreSet(missed, preferences, true)}).`
          : `"${missed.artist}" overlaps with multiple selected sets: ${conflicting.map(s => `"${s.artist}"`).join(', ')}.`,
        chosenSetId: conflicting[0]?.id,
      });
    } else {
      // Not overlapping directly but still missed — travel time issue
      conflicts.push({
        id: `conflict-${++conflictCounter}`,
        conflictingSets: [missed],
        reason: `"${missed.artist}" at ${missed.stage} could not be reached in time due to travel constraints.`,
        chosenSetId: undefined,
      });
    }
  }

  return {
    items,
    conflicts,
    score: bestScore,
  };
}
