/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#080c14',
          secondary: '#0d1220',
          card: 'rgba(255,255,255,0.04)',
        },
        accent: {
          purple: '#7c3aed',
          indigo: '#4f46e5',
          cyan: '#06b6d4',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        },
        border: {
          subtle: 'rgba(255,255,255,0.08)',
          medium: 'rgba(255,255,255,0.12)',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#475569',
        },
      },
      backgroundImage: {
        'gradient-purple': 'linear-gradient(135deg, #7c3aed, #4f46e5)',
        'gradient-cyan': 'linear-gradient(135deg, #06b6d4, #0891b2)',
        'gradient-heat': 'linear-gradient(135deg, #f59e0b, #ef4444)',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124,58,237,0.3)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
