/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        festival: {
          bg: '#0f131f',
          card: '#1b1f2c',
          'card-low': '#171b28',
          'card-high': '#262a37',
          'card-highest': '#313442',
          border: '#424754',
          'border-subtle': '#353946',
          blue: '#adc6ff',
          'blue-bright': '#4d8eff',
          cyan: '#38bdf8',
          green: '#4edea3',
          'green-bright': '#00a572',
          pink: '#ffafd3',
          'pink-bright': '#e364a7',
          purple: '#a855f7',
          surface: '#0a0e1a',
          muted: '#8c909f',
          text: '#dfe2f3',
          'text-dim': '#c2c6d6',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.25rem',
        DEFAULT: '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
      },
      boxShadow: {
        'glow-blue':   '0 0 20px rgba(173, 198, 255, 0.35), 0 0 40px rgba(77, 142, 255, 0.18)',
        'glow-green':  '0 0 20px rgba(78, 222, 163, 0.4), 0 0 40px rgba(0, 165, 114, 0.15)',
        'glow-cyan':   '0 0 20px rgba(56, 189, 248, 0.4), 0 0 40px rgba(56, 189, 248, 0.15)',
        'glow-purple': '0 0 15px rgba(168, 85, 247, 0.4)',
        'glow-pink':   '0 0 20px rgba(255, 175, 211, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(173, 198, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(173, 198, 255, 0.7), 0 0 40px rgba(77, 142, 255, 0.3)' },
        }
      }
    },
  },
  plugins: [],
}
