import { useState, useMemo, useCallback } from 'react';
import { ArtistPreference, PreferenceLevel, UserPreferences, GeneratedItinerary } from './types/festival';
import { EDC_2026_SETS, DAYS } from './lib/sampleData';
import { generateItinerary } from './lib/itineraryOptimizer';
import {
  FlockInfo,
  FlockDetails,
  savePreferences,
  getFlockDetails,
  getMemberData,
  lockFlock,
  unlockFlock,
  saveFlockCache,
  loadFlockCache,
  removeMember,
} from './lib/flockApi';
import { ArtistPreferencePicker } from './components/ArtistPreferencePicker';
import { PreferenceControls } from './components/PreferenceControls';
import { ItineraryTimeline } from './components/ItineraryTimeline';
import { ConflictPanel } from './components/ConflictPanel';
import { HowItWorks } from './components/HowItWorks';
import { FlockGate } from './components/FlockGate';
import { FlockView } from './components/FlockView';
import { WelcomeModal, shouldShowWelcome } from './components/WelcomeModal';

const FLOCK_SESSION_KEY = 'sheepherder_flock';
const PREFS_STORAGE_KEY = 'sheepherder_artist_prefs';
const USER_PREFS_STORAGE_KEY = 'sheepherder_user_prefs';

function loadArtistPreferences(): ArtistPreference[] {
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ArtistPreference[];
  } catch { return []; }
}

function saveArtistPreferences(prefs: ArtistPreference[]) {
  try { localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

function loadUserPrefs(): UserPreferences {
  try {
    const stored = localStorage.getItem(USER_PREFS_STORAGE_KEY);
    if (!stored) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch { return DEFAULT_PREFS; }
}

function saveUserPrefs(prefs: UserPreferences) {
  try { localStorage.setItem(USER_PREFS_STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

type AppStep = 'preferences' | 'itinerary';

const DEFAULT_PREFS: UserPreferences = {
  defaultWalkingMinutes: 10,
  allowPartialSets: false,
  minimumSetMinutes: 20,
};

function readFlockSession(): FlockInfo | null {
  try {
    const stored = sessionStorage.getItem(FLOCK_SESSION_KEY);
    if (!stored) return null;
    const info = JSON.parse(stored) as FlockInfo;
    return { ...info, isLeader: info.isLeader ?? false };
  } catch {
    return null;
  }
}

export default function App() {
  const [step, setStep] = useState<AppStep>('preferences');
  const [selectedDay, setSelectedDay] = useState<string>('Friday');
  const [artistPreferences, setArtistPreferences] = useState<ArtistPreference[]>(loadArtistPreferences);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(loadUserPrefs);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);

  const [showWelcome, setShowWelcome] = useState<boolean>(shouldShowWelcome);

  const inviteCode = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('flock') ?? undefined; } catch { return undefined; }
  }, []);

  // Flock state
  const [flockReady, setFlockReady] = useState<boolean>(() => readFlockSession() !== null);
  const [flockInfo, setFlockInfo] = useState<FlockInfo | null>(() => readFlockSession());
  const [showFlockView, setShowFlockView] = useState(false);
  const [flockDetails, setFlockDetails] = useState<FlockDetails | null>(null);
  const [flockLoading, setFlockLoading] = useState(false);

  const handlePreferenceChange = useCallback((artist: string, level: PreferenceLevel) => {
    setArtistPreferences(prev => {
      const existing = prev.find(p => p.artist === artist);
      let next: ArtistPreference[];
      if (existing) {
        if (existing.level === level) {
          next = prev.map(p => p.artist === artist ? { ...p, level: 'neutral' } : p);
        } else {
          next = prev.map(p => p.artist === artist ? { ...p, level } : p);
        }
      } else {
        next = [...prev, { artist, level }];
      }
      saveArtistPreferences(next);
      return next;
    });
  }, []);

  async function handleFlockJoined(info: FlockInfo) {
    try { sessionStorage.setItem(FLOCK_SESSION_KEY, JSON.stringify(info)); } catch { /* ignore */ }
    setFlockInfo(info);
    setFlockReady(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('flock');
      history.replaceState(null, '', url.toString());
    } catch { /* ignore */ }

    // Hydrate picks from Supabase — covers cross-device rejoin
    const remote = await getMemberData(info.memberId);
    if (remote) {
      if (remote.artistPreferences.length > 0) {
        setArtistPreferences(remote.artistPreferences);
        saveArtistPreferences(remote.artistPreferences);
      }
      if (remote.userPrefs) {
        const merged = { ...DEFAULT_PREFS, ...remote.userPrefs };
        setUserPrefs(merged);
        saveUserPrefs(merged);
      }
      if (remote.selectedDay) {
        setSelectedDay(remote.selectedDay);
      }
    }
  }

  function handleFlockSkip() {
    setFlockReady(true);
  }

  function handleGenerate() {
    const result = generateItinerary(EDC_2026_SETS, artistPreferences, userPrefs, selectedDay);
    setItinerary(result);
    setStep('itinerary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (flockInfo) {
      savePreferences(flockInfo.memberId, selectedDay, artistPreferences, userPrefs);
    }
  }

  function handleBack() {
    setStep('preferences');
  }

  function handleFirstSetChange(artist: string) {
    const updated = { ...(userPrefs.firstSetByDay ?? {}) };
    if (artist) {
      updated[selectedDay] = artist;
    } else {
      delete updated[selectedDay];
    }
    setUserPrefs(prev => {
      const next = { ...prev, firstSetByDay: updated };
      saveUserPrefs(next);
      return next;
    });
  }

  async function handleViewFlock() {
    if (!flockInfo) return;
    setShowFlockView(true);
    setFlockLoading(true);

    // Show cached data immediately while fetching
    const cached = loadFlockCache(flockInfo.tripCode);
    if (cached) setFlockDetails(cached);

    const details = await getFlockDetails(flockInfo.tripCode);
    setFlockLoading(false);
    if (details) {
      setFlockDetails(details);
      saveFlockCache(flockInfo.tripCode, details);
    }
  }

  async function handleLockToggle(lock: boolean) {
    if (!flockInfo) return;
    const ok = lock
      ? await lockFlock(flockInfo.tripCode)
      : await unlockFlock(flockInfo.tripCode);
    if (ok && flockDetails) {
      const updated: FlockDetails = { ...flockDetails, isLocked: lock, lockedAt: lock ? new Date() : null };
      setFlockDetails(updated);
      saveFlockCache(flockInfo.tripCode, updated);
    }
  }

  async function handleLeave() {
    if (!flockInfo) return;
    await removeMember(flockInfo.memberId);
    try { sessionStorage.removeItem(FLOCK_SESSION_KEY); } catch { /* ignore */ }
    if (flockInfo.tripCode) {
      try { localStorage.removeItem(`sheepherder_flock_cache_${flockInfo.tripCode}`); } catch { /* ignore */ }
    }
    setFlockInfo(null);
    setFlockDetails(null);
    setFlockReady(false);
    setShowFlockView(false);
  }

  function handleSwap(outgoingArtist: string, incoming: import('./types/festival').FestivalSet) {
    setUserPrefs(prev => {
      // Remove the outgoing artist from pins (if it was pinned), add the incoming one
      const currentPins = prev.pinnedByDay?.[selectedDay] ?? [];
      const withoutOld = currentPins.filter(a => a !== outgoingArtist);
      const nextPins = withoutOld.includes(incoming.artist)
        ? withoutOld
        : [...withoutOld, incoming.artist];
      const nextPrefs = { ...prev, pinnedByDay: { ...(prev.pinnedByDay ?? {}), [selectedDay]: nextPins } };
      const result = generateItinerary(EDC_2026_SETS, artistPreferences, nextPrefs, selectedDay);
      setItinerary(result);
      saveUserPrefs(nextPrefs);
      return nextPrefs;
    });
  }

  function handlePinToggle(artist: string) {
    setUserPrefs(prev => {
      const currentPins = prev.pinnedByDay?.[selectedDay] ?? [];
      const isAlreadyPinned = currentPins.includes(artist);
      const nextPins = isAlreadyPinned
        ? currentPins.filter(a => a !== artist)
        : [...currentPins, artist];
      const updated = { ...(prev.pinnedByDay ?? {}), [selectedDay]: nextPins };
      const nextPrefs = { ...prev, pinnedByDay: updated };
      const result = generateItinerary(EDC_2026_SETS, artistPreferences, nextPrefs, selectedDay);
      setItinerary(result);
      saveUserPrefs(nextPrefs);
      return nextPrefs;
    });
  }

  async function handleRemoveMember(memberId: string) {
    await removeMember(memberId);
    if (flockDetails) {
      const updated: FlockDetails = {
        ...flockDetails,
        members: flockDetails.members.filter(m => m.id !== memberId),
      };
      setFlockDetails(updated);
      if (flockInfo) saveFlockCache(flockInfo.tripCode, updated);
    }
  }

  const dayArtists = useMemo(
    () => EDC_2026_SETS.filter(s => s.day === selectedDay).map(s => s.artist),
    [selectedDay],
  );

  const dayPrefs = useMemo(
    () => artistPreferences.filter(p => dayArtists.includes(p.artist)),
    [artistPreferences, dayArtists],
  );

  const mustSeeCount = dayPrefs.filter(p => p.level === 'must-see').length;

  return (
    <>
      {!flockReady ? (
        <FlockGate onJoined={handleFlockJoined} onSkip={handleFlockSkip} inviteCode={inviteCode} />
      ) : (
        <div className="min-h-screen" style={{ backgroundColor: '#0f131f' }}>
          {showWelcome && <WelcomeModal onDone={() => setShowWelcome(false)} />}
          {/* Header */}
          <header className="border-b border-festival-border/40 sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: 'rgba(15,19,31,0.92)' }}>
            <div className="max-w-6xl mx-auto px-5 py-3">
              <div className="flex items-center gap-6">
                {/* Wordmark */}
                <button
                  onClick={() => { setShowFlockView(false); setStep('preferences'); }}
                  className="text-xl font-black leading-none font-display flex-shrink-0"
                  style={{ color: '#adc6ff' }}
                >
                  SheepHerder
                </button>

                {/* Nav */}
                <nav className="flex items-center gap-1 flex-1">
                  {/* Grazing */}
                  <button
                    onClick={() => { setShowFlockView(false); setStep('preferences'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      step === 'preferences' && !showFlockView
                        ? 'text-festival-surface font-semibold'
                        : 'text-festival-muted hover:text-festival-text'
                    }`}
                    style={step === 'preferences' && !showFlockView ? {
                      background: 'linear-gradient(135deg, #4d8eff22, #adc6ff22)',
                      border: '1px solid rgba(173,198,255,0.25)',
                      color: '#adc6ff',
                    } : {}}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span className="hidden sm:inline">Grazing</span>
                  </button>

                  {/* Flock */}
                  <button
                    onClick={() => { if (flockInfo) { handleViewFlock(); } }}
                    disabled={!flockInfo}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      showFlockView
                        ? 'font-semibold'
                        : 'text-festival-muted hover:text-festival-text'
                    }`}
                    style={showFlockView ? {
                      background: 'linear-gradient(135deg, #4d8eff, #adc6ff)',
                      color: '#0f131f',
                      boxShadow: '0 0 12px rgba(77,142,255,0.35)',
                    } : {}}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span className="hidden sm:inline">Flock</span>
                    {flockInfo && (
                      <span className="text-xs font-mono font-bold opacity-70 hidden md:inline">{flockInfo.tripCode}</span>
                    )}
                  </button>

                  {/* Herding */}
                  <button
                    onClick={() => { setShowFlockView(false); if (step !== 'itinerary') return; }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      step === 'itinerary' && !showFlockView
                        ? 'font-semibold'
                        : 'text-festival-muted hover:text-festival-text'
                    }`}
                    style={step === 'itinerary' && !showFlockView ? {
                      background: 'linear-gradient(135deg, #4d8eff22, #adc6ff22)',
                      border: '1px solid rgba(173,198,255,0.25)',
                      color: '#adc6ff',
                    } : {}}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <span className="hidden sm:inline">Herding</span>
                  </button>

                </nav>

                {/* Right icons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowWelcome(true)}
                    className="w-8 h-8 rounded-full border border-festival-border/50 text-festival-muted hover:text-festival-text transition-colors flex items-center justify-center"
                    title="How it works"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  </button>
                  <button
                    className="w-8 h-8 rounded-full border border-festival-border/50 text-festival-muted hover:text-festival-text transition-colors flex items-center justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-5 py-8 pb-20">

            {/* Flock view */}
            {showFlockView && flockInfo && (
              <div>
                {flockLoading && !flockDetails ? (
                  <div className="text-center py-20 text-festival-muted">
                    <div className="text-4xl mb-3 animate-pulse">🐑</div>
                    <p>Rounding up the flock...</p>
                  </div>
                ) : (
                  <FlockView
                    members={flockDetails?.members ?? []}
                    currentMemberId={flockInfo.memberId}
                    initialDay={selectedDay}
                    tripCode={flockInfo.tripCode}
                    isLeader={flockInfo.isLeader}
                    isLocked={flockDetails?.isLocked ?? false}
                    onLockToggle={handleLockToggle}
                    onLeave={handleLeave}
                    onRemoveMember={handleRemoveMember}
                    onBack={() => setShowFlockView(false)}
                  />
                )}
              </div>
            )}

            {!showFlockView && (
              <>
                {step === 'preferences' && (
                  <div className="mb-6">
                    <div className="flex gap-2">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                            selectedDay === day
                              ? 'bg-festival-blue text-white shadow-glow-blue'
                              : 'bg-festival-card border border-festival-border text-slate-400 hover:text-white hover:border-festival-blue/50'
                          }`}
                        >
                          <span className="hidden sm:inline">
                            {day === 'Friday' ? 'Fri, May 15' : day === 'Saturday' ? 'Sat, May 16' : 'Sun, May 17'}
                          </span>
                          <span className="sm:hidden">{day.slice(0, 3)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'preferences' && (
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
                    <div className="order-2 lg:order-1">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">
                          {selectedDay === 'Friday' ? 'Friday, May 15' : selectedDay === 'Saturday' ? 'Saturday, May 16' : 'Sunday, May 17'}
                          <span className="text-slate-500 font-normal ml-2 text-base">Lineup</span>
                        </h2>
                        <div className="text-sm text-slate-500">
                          {EDC_2026_SETS.filter(s => s.day === selectedDay).length} sets
                        </div>
                      </div>
                      <ArtistPreferencePicker
                        sets={EDC_2026_SETS}
                        preferences={artistPreferences}
                        onPreferenceChange={handlePreferenceChange}
                        selectedDay={selectedDay}
                        firstSet={userPrefs.firstSetByDay?.[selectedDay] ?? ''}
                        onFirstSetChange={handleFirstSetChange}
                      />
                    </div>

                    <div className="space-y-4 order-1 lg:order-2">
                      <PreferenceControls preferences={userPrefs} onChange={(prefs) => { saveUserPrefs(prefs); setUserPrefs(prefs); }} selectedDay={selectedDay} />

                      <div className="bg-festival-card border border-festival-border rounded-xl p-4">
                        <button
                          onClick={handleGenerate}
                          className="w-full py-3 rounded-xl font-bold text-white transition-all duration-150 text-base"
                          style={{
                            background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                            boxShadow: '0 0 20px rgba(37,99,235,0.45)',
                          }}
                        >
                          Round Up My Schedule 🐑
                        </button>
                        {mustSeeCount > 0 ? (
                          <p className="mt-2 text-xs text-center text-slate-500">
                            Herding {mustSeeCount} must-see sheep on {selectedDay}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-center text-slate-600">
                            Tag some artists as Must See or Nice to See before rounding up
                          </p>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-festival-blue/5 border border-festival-blue/20">
                        <p className="text-xs text-slate-500 leading-relaxed">
                          <strong className="text-slate-400">Sheep tip:</strong> The algorithm maximizes your
                          must-see count. Marking artists as Avoid removes them from the pasture entirely.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'itinerary' && itinerary && (
                  <div>
                    <div className="flex items-center gap-4 mb-6 flex-wrap">
                      <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-festival-card border border-festival-border text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-sm"
                      >
                        ← Back to the Pasture
                      </button>
                      <div className="flex gap-2">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            onClick={() => {
                              setSelectedDay(day);
                              const result = generateItinerary(EDC_2026_SETS, artistPreferences, userPrefs, day);
                              setItinerary(result);
                            }}
                            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-150 ${
                              selectedDay === day
                                ? 'bg-festival-blue text-white'
                                : 'bg-festival-card border border-festival-border text-slate-400 hover:text-white hover:border-festival-blue/40'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                      <span className="text-slate-600 text-sm ml-auto">
                        {selectedDay === 'Friday' ? 'Friday, May 15' : selectedDay === 'Saturday' ? 'Saturday, May 16' : 'Sunday, May 17'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                      <div className="order-2 lg:order-1">
                        <h2 className="text-lg font-bold text-white mb-4">
                          Your {selectedDay} Herd Route
                        </h2>
                        <ItineraryTimeline
                          items={itinerary.items}
                          allDaySets={EDC_2026_SETS.filter(s => s.day === selectedDay)}
                          pinnedArtists={userPrefs.pinnedByDay?.[selectedDay] ?? []}
                          onTogglePin={handlePinToggle}
                          onSwap={handleSwap}
                        />
                      </div>

                      <div className="space-y-4 order-1 lg:order-2">
                        <ConflictPanel
                          conflicts={itinerary.conflicts}
                          onForceIn={handlePinToggle}
                          pinnedArtists={userPrefs.pinnedByDay?.[selectedDay] ?? []}
                        />

                        <div className="bg-festival-card border border-festival-border rounded-xl p-4">
                          <h3 className="font-semibold text-slate-300 text-sm mb-3">Adjust & Re-herd</h3>
                          <PreferenceControls
                            preferences={userPrefs}
                            selectedDay={selectedDay}
                            onChange={(prefs) => {
                              saveUserPrefs(prefs);
                              setUserPrefs(prefs);
                              const result = generateItinerary(EDC_2026_SETS, artistPreferences, prefs, selectedDay);
                              setItinerary(result);
                            }}
                          />
                          <button
                            onClick={() => {
                              const result = generateItinerary(EDC_2026_SETS, artistPreferences, userPrefs, selectedDay);
                              setItinerary(result);
                              if (flockInfo) {
                                savePreferences(flockInfo.memberId, selectedDay, artistPreferences, userPrefs);
                              }
                            }}
                            className="mt-3 w-full py-2.5 rounded-xl font-semibold text-white transition-all duration-150 text-sm"
                            style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
                          >
                            Re-herd the Flock 🐑
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <HowItWorks />
              </>
            )}
          </main>

          <footer className="border-t border-festival-border/30 py-6 text-center text-xs text-festival-muted/40">
            <p>SheepHerder · EDC Las Vegas 2026 · Don't be a lost sheep.</p>
          </footer>
        </div>
      )}
    </>
  );
}
