import { supabase } from './supabase'
import { ArtistPreference, UserPreferences } from '../types/festival'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateTripCode(): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
}

export type FlockInfo = {
  tripCode: string
  memberId: string
  memberName: string
  isLeader: boolean
}

export type FlockMemberData = {
  id: string
  name: string
  selectedDay: string | null
  artistPreferences: ArtistPreference[]
  userPrefs: UserPreferences | null
  hasGenerated: boolean
  isLeader: boolean
}

export type FlockDetails = {
  members: FlockMemberData[]
  isLocked: boolean
  lockedAt: Date | null
}

const CACHE_KEY = (code: string) => `sheepherder_flock_cache_${code}`

export function saveFlockCache(tripCode: string, details: FlockDetails): void {
  try {
    localStorage.setItem(CACHE_KEY(tripCode), JSON.stringify({ details, cachedAt: new Date().toISOString() }))
  } catch { /* ignore */ }
}

export function loadFlockCache(tripCode: string): FlockDetails | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY(tripCode))
    if (!stored) return null
    return (JSON.parse(stored) as { details: FlockDetails }).details
  } catch { return null }
}

export async function createTrip(memberName: string): Promise<FlockInfo | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const tripCode = generateTripCode()
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({ trip_code: tripCode })
      .select('id')
      .single()

    if (tripError) {
      console.error('[createTrip] insert trips error:', tripError)
      if (tripError.code === '23505') continue
      return null
    }

    const { data: member, error: memberError } = await supabase
      .from('flock_members')
      .insert({ trip_id: trip.id, name: memberName, is_leader: true })
      .select('id')
      .single()

    if (memberError || !member) {
      console.error('[createTrip] insert flock_members error:', memberError)
      return null
    }

    return { tripCode, memberId: member.id, memberName, isLeader: true }
  }
  return null
}

export async function joinTrip(tripCode: string, memberName: string): Promise<{ result: FlockInfo | null; error: string | null }> {
  const normalized = tripCode.toUpperCase().trim()
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('trip_code', normalized)
    .single()

  if (tripError || !trip) {
    console.error('[joinTrip] select trips error:', tripError)
    const msg = tripError?.code === 'PGRST116'
      ? `No flock found with code "${normalized}"`
      : `Supabase error: ${tripError?.message ?? 'unknown'}`
    return { result: null, error: msg }
  }

  const { data: member, error: memberError } = await supabase
    .from('flock_members')
    .insert({ trip_id: trip.id, name: memberName, is_leader: false })
    .select('id')
    .single()

  if (memberError || !member) {
    console.error('[joinTrip] insert flock_members error:', memberError)
    return { result: null, error: memberError?.message ?? 'Failed to join flock' }
  }

  return { result: { tripCode: normalized, memberId: member.id, memberName, isLeader: false }, error: null }
}

export async function savePreferences(
  memberId: string,
  selectedDay: string,
  artistPreferences: ArtistPreference[],
  userPrefs: UserPreferences,
): Promise<void> {
  await supabase
    .from('flock_members')
    .update({
      selected_day: selectedDay,
      artist_preferences: artistPreferences,
      user_prefs: userPrefs,
      has_generated: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
}

export async function getFlockDetails(tripCode: string): Promise<FlockDetails | null> {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('trip_code', tripCode)
    .single()

  if (tripError || !trip) {
    console.error('[getFlockDetails] trip error:', tripError)
    return null
  }

  const { data: members, error: membersError } = await supabase
    .from('flock_members')
    .select('id, name, selected_day, artist_preferences, user_prefs, has_generated, is_leader')
    .eq('trip_id', (trip as Record<string, unknown>).id as string)
    .order('created_at', { ascending: true })

  if (membersError) console.error('[getFlockDetails] members error:', membersError)

  const tripRow = trip as Record<string, unknown>

  return {
    members: (members ?? []).map(m => {
      const row = m as Record<string, unknown>
      return {
        id: row.id as string,
        name: row.name as string,
        selectedDay: (row.selected_day as string) ?? null,
        artistPreferences: (row.artist_preferences as ArtistPreference[]) ?? [],
        userPrefs: (row.user_prefs as UserPreferences) ?? null,
        hasGenerated: (row.has_generated as boolean) ?? false,
        isLeader: (row.is_leader as boolean) ?? false,
      }
    }),
    isLocked: !!(tripRow.locked_at),
    lockedAt: tripRow.locked_at ? new Date(tripRow.locked_at as string) : null,
  }
}

export async function lockFlock(tripCode: string): Promise<boolean> {
  const { error } = await supabase
    .from('trips')
    .update({ locked_at: new Date().toISOString() })
    .eq('trip_code', tripCode)
  if (error) console.error('[lockFlock]', error)
  return !error
}

export async function unlockFlock(tripCode: string): Promise<boolean> {
  const { error } = await supabase
    .from('trips')
    .update({ locked_at: null })
    .eq('trip_code', tripCode)
  if (error) console.error('[unlockFlock]', error)
  return !error
}
