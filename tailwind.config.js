/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Press Start 2P"', 'Courier New', 'monospace'],
      },
      colors: {
        'mc-dirt': '#8A593A',
        'mc-dirt-dark': '#5C3A26',
        'mc-stone': '#7F7F7F',
        'mc-stone-dark': '#4A4A4A',
        'mc-grass': '#5D9B2C',
        'mc-grass-dark': '#3D6B1C',
        'mc-wood': '#9C6D3E',
        'mc-wood-dark': '#6B4226',
        'mc-diamond': '#4AEDD9',
        'mc-diamond-dark': '#21A0A0',
        'mc-emerald': '#17DD62',
        'mc-emerald-dark': '#0A8A3A',
        'mc-gold': '#FCEE4B',
        'mc-gold-dark': '#DBA213',
        'mc-redstone': '#FF3333',
        'mc-lapis': '#345EC3',
        'mc-obsidian': '#1B1B2F',
        'mc-netherite': '#4A4144',
        'mc-amethyst': '#9B59D0',
        'mc-copper': '#B87333',
        'mc-text-light': '#FFFFFF',
        'mc-text-dark': '#AAAAAA',
        'mc-text-shadow': '#3F3F3F',
        'mc-ui-bg': '#C6C6C6',
        'mc-ui-bg-dark': '#2D2D2D',
        'mc-ui-border-light': '#FEFEFE',
        'mc-ui-border-dark': '#373737',
        'mc-inventory': '#8B8B8B',
      },
      boxShadow: {
        'mc': '4px 4px 0px #373737',
        'mc-inset': 'inset 2px 2px 0px #555555, inset -2px -2px 0px #FFFFFF',
        'mc-hover': '2px 2px 0px #373737',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    }
  },
  plugins: [],
}
