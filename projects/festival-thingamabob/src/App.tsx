import { useState, useMemo, useCallback } from 'react';
import { ArtistPreference, PreferenceLevel, UserPreferences, GeneratedItinerary } from './types/festival';
import { EDC_2026_SETS, DAYS } from './lib/sampleData';
import { generateItinerary } from './lib/itineraryOptimizer';
import {
  FlockInfo,
  FlockDetails,
  savePreferences,
  getFlockDetails,
  lockFlock,
  unlockFlock,
  saveFlockCache,
  loadFlockCache,
} from './lib/flockApi';
import { ArtistPreferencePicker } from './components/ArtistPreferencePicker';
import { PreferenceControls } from './components/PreferenceControls';
import { ItineraryTimeline } from './components/ItineraryTimeline';
import { ConflictPanel } from './components/ConflictPanel';
import { HowItWorks } from './components/HowItWorks';
import { PasscodeGate } from './components/PasscodeGate';
import { FlockGate } from './components/FlockGate';
import { FlockView } from './components/FlockView';

const FLOCK_SESSION_KEY = 'sheepherder_flock';

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
  const [artistPreferences, setArtistPreferences] = useState<ArtistPreference[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);

  // Flock state
  const [flockReady, setFlockReady] = useState<boolean>(() => readFlockSession() !== null);
  const [flockInfo, setFlockInfo] = useState<FlockInfo | null>(() => readFlockSession());
  const [showFlockView, setShowFlockView] = useState(false);
  const [flockDetails, setFlockDetails] = useState<FlockDetails | null>(null);
  const [flockLoading, setFlockLoading] = useState(false);

  const handlePreferenceChange = useCallback((artist: string, level: PreferenceLevel) => {
    setArtistPreferences(prev => {
      const existing = prev.find(p => p.artist === artist);
      if (existing) {
        if (existing.level === level) {
          return prev.map(p => p.artist === artist ? { ...p, level: 'neutral' } : p);
        }
        return prev.map(p => p.artist === artist ? { ...p, level } : p);
      }
      return [...prev, { artist, level }];
    });
  }, []);

  function handleFlockJoined(info: FlockInfo) {
    try { sessionStorage.setItem(FLOCK_SESSION_KEY, JSON.stringify(info)); } catch { /* ignore */ }
    setFlockInfo(info);
    setFlockReady(true);
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
    <PasscodeGate>
      {!flockReady ? (
        <FlockGate onJoined={handleFlockJoined} onSkip={handleFlockSkip} />
      ) : (
        <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
          {/* Header */}
          <header className="border-b border-[#1e1e2e] sticky top-0 z-50 backdrop-blur-md bg-[#0a0a0f]/90">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1
                    className="text-2xl sm:text-3xl font-black leading-none flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    🐑 SheepHerder
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                    EDC Las Vegas 2026 — Where do the sheep go when the lights go out
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {flockInfo && (
                    <button
                      onClick={handleViewFlock}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-festival-blue/30 bg-festival-blue/10 hover:bg-festival-blue/20 transition-colors text-xs"
                    >
                      <span className="text-festival-cyan font-mono font-bold tracking-wider">{flockInfo.tripCode}</span>
                      <span className="text-slate-400 hidden sm:inline">View Flock</span>
                      <span className="text-slate-400">🐑</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => { if (step === 'itinerary') { setStep('preferences'); setShowFlockView(false); } }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                        step === 'preferences' && !showFlockView
                          ? 'bg-festival-blue text-white font-semibold'
                          : 'text-slate-500 hover:text-slate-300 cursor-pointer'
                      }`}
                    >
                      <span>1</span>
                      <span className="hidden sm:inline">Preferences</span>
                    </button>
                    <span className="text-slate-700">→</span>
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                        step === 'itinerary' && !showFlockView
                          ? 'bg-festival-blue text-white font-semibold'
                          : 'text-slate-700'
                      }`}
                    >
                      <span>2</span>
                      <span className="hidden sm:inline">Itinerary</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 py-6 pb-16">

            {/* Flock view */}
            {showFlockView && flockInfo && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">
                  Your Flock
                  <span className="text-slate-500 font-normal ml-2 text-base">side-by-side view</span>
                </h2>
                {flockLoading && !flockDetails ? (
                  <div className="text-center py-20 text-slate-500">
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
                    <div>
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
                      />
                    </div>

                    <div className="space-y-4">
                      <PreferenceControls preferences={userPrefs} onChange={setUserPrefs} />

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
                      <div>
                        <h2 className="text-lg font-bold text-white mb-4">
                          Your {selectedDay} Herd Route
                        </h2>
                        <ItineraryTimeline items={itinerary.items} score={itinerary.score} />
                      </div>

                      <div className="space-y-4">
                        <ConflictPanel conflicts={itinerary.conflicts} />

                        <div className="bg-festival-card border border-festival-border rounded-xl p-4">
                          <h3 className="font-semibold text-slate-300 text-sm mb-3">Adjust & Re-herd</h3>
                          <PreferenceControls
                            preferences={userPrefs}
                            onChange={(prefs) => {
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

          <footer className="border-t border-[#1e1e2e] py-6 text-center text-xs text-slate-700">
            <p>SheepHerder · EDC Las Vegas 2026 · Don't be a lost sheep.</p>
          </footer>
        </div>
      )}
    </PasscodeGate>
  );
}
