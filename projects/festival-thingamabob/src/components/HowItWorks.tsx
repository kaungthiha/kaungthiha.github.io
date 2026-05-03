import React, { useState } from 'react';

const STEPS = [
  {
    icon: '🎵',
    title: 'Browse the Lineup',
    description:
      'All EDC Las Vegas 2026 artists are pre-loaded. Browse by day — Friday, Saturday, or Sunday.',
    accent: 'border-festival-fuchsia/30 bg-festival-fuchsia/5',
    iconBg: 'bg-festival-fuchsia/10',
  },
  {
    icon: '💜',
    title: 'Pick Your Artists',
    description:
      'Tag each artist: Must See (💜), Nice to See (👍), Neutral (😐), or Avoid (🚫). Your preferences drive the optimizer.',
    accent: 'border-purple-700/30 bg-purple-900/10',
    iconBg: 'bg-purple-900/20',
  },
  {
    icon: '⚙️',
    title: 'Set Your Preferences',
    description:
      'Configure walk time between stages, whether to allow partial set attendance, and minimum time worth catching.',
    accent: 'border-festival-cyan/30 bg-festival-cyan/5',
    iconBg: 'bg-festival-cyan/10',
  },
  {
    icon: '🗺️',
    title: 'Generate Your Route',
    description:
      'Hit Generate. The optimizer runs weighted interval scheduling to maximize your must-see score while respecting travel time.',
    accent: 'border-green-700/30 bg-green-900/10',
    iconBg: 'bg-green-900/20',
  },
];

export function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 border border-festival-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">ℹ️</span>
          <span className="font-semibold text-slate-300">How RaveRoute Works</span>
        </div>
        <span className={`text-slate-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {open && (
        <div className="border-t border-festival-border px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${step.accent}`}
              >
                <div className={`w-10 h-10 rounded-xl ${step.iconBg} flex items-center justify-center text-xl mb-3`}>
                  {step.icon}
                </div>
                <div className="font-semibold text-slate-200 text-sm mb-1">
                  <span className="text-slate-600 mr-1">{i + 1}.</span>
                  {step.title}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-900/50 rounded-xl border border-festival-border/50">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">The Algorithm</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              RaveRoute uses <strong className="text-slate-400">weighted interval scheduling with dynamic programming</strong>.
              Each set gets a score based on your preference (Must See = 100 pts, Nice = 40 pts, Neutral = 10 pts),
              plus a 10-point bonus for attending the full set. The DP table finds the maximum-score sequence of
              non-overlapping sets, accounting for your configured walk time between different stages.
              When partial sets are enabled, the algorithm also considers arriving late to catch the end of a set
              if the remaining time meets your minimum threshold.
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Conflicts are detected when Must See sets overlap but only one could fit — both are shown in the
              Conflict Panel so you can adjust your preferences and regenerate.
            </p>
          </div>

          <div className="mt-3 p-3 bg-festival-fuchsia/5 border border-festival-fuchsia/20 rounded-xl">
            <p className="text-xs text-slate-500">
              <strong className="text-festival-fuchsia">Phase 2 coming:</strong> Interactive venue map with stage locations
              for real walking-distance estimates, plus export to Apple/Google Calendar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
