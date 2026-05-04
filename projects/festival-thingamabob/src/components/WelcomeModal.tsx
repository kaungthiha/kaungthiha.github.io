import { useState } from 'react';

const STORAGE_KEY = 'sheepherder_onboarding_done';

const STEPS = [
  {
    icon: '💙',
    title: 'Tag the Lineup',
    body: 'Browse artists by day and mark each one: 💙 Must See, 👍 Nice to See, 😐 Neutral, or 🚫 Avoid. Your must-see picks are what the schedule optimizer works hardest to fit in.',
  },
  {
    icon: '🗺️',
    title: 'Round Up Your Schedule',
    body: "In Herd Settings, pick your First Set of the Day — that artist is guaranteed first and sets the start time. Set trekking time, then hit Round Up. Any must-sees that couldn't fit appear as Lost Sheep.",
  },
  {
    icon: '🐑',
    title: 'Herd Your Flock',
    body: 'Share your flock code with friends so they can join. Tap the code in the top bar to see everyone\'s schedules side-by-side and lock the plan once you\'re set. On a new device? Use "Restore my session" on the flock screen, enter the code, and pick your name.',
  },
];

interface WelcomeModalProps {
  onDone: () => void;
}

export function WelcomeModal({ onDone }: WelcomeModalProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function handleDone() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border overflow-hidden shadow-2xl" style={{ backgroundColor: '#111118', borderColor: '#1e1e2e' }}>
        {/* Progress bar */}
        <div className="flex">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 transition-all duration-300 ${i <= step ? 'bg-festival-blue' : 'bg-slate-800'}`}
            />
          ))}
        </div>

        <div className="p-6">
          {/* Content */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">{current.icon}</div>
            <h3 className="text-lg font-bold text-white mb-2">{current.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{current.body}</p>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === step ? 'w-4 h-1.5 bg-festival-blue' : 'w-1.5 h-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Back
              </button>
            )}
            <button
              onClick={isLast ? handleDone : () => setStep(s => s + 1)}
              className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm transition-all"
              style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
            >
              {isLast ? "Let's go 🐑" : 'Next →'}
            </button>
          </div>

          {!isLast && (
            <button
              onClick={handleDone}
              className="w-full mt-3 text-xs text-slate-700 hover:text-slate-500 transition-colors py-1"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function shouldShowWelcome(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== '1'; } catch { return true; }
}
