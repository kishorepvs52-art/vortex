import type { Config } from 'tailwindcss';

// VORTEX design tokens — agriculture × AI × neon, glassmorphism-first.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#030705',
        abyss: '#04120a',
        panel: '#06140c',
        'deep-green': '#0b3d2e',
        neon: {
          DEFAULT: '#39ff88',
          dim: '#1fd46b',
          dark: '#0a5c30',
        },
        leaf: '#00e676',
        cyan: {
          DEFAULT: '#22d3ee',
          dim: '#0e7490',
        },
        iris: '#3b82f6',
        violet: '#a855f7',
        amber: {
          DEFAULT: '#ffb020',
        },
        danger: '#ff5c5c',
        cream: '#e8f5ec',
        muted: '#9db8a6',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontWeight: {
        '400': '400',
        '500': '500',
        '600': '600',
        '700': '700',
      },
      boxShadow: {
        neon: '0 0 12px rgba(57,255,136,0.35), 0 0 40px rgba(57,255,136,0.12)',
        'neon-strong': '0 0 18px rgba(57,255,136,0.55), 0 0 60px rgba(57,255,136,0.2)',
        cyan: '0 0 12px rgba(34,211,238,0.4), 0 0 40px rgba(34,211,238,0.12)',
        glass: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        float: '0 24px 60px rgba(0,0,0,0.55)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(57,255,136,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,136,0.05) 1px, transparent 1px)',
        'aurora':
          'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(11,61,46,0.55), transparent), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(14,116,144,0.25), transparent), radial-gradient(ellipse 70% 60% at 50% 110%, rgba(57,255,136,0.12), transparent)',
      },
      backgroundSize: {
        'grid-32': '32px 32px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(2deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.65', boxShadow: '0 0 10px rgba(57,255,136,0.3)' },
          '50%': { opacity: '1', boxShadow: '0 0 26px rgba(57,255,136,0.65)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.6s ease-in-out infinite',
        'scan-line': 'scan-line 2.4s linear infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
