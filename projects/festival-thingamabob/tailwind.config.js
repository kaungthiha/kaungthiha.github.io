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
          bg: '#0a0a0f',
          card: '#111118',
          border: '#1e1e2e',
          blue: '#2563eb',
          cyan: '#38bdf8',
          purple: '#a855f7',
        }
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue':   '0 0 20px rgba(37, 99, 235, 0.55), 0 0 40px rgba(37, 99, 235, 0.22)',
        'glow-cyan':   '0 0 20px rgba(56, 189, 248, 0.4), 0 0 40px rgba(56, 189, 248, 0.15)',
        'glow-purple': '0 0 15px rgba(168, 85, 247, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(37, 99, 235, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(37, 99, 235, 0.8), 0 0 40px rgba(37, 99, 235, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
