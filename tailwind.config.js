/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0a',
        'bg-secondary': '#111111',
        'phosphor': {
          DEFAULT: '#00ff41',
          dim: '#00aa2a',
          bright: '#33ff66',
        },
        'amber': {
          DEFAULT: '#ffb000',
          dim: '#aa7500',
        },
        'text-primary': '#e0e0e0',
        'text-secondary': '#888888',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'typing': 'typing 0.1s steps(1) infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        glow: {
          '0%': { filter: 'drop-shadow(0 0 2px #00ff41)' },
          '100%': { filter: 'drop-shadow(0 0 8px #00ff41)' },
        },
      },
      boxShadow: {
        'phosphor': '0 0 10px #00ff41, 0 0 20px #00ff4140',
        'amber': '0 0 10px #ffb000, 0 0 20px #ffb00040',
      },
    },
  },
  plugins: [],
}
