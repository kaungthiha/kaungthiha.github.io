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
}

export type FlockMemberData = {
  id: string
  name: string
  selectedDay: string | null
  artistPreferences: ArtistPreference[]
  userPrefs: UserPreferences | null
  hasGenerated: boolean
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
      .insert({ trip_id: trip.id, name: memberName })
      .select('id')
      .single()

    if (memberError || !member) {
      console.error('[createTrip] insert flock_members error:', memberError)
      return null
    }

    return { tripCode, memberId: member.id, memberName }
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
    .insert({ trip_id: trip.id, name: memberName })
    .select('id')
    .single()

  if (memberError || !member) {
    console.error('[joinTrip] insert flock_members error:', memberError)
    return { result: null, error: memberError?.message ?? 'Failed to join flock' }
  }

  return { result: { tripCode: normalized, memberId: member.id, memberName }, error: null }
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

export async function getFlockMembers(tripCode: string): Promise<FlockMemberData[]> {
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('trip_code', tripCode)
    .single()

  if (!trip) return []

  const { data: members } = await supabase
    .from('flock_members')
    .select('id, name, selected_day, artist_preferences, user_prefs, has_generated')
    .eq('trip_id', trip.id)
    .order('created_at', { ascending: true })

  return (members ?? []).map(m => ({
    id: m.id,
    name: m.name,
    selectedDay: (m.selected_day as string) ?? null,
    artistPreferences: (m.artist_preferences as ArtistPreference[]) ?? [],
    userPrefs: (m.user_prefs as UserPreferences) ?? null,
    hasGenerated: (m.has_generated as boolean) ?? false,
  }))
}
