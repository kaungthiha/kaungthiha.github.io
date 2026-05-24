# SheepHerder — Design Document

A complete reference for replicating the SheepHerder festival itinerary app from scratch. Covers architecture, data models, algorithms, Supabase schema, theming, and every component.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Type System](#4-type-system)
5. [Supabase Schema](#5-supabase-schema)
6. [Storage & Persistence](#6-storage--persistence)
7. [Itinerary Generation Algorithm](#7-itinerary-generation-algorithm)
8. [Flock Aggregation Algorithm](#8-flock-aggregation-algorithm)
9. [Component Architecture](#9-component-architecture)
10. [Navigation Model](#10-navigation-model)
11. [Flock API](#11-flock-api)
12. [Theming & Design System](#12-theming--design-system)
13. [Environment & Build](#13-environment--build)
14. [Key UX Flows](#14-key-ux-flows)
15. [Replication Checklist](#15-replication-checklist)

---

## 1. Project Overview

SheepHerder is a festival schedule optimizer with multiplayer group coordination ("flock"). Users tag artists by preference level, and a weighted interval scheduling algorithm builds the optimal personal itinerary around walk time between stages. Members of a flock share their schedules via Supabase so the group can see a consensus route, coordinate meetup points, and have the party leader lock the final plan.

**Core features:**
- Preference-tagged artist lineup per day
- Walk-time-aware itinerary generation via dynamic programming
- Partial set catch-up (late arrival) support
- Artist pinning / forced inclusion
- Conflict detection with plain-English explanations
- Flock creation, joining, and cross-device rejoin
- Side-by-side member schedule comparison
- Aggregated flock route with member attendance dots
- Leader-controlled set swaps, meetup points, and schedule lock
- localStorage caching for instant load + Supabase for persistence

---

## 2. Tech Stack

| Layer | Choice | Version |
|---|---|---|
| UI | React | 18.3.1 |
| Language | TypeScript | 5.4.5 |
| Build | Vite | 8.0.10 |
| Styling | Tailwind CSS | 3.4.4 |
| Backend | Supabase (PostgreSQL) | `@supabase/supabase-js` 2.x |
| Fonts | Space Grotesk (display), Plus Jakarta Sans (body) | Google Fonts |

No external UI library. All components are custom Tailwind.

---

## 3. Repository Structure

```
projects/festival-thingamabob/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx                   # React entry point
    ├── App.tsx                    # Root component, all app state
    ├── types/
    │   └── festival.ts            # All shared TypeScript types
    ├── lib/
    │   ├── supabase.ts            # Supabase client init
    │   ├── flockApi.ts            # All Supabase calls + local cache
    │   ├── itineraryOptimizer.ts  # Core DP scheduling algorithm
    │   ├── flockItinerary.ts      # Flock preference aggregation
    │   ├── sampleData.ts          # EDC 2026 lineup + stage/day lists
    │   ├── timeUtils.ts           # Date helpers
    │   └── csvParser.ts           # CSV import parsing
    └── components/
        ├── FlockGate.tsx          # Create / join / rejoin flock entry
        ├── FlockView.tsx          # Flock coordination view
        ├── ArtistPreferencePicker.tsx
        ├── PreferenceControls.tsx
        ├── ItineraryTimeline.tsx
        ├── ConflictPanel.tsx
        ├── SwapModal.tsx
        ├── WelcomeModal.tsx
        ├── HowItWorks.tsx
        ├── SchedulePreview.tsx
        ├── CsvUploader.tsx
        ├── PasscodeGate.tsx
        └── InfoTip.tsx
```

**Build output** goes to `../../tools/festival-thingamabob/` (sibling in the same repo), deployed as a static site.

---

## 4. Type System

All types live in `src/types/festival.ts` and `src/lib/flockApi.ts`.

### 4.1 Core Festival Types

```typescript
type PreferenceLevel = "must-see" | "nice-to-see" | "neutral" | "avoid";

type FestivalSet = {
  id: string;
  artist: string;
  stage: string;
  startTime: Date;
  endTime: Date;
  genre?: string;
  day: string;           // "Friday" | "Saturday" | "Sunday"
  notes?: string;
};

type ArtistPreference = {
  artist: string;
  level: PreferenceLevel;
};

type UserPreferences = {
  defaultWalkingMinutes: number;    // 5–20
  allowPartialSets: boolean;        // catch partial sets after walking
  minimumSetMinutes: number;        // 20–45, min catchable time
  dayStartTimes?: Record<string, string>;   // day → "HH:MM" 24h
  firstSetByDay?: Record<string, string>;   // day → artist name (forced anchor)
  pinnedByDay?: Record<string, string[]>;   // day → artist names (pinned overrides)
};

type ItineraryItem = {
  id: string;
  type: "set" | "transition" | "break" | "arrival" | "conflict";
  startTime: Date;
  endTime: Date;
  artist?: string;
  stage?: string;
  genre?: string;
  fromStage?: string;
  toStage?: string;
  notes?: string;
  isPartial?: boolean;
  isFirstSet?: boolean;
  preferenceLevel?: PreferenceLevel;
};

type MeetupPoint = {
  id: string;
  afterItemId: string;   // ID of the ItineraryItem this follows
  time: Date;
  location: string;
  notes?: string;
};

type ConflictExplanation = {
  id: string;
  conflictingSets: FestivalSet[];
  reason: string;
  chosenSetId?: string;
};

type GeneratedItinerary = {
  items: ItineraryItem[];
  conflicts: ConflictExplanation[];
  score: number;
};
```

### 4.2 Flock Types (in `flockApi.ts`)

```typescript
type FlockInfo = {
  tripCode: string;
  memberId: string;
  memberName: string;
  isLeader: boolean;
};

type FlockMemberData = {
  id: string;
  name: string;
  selectedDay: string | null;
  artistPreferences: ArtistPreference[];
  userPrefs: UserPreferences | null;
  hasGenerated: boolean;
  isLeader: boolean;
};

type FlockDetails = {
  members: FlockMemberData[];
  isLocked: boolean;
  lockedAt: Date | null;
  flockPinnedByDay: Record<string, string[]>;
  meetups: MeetupPoint[];
};

type MemberPrefsData = {
  artistPreferences: ArtistPreference[];
  userPrefs: UserPreferences | null;
  selectedDay: string | null;
};
```

---

## 5. Supabase Schema

Two tables. Run these migrations before deploying.

```sql
-- Flock trips (one per group)
CREATE TABLE trips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_code  VARCHAR(6) UNIQUE NOT NULL,
  locked_at  TIMESTAMPTZ,
  flock_pinned JSONB DEFAULT '{}',   -- Record<string, string[]>
  meetups    JSONB DEFAULT '[]',     -- MeetupPoint[] (time stored as ISO string)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per person in a flock
CREATE TABLE flock_members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id            UUID REFERENCES trips(id) ON DELETE CASCADE,
  name               VARCHAR(24) NOT NULL,
  is_leader          BOOLEAN NOT NULL DEFAULT false,
  selected_day       VARCHAR(10),
  artist_preferences JSONB DEFAULT '[]',  -- ArtistPreference[]
  user_prefs         JSONB,               -- UserPreferences
  has_generated      BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

**Notes:**
- Trip codes are 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `I`, `O`, `1`, `0` to avoid visual confusion).
- The first member inserted gets `is_leader = true`; all subsequent joiners get `false`.
- `flock_pinned` and `meetups` are only ever written by the leader.
- `MeetupPoint.time` is serialised as an ISO string in the `meetups` JSONB column and deserialised to `Date` in `getFlockDetails`.
- No Row-Level Security is enforced in the current implementation — suitable for a low-stakes public tool. Add RLS policies if you need it.

---

## 6. Storage & Persistence

### 6.1 localStorage Keys

| Key | Type | Purpose |
|---|---|---|
| `sheepherder_artist_prefs` | `ArtistPreference[]` JSON | Personal artist tags, persists across sessions |
| `sheepherder_user_prefs` | `UserPreferences` JSON | Walk time, partial sets, day start, pins |
| `sheepherder_flock_cache_${tripCode}` | `{ details: FlockDetails, cachedAt: string }` | Cached flock snapshot for instant display on re-open |
| `sheepherder_onboarding_done` | `"1"` | Suppresses the welcome modal after first visit |

### 6.2 sessionStorage Keys

| Key | Type | Purpose |
|---|---|---|
| `sheepherder_flock` | `FlockInfo` JSON | Active flock session; cleared on tab close |

### 6.3 Caching Strategy

When the user opens the Flock view:
1. `loadFlockCache(tripCode)` is read immediately — the UI renders from stale data instantly.
2. `getFlockDetails(tripCode)` is fired async — on resolve, state and the cache are both updated.

This means zero loading spinner on repeat visits while still getting fresh data.

---

## 7. Itinerary Generation Algorithm

**File:** `src/lib/itineraryOptimizer.ts`

The core problem is **Weighted Interval Scheduling**: given a set of time-bounded sets with preference scores, find the highest-scoring non-overlapping chain that respects stage walking time.

### 7.1 Scoring

```
must-see    → 100 + 10 (full set bonus)  = 110
nice-to-see →  40 + 10                  =  50
neutral     →  10 + 10                  =  20
avoid       → filtered out before DP
pinned      → +50,000 override boost
partial set → base score – 5 penalty
```

### 7.2 Transition Rules

```
canTransition(a → b):
  same stage:      a.endTime ≤ b.startTime
  diff stage:      a.endTime + walkingMinutes ≤ b.startTime

canCatchPartial(a → b):
  arrivalAtB = a.endTime + (same stage ? 0 : walkingMinutes)
  arrivalAtB < b.endTime  AND
  (b.endTime – arrivalAtB) ≥ minimumSetMinutes
```

### 7.3 DP Table

```
dp[i] = {
  score:     best total score for a chain ending at set i
  prevIndex: index of previous set in chain (-1 if first)
  partial:   true if arrived late at set i
}

For each set i:
  dp[i].score = pinBoost + preferenceScore + 10  (standalone)
  For each j < i:
    if canTransition(j → i):
      candidate = dp[j].score + pinBoost + preferenceScore + 10
    elif allowPartialSets and canCatchPartial(j → i):
      candidate = dp[j].score + pinBoost + preferenceScore – 5
    keep whichever candidate is highest
```

Backtrack from the highest `dp[i].score` to reconstruct the chain.

### 7.4 Handling Pinned / Forced Sets

When the user pins artists (or sets a first-set anchor), forced sets are resolved in two passes before running DP:

1. **Mutual conflict resolution** — iterate forced sets in chronological order; greedily keep those that don't overlap with already-kept forced sets (accounting for walk time). This resolves the case where the user pins two artists that physically can't both be attended.

2. **Exclusion** — any non-forced set that overlaps with a resolved forced set is removed from the candidate pool entirely, so DP cannot accidentally select a conflicting set over a pinned one.

3. **DP runs** with the surviving candidate pool and the 50,000-point boost on forced sets, ensuring they are always chosen.

### 7.5 Building Result Items

After the chain is selected, `buildResult` constructs the `ItineraryItem[]`:

- **Arrival block** — if a `dayStart` or `firstSet` is set and the first selected set starts later.
- **Transition** — when consecutive sets are on different stages.
- **Break** — gap >5 min between transition end and next set start (or >2 min at the same stage).
- **Set** — actual set item; `actualStart` is adjusted for partial late arrivals.

### 7.6 Conflict Explanation

After the chain is built, all `must-see` sets not in the result are examined:

- If they overlap a selected set → explain which set "won" and why (score comparison).
- If they were unreachable due to walk time → say so explicitly.

---

## 8. Flock Aggregation Algorithm

**File:** `src/lib/flockItinerary.ts`

```
Input: members[] (each has artistPreferences for the day)

For each artist on the selected day:
  avoids = count of members who tagged "avoid"
  musts  = count of members who tagged "must-see"
  nice   = count of members who tagged "nice-to-see"

  if avoids > n / 2  → "avoid"   (majority veto)
  elif musts >= 1    → "must-see" (any single must-see wins)
  elif nice >= 1     → "nice-to-see"
  else               → "neutral"

Walking time = average of members' defaultWalkingMinutes (rounded)

Pass aggregated ArtistPreference[] → generateItinerary()
```

**Leader overrides:** In `FlockView`, if the leader has pinned artists via set swaps, `flockPinnedByDay[selectedDay]` is passed as `pinnedByDay` into a second call to `generateItinerary`, overriding the aggregated result for those artists. These pins are persisted to `trips.flock_pinned` in Supabase.

---

## 9. Component Architecture

### 9.1 App.tsx — Root State

All application state lives here. Key state variables:

| Variable | Type | Purpose |
|---|---|---|
| `step` | `'preferences' \| 'itinerary'` | Which individual view is showing |
| `selectedDay` | string | Active festival day |
| `artistPreferences` | `ArtistPreference[]` | User's tags |
| `userPrefs` | `UserPreferences` | Walk time, pins, partial sets |
| `itinerary` | `GeneratedItinerary \| null` | Last generated result |
| `flockInfo` | `FlockInfo \| null` | Current user's flock session |
| `flockDetails` | `FlockDetails \| null` | All members + flock state |
| `showFlockView` | boolean | Flock pane visible |
| `flockPinnedByDay` | `Record<string, string[]>` | Leader's flock-level pins |
| `flockMeetups` | `MeetupPoint[]` | Shared meetup points |

Key handlers in `App.tsx`:

- `handleGenerate()` — runs optimizer, saves preferences to Supabase
- `handleFlockJoined(info)` — stores session, hydrates preferences from Supabase for cross-device rejoin
- `handleViewFlock()` — loads from cache instantly, then fetches fresh from Supabase
- `handleFlockPinnedChange(pins)` — saves to Supabase `trips.flock_pinned`, updates cache
- `handleFlockMeetupsChange(meetups)` — saves to Supabase `trips.meetups`, updates cache
- `handleLockToggle(lock)` — calls `lockFlock` / `unlockFlock`
- `handleSwap(out, in)` / `handlePinToggle(artist)` — update `userPrefs.pinnedByDay`, regenerate

### 9.2 FlockGate.tsx

Entry modal shown before the app. Three modes:
- **create** — name input → `createTrip()` → shows the new trip code
- **join** — code + name → `joinTrip()` → hands off to `onJoined`
- **rejoin** — code → fetches member list → user picks their name → restores session

Also handles the `?flock=XXXXXX` URL param for invite links (auto-populates the join code).

### 9.3 FlockView.tsx

The largest component (~980 lines). Layout: two-pane grid.

**Left pane — member columns**

- `MemberColumn` per member (horizontal scroll)
- Each column shows the member's individual itinerary for the selected day
- Shared sets highlighted green with a `×N` badge
- Leader sees a `✕` remove button on non-self members

**Right pane — Flock Route**

- `FlockPowerBar` — progress bar showing how many members have generated schedules
- `FlockRoutePanel` — the aggregated/pinned flock itinerary
  - `RouteSetCard` — one stop; shows attendance dots per member
  - `MemberDot` — colored circle per member; greyed + pink pip if absent; click opens `MissingPopover` showing what they're doing instead
  - Leader sees `⇄` swap button on each set card → opens `SwapModal`
  - Leader sees `📍 meetup` button after each set, and `📍` inline on transitions/breaks → opens `MeetupForm`
  - `FlockMeetupCard` — rendered after the relevant stop; leader can remove

**Internal state in FlockView:**
- `selectedDay` — day tab selector
- `lockLoading`, `confirmLeave`, `leaveLoading`, `copiedLink` — UI feedback flags
- `addingAfter` — which stop has the meetup form open (in `FlockRoutePanel`)

### 9.4 ItineraryTimeline.tsx

Renders the user's personal schedule. Items are rendered in order:

- `ArrivalRow` — "Rolling to see X" or "Rolling to the festival"
- `SetRow` — artist card with pin toggle and swap button
- `TransitionRow` — walk indicator with `📍 meetup` button (individual, not synced)
- `BreakRow` — free time indicator with `📍 meetup` button
- `MeetupForm` — inline form that appears between items
- `MeetupCard` — displayed after the relevant item

Individual meetups are local state only (not synced to Supabase).

### 9.5 SwapModal.tsx

Opens when the leader clicks `⇄` on a flock route card (or a user clicks swap on their own timeline). Filters `allDaySets` to a ±30-minute window around the outgoing set's start time, excluding already-scheduled artists. Confirms the swap.

### 9.6 ArtistPreferencePicker.tsx

The artist tagging grid for the selected day. Renders one card per artist/set with four toggle buttons: 💙 must-see, 👍 nice-to-see, 😐 neutral, 🚫 avoid. Toggling the same level twice resets to neutral. Also renders a 🏁 first-set selector per artist.

### 9.7 PreferenceControls.tsx

Walk time slider, partial sets toggle, minimum set duration slider, day start time picker. All changes call `onChange(prefs)` which saves to localStorage and updates state.

### 9.8 ConflictPanel.tsx

Shows missed must-see sets after generation. Each conflict has a "Force in" button that calls `onForceIn(artist)` → pins the artist → regenerates.

---

## 10. Navigation Model

No URL router. Navigation is entirely React state-driven.

```
flockReady = false
└── <FlockGate>                   # blocks the whole app

flockReady = true, showFlockView = false
├── step = 'preferences'          # artist tagging + generate
└── step = 'itinerary'            # generated timeline + conflicts

flockReady = true, showFlockView = true
└── <FlockView>                   # flock coordination
```

**Query string:** `?flock=XXXXXX` is read once on mount via `useMemo` and passed to `FlockGate` as `inviteCode`. After joining it is stripped with `history.replaceState`.

---

## 11. Flock API

**File:** `src/lib/flockApi.ts`

All Supabase interactions. Uses `@supabase/supabase-js` client.

```typescript
// Create a new flock (retries up to 3× on trip_code collision)
createTrip(memberName: string): Promise<FlockInfo | null>

// Join an existing flock by code
joinTrip(tripCode: string, memberName: string): Promise<{ result: FlockInfo | null; error: string | null }>

// Fetch all members + trip state for a flock
getFlockDetails(tripCode: string): Promise<FlockDetails | null>

// Fetch one member's stored preferences (for cross-device rejoin hydration)
getMemberData(memberId: string): Promise<MemberPrefsData | null>

// Save a member's day, artist preferences, and user preferences
savePreferences(memberId, day, artistPrefs, userPrefs): Promise<void>

// Remove a member (leader action or self-leave)
removeMember(memberId: string): Promise<boolean>

// Lock/unlock the flock schedule (leader only)
lockFlock(tripCode: string): Promise<boolean>
unlockFlock(tripCode: string): Promise<boolean>

// Persist leader's flock-level set pins
saveFlockPinned(tripCode: string, pinnedByDay: Record<string, string[]>): Promise<void>

// Persist flock meetup points
saveTripMeetups(tripCode: string, meetups: MeetupPoint[]): Promise<void>

// localStorage cache helpers
saveFlockCache(tripCode, details): void
loadFlockCache(tripCode): FlockDetails | null
loadAllFlockCaches(): CachedFlockEntry[]   // sorted by cachedAt desc
```

**Trip code alphabet:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
Letters `I` and `O` and digits `0` and `1` are excluded to avoid confusion with `1/I` and `0/O` at a glance.

---

## 12. Theming & Design System

### 12.1 Tailwind Custom Colors

```javascript
// tailwind.config.js
festival: {
  bg:           '#0f131f',   // page background
  surface:      '#0a0e1a',   // darkest surface (modals)
  card:         '#1b1f2c',   // standard card
  'card-low':   '#171b28',   // slightly darker card
  'card-high':  '#262a37',   // hover / elevated
  'card-highest':'#313442',
  border:       '#424754',
  'border-subtle':'#353946',
  muted:        '#8c909f',   // secondary text
  text:         '#dfe2f3',   // primary text
  'text-dim':   '#c2c6d6',
  blue:         '#adc6ff',   // primary action
  'blue-bright':'#4d8eff',
  cyan:         '#38bdf8',
  green:        '#4edea3',   // success / shared sets
  'green-bright':'#00a572',
  pink:         '#ffafd3',   // conflict
  'pink-bright':'#e364a7',
  purple:       '#a855f7',
}
```

### 12.2 Typography

- **Display / headings:** Space Grotesk (`font-display`)
- **Body:** Plus Jakarta Sans (`font-body`)
- Both loaded from Google Fonts in `index.html`

### 12.3 Glow Shadows

```javascript
'glow-blue':   '0 0 20px rgba(173,198,255,0.35), 0 0 40px rgba(77,142,255,0.18)'
'glow-green':  '0 0 20px rgba(78,222,163,0.4),   0 0 40px rgba(0,165,114,0.15)'
'glow-cyan':   '0 0 20px rgba(56,189,248,0.4),   0 0 40px rgba(56,189,248,0.15)'
'glow-purple': '0 0 15px rgba(168,85,247,0.4)'
'glow-pink':   '0 0 20px rgba(255,175,211,0.35)'
```

### 12.4 Recurring UI Patterns

| Pattern | Implementation |
|---|---|
| Primary button | `linear-gradient(135deg, #2563eb, #0ea5e9)` with `glow-blue` shadow |
| Active nav pill | `linear-gradient(135deg, #4d8eff, #adc6ff)`, dark text |
| Card | `bg-festival-card border border-festival-border rounded-xl` |
| Sticky header | `backdrop-blur-md` + semi-transparent `rgba(15,19,31,0.92)` |
| Shared-set highlight | `bg-emerald-950/30 border-l-2 border-festival-green` |
| Must-see highlight | member-color left border + `bg-slate-900/60` |
| Amber / meetup accent | `border-amber-500/30`, `text-amber-300`, `rgba(245,158,11,0.06)` bg |

### 12.5 Stage Colors (ItineraryTimeline)

Each EDC stage maps to a distinct color for set cards:

| Stage | Color |
|---|---|
| Kinetic Field | Amber / Yellow |
| Circuit Grounds | Blue |
| Cosmic Meadow | Green |
| Neon Garden | Pink |
| Basspod | Red |
| Wasteland | Orange |
| Quantum Valley | Indigo |
| Stereo Bloom | Teal |
| Bionic Jungle | Lime |

### 12.6 Member Colors (FlockView)

Members are assigned colors by index, cycling through six palettes:

```
index 0: Blue   (#60a5fa family)
index 1: Pink   (#f472b6 family)
index 2: Emerald(#34d399 family)
index 3: Violet (#a78bfa family)
index 4: Amber  (#fbbf24 family)
index 5: Cyan   (#22d3ee family)
```

Each palette has `bg`, `text`, `border`, and `dot` variants.

---

## 13. Environment & Build

### 13.1 Environment Variables

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Put these in `.env.local` (not committed). Vite exposes them as `import.meta.env.VITE_*`.

### 13.2 Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 13.3 Vite Config

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: '/tools/festival-thingamabob/',
  build: {
    outDir: '../../tools/festival-thingamabob',
    emptyOutDir: true,
  },
})
```

Adjust `base` and `outDir` to match your deployment path.

### 13.4 Build & Run

```bash
npm install
npm run dev      # local dev server
npm run build    # tsc type-check + vite bundle
```

---

## 14. Key UX Flows

### 14.1 Individual Schedule

1. App loads → `FlockGate` shown (create / join / skip)
2. **Preferences** tab: pick a day, tag artists 💙 / 👍 / 🚫, set walk time
3. Optionally set a first-set anchor (🏁) or day start time
4. "Round Up My Schedule" → `generateItinerary()` → switch to **Herding** tab
5. Review timeline; pin missed must-sees via `ConflictPanel` → auto-regenerates
6. Swap any set for another via `SwapModal`
7. Add personal meetup points on `TransitionRow` / `BreakRow`

### 14.2 Creating a Flock

1. `FlockGate` → Create → enter name → `createTrip()` → trip code displayed
2. Copy code or invite link (`?flock=XXXXXX`)
3. Members join; each generates their own schedule
4. Leader opens Flock view → sees all member columns + master route
5. Leader can swap sets in the flock route → persisted to Supabase
6. Leader adds meetup points → visible to all
7. Leader locks schedule → lock banner shown to non-leaders

### 14.3 Joining / Rejoining

- **Join:** Enter code + name → session stored in `sessionStorage`
- **Rejoin:** Enter code → member list fetched → pick name → preferences hydrated from Supabase into localStorage
- **Invite link:** `?flock=XXXXXX` pre-fills the join form

---

## 15. Replication Checklist

Follow this order to build SheepHerder from scratch:

- [ ] Scaffold project: `npm create vite@latest -- --template react-ts`
- [ ] Install deps: `@supabase/supabase-js`, Tailwind CSS + PostCSS
- [ ] Configure Tailwind with the custom `festival` color palette and fonts
- [ ] Add Google Fonts (Space Grotesk, Plus Jakarta Sans) in `index.html`
- [ ] Define all types in `src/types/festival.ts`
- [ ] Create Supabase project; run the `trips` and `flock_members` SQL migrations
- [ ] Implement `src/lib/timeUtils.ts` (time parsing, formatting, duration, overlap)
- [ ] Implement `src/lib/sampleData.ts` (festival lineup — or substitute CSV upload)
- [ ] Implement `src/lib/itineraryOptimizer.ts` (DP algorithm, `buildResult`, conflicts)
- [ ] Implement `src/lib/flockItinerary.ts` (voting aggregation)
- [ ] Implement `src/lib/flockApi.ts` (Supabase CRUD + localStorage cache)
- [ ] Build `ArtistPreferencePicker`, `PreferenceControls` (pure UI, no Supabase)
- [ ] Build `ItineraryTimeline`, `ConflictPanel`, `SwapModal`
- [ ] Build `FlockGate` (create / join / rejoin flows)
- [ ] Build `FlockView` (member columns, flock route, meetups, lock/leave)
- [ ] Wire everything together in `App.tsx` with state + handlers
- [ ] Add `WelcomeModal` and `HowItWorks`
- [ ] Test DP edge cases: overlapping must-sees, partial sets, pinned conflicts
- [ ] Test flock flows: cross-device rejoin, meetup serialisation, lock state

---

*SheepHerder — EDC Las Vegas 2026. Don't be a lost sheep.*
