import { ArtistPreference, UserPreferences } from '../types/festival'
import { FlockMemberData } from './flockApi'
import { generateItinerary } from './itineraryOptimizer'
import { EDC_2026_SETS } from './sampleData'

const DEFAULT_PREFS: UserPreferences = {
  defaultWalkingMinutes: 10,
  allowPartialSets: false,
  minimumSetMinutes: 20,
}

export function generateFlockItinerary(members: FlockMemberData[], day: string) {
  if (members.length === 0) return { items: [], conflicts: [], score: 0 }

  const mustVotes: Record<string, number> = {}
  const niceVotes: Record<string, number> = {}
  const avoidVotes: Record<string, number> = {}

  for (const member of members) {
    for (const pref of member.artistPreferences) {
      if (pref.level === 'must-see')    mustVotes[pref.artist]  = (mustVotes[pref.artist]  ?? 0) + 1
      else if (pref.level === 'nice-to-see') niceVotes[pref.artist] = (niceVotes[pref.artist] ?? 0) + 1
      else if (pref.level === 'avoid')  avoidVotes[pref.artist] = (avoidVotes[pref.artist] ?? 0) + 1
    }
  }

  const n = members.length
  const dayArtists = [...new Set(EDC_2026_SETS.filter(s => s.day === day).map(s => s.artist))]

  const aggregated: ArtistPreference[] = dayArtists.map(artist => {
    const avoids = avoidVotes[artist] ?? 0
    const musts  = mustVotes[artist]  ?? 0
    const nice   = niceVotes[artist]  ?? 0
    // Majority avoids → skip
    if (avoids > n / 2) return { artist, level: 'avoid' }
    // Any must-see → flock must-see
    if (musts >= 1)     return { artist, level: 'must-see' }
    // Any nice-to-see → nice-to-see
    if (nice >= 1)      return { artist, level: 'nice-to-see' }
    return { artist, level: 'neutral' }
  })

  const avgWalkTime = Math.round(
    members.reduce((sum, m) => sum + (m.userPrefs?.defaultWalkingMinutes ?? 10), 0) / n,
  )

  return generateItinerary(EDC_2026_SETS, aggregated, { ...DEFAULT_PREFS, defaultWalkingMinutes: avgWalkTime }, day)
}
