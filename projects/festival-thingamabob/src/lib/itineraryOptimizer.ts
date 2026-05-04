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

function canTransition(a: FestivalSet, b: FestivalSet, walkingMinutes: number): boolean {
  if (a.stage === b.stage) return a.endTime <= b.startTime;
  return addMinutes(a.endTime, walkingMinutes) <= b.startTime;
}

function canCatchPartial(
  a: FestivalSet,
  b: FestivalSet,
  walkingMinutes: number,
  minimumSetMinutes: number
): boolean {
  const walkTime = a.stage === b.stage ? 0 : walkingMinutes;
  const arrivalAtB = addMinutes(a.endTime, walkTime);
  if (arrivalAtB >= b.endTime) return false;
  return getDurationMinutes(arrivalAtB, b.endTime) >= minimumSetMinutes;
}

/**
 * DP over a subset of sets to find the best chain.
 * Returns { selectedIndices, partialFlags, score }.
 */
function dpChain(
  sorted: FestivalSet[],
  preferences: ArtistPreference[],
  walkingMinutes: number,
  allowPartialSets: boolean,
  minimumSetMinutes: number,
  forcedIds: Set<string>
): { selectedIndices: number[]; partialFlags: boolean[]; score: number } {
  const n = sorted.length;
  if (n === 0) return { selectedIndices: [], partialFlags: [], score: 0 };

  const dp: Array<{ score: number; prevIndex: number; partial: boolean }> = new Array(n);

  for (let i = 0; i < n; i++) {
    const current = sorted[i];
    const level = getPreferenceLevel(current.artist, preferences);
    const baseScore = PREFERENCE_SCORES[level];
    const pinBoost = forcedIds.has(current.id) ? 50000 : 0;

    dp[i] = { score: pinBoost + baseScore + 10, prevIndex: -1, partial: false };

    for (let j = i - 1; j >= 0; j--) {
      const prev = sorted[j];
      if (getPreferenceLevel(prev.artist, preferences) === 'avoid') continue;

      if (canTransition(prev, current, walkingMinutes)) {
        const candidate = dp[j].score + pinBoost + baseScore + 10;
        if (candidate > dp[i].score) {
          dp[i] = { score: candidate, prevIndex: j, partial: false };
        }
      } else if (allowPartialSets) {
        if (canCatchPartial(prev, current, walkingMinutes, minimumSetMinutes)) {
          const candidate = dp[j].score + pinBoost + baseScore - 5;
          if (candidate > dp[i].score) {
            dp[i] = { score: candidate, prevIndex: j, partial: true };
          }
        }
      }
    }
  }

  // Find best end — but if there are forced sets, we need to ensure we pick the chain
  // that covers the most forced sets with the highest score.
  let bestScore = -Infinity;
  let bestEnd = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i].score > bestScore) {
      bestScore = dp[i].score;
      bestEnd = i;
    }
  }

  const selectedIndices: number[] = [];
  const partialFlags: boolean[] = [];
  let cur = bestEnd;
  while (cur !== -1) {
    selectedIndices.unshift(cur);
    partialFlags.unshift(dp[cur].partial);
    cur = dp[cur].prevIndex;
  }

  return { selectedIndices, partialFlags, score: bestScore };
}

export function generateItinerary(
  sets: FestivalSet[],
  preferences: ArtistPreference[],
  userPrefs: UserPreferences,
  selectedDay: string
): GeneratedItinerary {
  const allDaySets = sets
    .filter(s => s.day === selectedDay)
    .filter(s => getPreferenceLevel(s.artist, preferences) !== 'avoid');

  const firstSetArtist = userPrefs.firstSetByDay?.[selectedDay];
  const firstSetEntry = firstSetArtist
    ? (allDaySets.find(s => s.artist === firstSetArtist) ?? null)
    : null;

  const startThreshold: Date | null = firstSetEntry
    ? firstSetEntry.startTime
    : (userPrefs.dayStartTimes?.[selectedDay]
        ? parseDayStartTime(selectedDay, userPrefs.dayStartTimes[selectedDay])
        : null);

  const daySets = allDaySets.filter(s => !startThreshold || s.startTime >= startThreshold);

  if (daySets.length === 0) {
    return { items: [], conflicts: [], score: 0 };
  }

  const sorted = [...daySets].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const pinnedArtists = userPrefs.pinnedByDay?.[selectedDay] ?? [];

  // Build the set of forced IDs: first set + user pins
  const forcedIds = new Set<string>();
  if (firstSetEntry) forcedIds.add(firstSetEntry.id);
  for (const artist of pinnedArtists) {
    const found = sorted.find(s => s.artist === artist);
    if (found) forcedIds.add(found.id);
  }

  // If no pins, run standard DP
  if (forcedIds.size === 0) {
    const { selectedIndices, partialFlags, score } = dpChain(
      sorted, preferences, userPrefs.defaultWalkingMinutes,
      userPrefs.allowPartialSets, userPrefs.minimumSetMinutes, forcedIds
    );
    return buildResult(
      sorted, selectedIndices, partialFlags, score,
      preferences, userPrefs, daySets, firstSetEntry, startThreshold
    );
  }

  // With forced sets: run DP with high boost — the boost (50000) ensures forced sets
  // will be chosen over any conflicting non-forced set in the optimal chain.
  // However, mutually-conflicting forced sets need special handling:
  // keep all forced sets that don't conflict with each other (prefer user's last pin).
  const forcedSets = sorted.filter(s => forcedIds.has(s.id));

  // Remove mutual conflicts among forced sets: sort by start time,
  // greedily keep forced sets that don't overlap with already-kept ones.
  const resolvedForced: FestivalSet[] = [];
  for (const fs of forcedSets) {
    const conflicts = resolvedForced.some(kept => {
      const walkNeeded = kept.stage === fs.stage ? 0 : userPrefs.defaultWalkingMinutes;
      const aBeforeB = addMinutes(kept.endTime, walkNeeded) > fs.startTime && kept.startTime < fs.endTime;
      const bBeforeA = addMinutes(fs.endTime, walkNeeded) > kept.startTime && fs.startTime < kept.endTime;
      return aBeforeB || bBeforeA;
    });
    if (!conflicts) resolvedForced.push(fs);
  }

  const resolvedForcedIds = new Set(resolvedForced.map(s => s.id));

  // Remove sets that conflict with any resolved forced set (they can't be chosen)
  const eligibleSets = sorted.filter(s => {
    if (resolvedForcedIds.has(s.id)) return true; // keep forced
    for (const forced of resolvedForced) {
      const walkNeeded = forced.stage === s.stage ? 0 : userPrefs.defaultWalkingMinutes;
      // s conflicts with forced if they overlap (considering walk time)
      const overlaps = forced.startTime < s.endTime && s.startTime < forced.endTime;
      // also exclude sets that can't be reached after forced (or before forced)
      if (overlaps) return false;
    }
    return true;
  });

  const { selectedIndices, partialFlags, score } = dpChain(
    eligibleSets, preferences, userPrefs.defaultWalkingMinutes,
    userPrefs.allowPartialSets, userPrefs.minimumSetMinutes, resolvedForcedIds
  );

  return buildResult(
    eligibleSets, selectedIndices, partialFlags, score,
    preferences, userPrefs, daySets, firstSetEntry, startThreshold
  );
}

function buildResult(
  sorted: FestivalSet[],
  selectedIndices: number[],
  partialFlags: boolean[],
  score: number,
  preferences: ArtistPreference[],
  userPrefs: UserPreferences,
  daySets: FestivalSet[],
  firstSetEntry: FestivalSet | null,
  startThreshold: Date | null
): GeneratedItinerary {
  const selectedSets = selectedIndices.map(i => sorted[i]);
  const selectedIds = new Set(selectedSets.map(s => s.id));

  const items: ItineraryItem[] = [];
  let itemCounter = 0;

  for (let idx = 0; idx < selectedSets.length; idx++) {
    const festSet = selectedSets[idx];
    const isPartial = partialFlags[idx];
    const level = getPreferenceLevel(festSet.artist, preferences);

    let actualStart = festSet.startTime;
    if (idx > 0 && isPartial) {
      const prev = selectedSets[idx - 1];
      const walkTime = prev.stage === festSet.stage ? 0 : userPrefs.defaultWalkingMinutes;
      actualStart = addMinutes(prev.endTime, walkTime);
    }

    if (idx > 0) {
      const prev = selectedSets[idx - 1];
      const prevEndTime = prev.endTime;

      if (prev.stage !== festSet.stage) {
        const walkTime = userPrefs.defaultWalkingMinutes;
        const transitionEnd = addMinutes(prevEndTime, walkTime);

        if (transitionEnd <= actualStart) {
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
      isFirstSet: !!firstSetEntry && festSet.id === firstSetEntry.id,
      preferenceLevel: level,
      notes: isPartial
        ? `Arriving late — catching last ${getDurationMinutes(actualStart, festSet.endTime)} min`
        : undefined,
    });
  }

  if (startThreshold && items.length > 0) {
    const firstStart = items[0].startTime;
    if (firstStart > startThreshold) {
      items.unshift({
        id: 'arrival-block',
        type: 'arrival',
        startTime: startThreshold,
        endTime: firstStart,
        notes: firstSetEntry
          ? `Rolling to see ${firstSetEntry.artist}`
          : 'Rolling to the festival',
      });
    }
  }

  const mustSeeSets = daySets.filter(
    s => getPreferenceLevel(s.artist, preferences) === 'must-see'
  );
  const missedMustSee = mustSeeSets.filter(s => !selectedIds.has(s.id));

  const conflicts: ConflictExplanation[] = [];
  let conflictCounter = 0;

  for (const missed of missedMustSee) {
    const conflicting = selectedSets.filter(sel =>
      sel.startTime < missed.endTime && missed.startTime < sel.endTime
    );

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
      conflicts.push({
        id: `conflict-${++conflictCounter}`,
        conflictingSets: [missed],
        reason: `"${missed.artist}" at ${missed.stage} could not be reached in time due to travel constraints.`,
        chosenSetId: undefined,
      });
    }
  }

  return { items, conflicts, score };
}
