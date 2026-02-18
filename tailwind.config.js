/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PRIMARY: Orange (FALCON HERBS brand color - Ayurvedic + Energetic)
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',  // Primary buttons, links
          500: '#f97316',  // Main brand color
          600: '#ea580c',  // Hover states (matches FALCON HERBS logo)
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // ACCENT COLORS
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Green - Save, Approve, Done
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Red - Delete, Cancel, Error
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        premium: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',  // Purple - AI, Smart Camera, Premium features
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Amber - Warnings, alerts
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        dark: {
          DEFAULT: '#0a0a0f',
          50: '#18181b',
          100: '#1e1e24',
          200: '#27272a',
          300: '#3f3f46',
          400: '#52525b',
          500: '#71717a',
          600: '#a1a1aa',
        },
        // Legacy ayurvedic colors (keep for backward compatibility)
        ayurvedic: {
          neem: '#22c55e',
          turmeric: '#eab308',
          saffron: '#f97316',
          amla: '#84cc16',
          ashwagandha: '#a855f7',
          tulsi: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'flame': 'flame 4s ease-in-out infinite',
      },
      keyframes: {
        flame: {
          '0%, 100%': { stopColor: '#22c55e' },
          '25%': { stopColor: '#3b82f6' },
          '50%': { stopColor: '#8b5cf6' },
          '75%': { stopColor: '#ef4444' },
        },
      },
    },
  },
  plugins: [],
}
