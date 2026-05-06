/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dc: {
          bg:      '#0b0f1a',
          surface: '#111827',
          card:    '#161d2e',
          border:  '#1f2d45',
          // Capital One brand
          navy:    '#004879',
          coral:   '#D22E1E',
          // accent palette
          blue:    '#3b82f6',
          indigo:  '#6366f1',
          cyan:    '#22d3ee',
          green:   '#10b981',
          amber:   '#f59e0b',
          red:     '#ef4444',
          muted:   '#64748b',
          text:    '#e2e8f0',
          subtext: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-blue':  '0 0 20px rgba(59,130,246,0.35)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
}
