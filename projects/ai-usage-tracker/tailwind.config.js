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
          // Canvas layers (deepest → brightest)
          bg:      '#080e18',   // surface-container-lowest
          surface: '#161c26',   // surface-container-low
          card:    '#1a202a',   // surface-container
          border:  '#424655',   // outline-variant
          outline: '#8c90a1',   // outline

          // Capital One brand (kept for identity chip / IdentityGate)
          navy:    '#004879',
          coral:   '#D22E1E',

          // Primary interactive
          blue:    '#0067ff',   // primary-container
          indigo:  '#b3c5ff',   // primary / surface-tint

          // Tertiary / data accent
          cyan:    '#4cd6ff',   // tertiary

          // Semantic
          green:   '#10b981',   // kept — no direct FIS equivalent for success
          amber:   '#f59e0b',   // kept for warning/value
          red:     '#ffb4aa',   // secondary (FIS uses red for high-impact/negative)

          // Typography
          text:    '#dde2f1',   // on-surface
          subtext: '#c2c6d8',   // on-surface-variant
          muted:   '#8c90a1',   // outline
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Work Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm:  '0.25rem',
        DEFAULT: '0.5rem',
        md:  '0.75rem',
        lg:  '1rem',
        xl:  '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        'glow-blue':  '0 0 20px rgba(0,103,255,0.35)',
        'glow-cyan':  '0 0 20px rgba(76,214,255,0.25)',
        'card':       '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
