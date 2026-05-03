import React, { useState, useMemo, useCallback } from 'react';
import { ArtistPreference, PreferenceLevel, UserPreferences, GeneratedItinerary } from './types/festival';
import { EDC_2026_SETS, DAYS } from './lib/sampleData';
import { generateItinerary } from './lib/itineraryOptimizer';
import { ArtistPreferencePicker } from './components/ArtistPreferencePicker';
import { PreferenceControls } from './components/PreferenceControls';
import { ItineraryTimeline } from './components/ItineraryTimeline';
import { ConflictPanel } from './components/ConflictPanel';
import { HowItWorks } from './components/HowItWorks';
import { PasscodeGate } from './components/PasscodeGate';

type AppStep = 'preferences' | 'itinerary';

const DEFAULT_PREFS: UserPreferences = {
  defaultWalkingMinutes: 10,
  allowPartialSets: false,
  minimumSetMinutes: 20,
};

export default function App() {
  const [step, setStep] = useState<AppStep>('preferences');
  const [selectedDay, setSelectedDay] = useState<string>('Friday');
  const [artistPreferences, setArtistPreferences] = useState<ArtistPreference[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);

  const handlePreferenceChange = useCallback((artist: string, level: PreferenceLevel) => {
    setArtistPreferences(prev => {
      const existing = prev.find(p => p.artist === artist);
      if (existing) {
        if (existing.level === level) {
          // clicking same level resets to neutral
          return prev.map(p => p.artist === artist ? { ...p, level: 'neutral' } : p);
        }
        return prev.map(p => p.artist === artist ? { ...p, level } : p);
      }
      return [...prev, { artist, level }];
    });
  }, []);

  function handleGenerate() {
    const result = generateItinerary(EDC_2026_SETS, artistPreferences, userPrefs, selectedDay);
    setItinerary(result);
    setStep('itinerary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setStep('preferences');
  }

  // Count preferences for the selected day
  const dayArtists = useMemo(
    () => EDC_2026_SETS.filter(s => s.day === selectedDay).map(s => s.artist),
    [selectedDay]
  );

  const dayPrefs = useMemo(
    () => artistPreferences.filter(p => dayArtists.includes(p.artist)),
    [artistPreferences, dayArtists]
  );

  const mustSeeCount = dayPrefs.filter(p => p.level === 'must-see').length;

  return (
    <PasscodeGate>
    <div className="min-h-screen bg-festival-noise" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <header className="border-b border-[#1e1e2e] sticky top-0 z-50 backdrop-blur-md bg-[#0a0a0f]/90">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gradient-cyber leading-none">
                RaveRoute
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                EDC Las Vegas 2026 — Turn chaos into your personal game plan
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => { if (step === 'itinerary') setStep('preferences'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  step === 'preferences'
                    ? 'bg-festival-fuchsia text-white font-semibold'
                    : 'text-slate-500 hover:text-slate-300 cursor-pointer'
                }`}
              >
                <span>1</span>
                <span className="hidden sm:inline">Preferences</span>
              </button>
              <span className="text-slate-700">→</span>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                  step === 'itinerary'
                    ? 'bg-festival-fuchsia text-white font-semibold'
                    : 'text-slate-700'
                }`}
              >
                <span>2</span>
                <span className="hidden sm:inline">Itinerary</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-16">
        {/* Day selector — always visible on preferences step */}
        {step === 'preferences' && (
          <div className="mb-6">
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                    selectedDay === day
                      ? 'bg-festival-fuchsia text-white shadow-glow-fuchsia'
                      : 'bg-festival-card border border-festival-border text-slate-400 hover:text-white hover:border-festival-fuchsia/50'
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
            {/* Left: artist picker */}
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

            {/* Right: controls + generate */}
            <div className="space-y-4">
              <PreferenceControls
                preferences={userPrefs}
                onChange={setUserPrefs}
              />

              {/* Generate button */}
              <div className="bg-festival-card border border-festival-border rounded-xl p-4">
                <button
                  onClick={handleGenerate}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-festival-fuchsia to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 transition-all duration-150 shadow-glow-fuchsia text-base"
                >
                  Generate My Itinerary →
                </button>
                {mustSeeCount > 0 ? (
                  <p className="mt-2 text-xs text-center text-slate-500">
                    Optimizing for {mustSeeCount} must-see artist{mustSeeCount !== 1 ? 's' : ''} on {selectedDay}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-center text-slate-600">
                    Mark artists as Must See or Nice to See first for best results
                  </p>
                )}
              </div>

              {/* Quick tip */}
              <div className="p-3 rounded-xl bg-festival-fuchsia/5 border border-festival-fuchsia/20">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <strong className="text-slate-400">Tip:</strong> The algorithm maximizes your
                  must-see count. Marking artists as Avoid removes them entirely.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'itinerary' && itinerary && (
          <div>
            {/* Back + day selector row */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-festival-card border border-festival-border text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-sm"
              >
                ← Back to Preferences
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
                        ? 'bg-festival-fuchsia text-white'
                        : 'bg-festival-card border border-festival-border text-slate-400 hover:text-white hover:border-festival-fuchsia/40'
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
              {/* Left: timeline */}
              <div>
                <h2 className="text-lg font-bold text-white mb-4">
                  Your {selectedDay} Itinerary
                </h2>
                <ItineraryTimeline
                  items={itinerary.items}
                  score={itinerary.score}
                />
              </div>

              {/* Right: conflicts + re-generate */}
              <div className="space-y-4">
                <ConflictPanel conflicts={itinerary.conflicts} />

                <div className="bg-festival-card border border-festival-border rounded-xl p-4">
                  <h3 className="font-semibold text-slate-300 text-sm mb-3">Adjust & Regenerate</h3>
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
                    }}
                    className="mt-3 w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-festival-fuchsia to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 transition-all duration-150 text-sm"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <HowItWorks />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] py-6 text-center text-xs text-slate-700">
        <p>RaveRoute · EDC Las Vegas 2026 · Lineup data for planning purposes only</p>
      </footer>
    </div>
    </PasscodeGate>
  );
}
