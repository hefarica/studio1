import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6c5ce7',
          dark: '#5a4fcf',
          50: '#f0f0ff',
          100: '#e5e3ff',
          200: '#ccc9ff',
          300: '#a29bfe',
          400: '#7c7aff',
          500: '#6c5ce7',
          600: '#5a4fcf',
          700: '#4a3fb8',
          800: '#3d3399',
          900: '#322a7a',
        },
        secondary: { // Added from original HTML vars
          DEFAULT: '#a29bfe'
        },
        success: {
          DEFAULT: '#00b894',
          50: '#f0fdf9',
          500: '#00b894',
          600: '#00a085',
          700: '#008876',
        },
        warning: {
          DEFAULT: '#fdcb6e',
          500: '#fdcb6e',
          600: '#f4b942',
        },
        error: {
          DEFAULT: '#e84393',
          500: '#e84393',
          600: '#d6336c',
        },
        info: {
          DEFAULT: '#74b9ff',
          500: '#74b9ff',
          600: '#4fa8ff',
        },
        dark: {
          DEFAULT: '#2d3436',
          bg: '#2d3436',
          darker: '#1e2426',
          card: '#636e72',
          'card-hover': '#74808a',
        },
        slate: {
          850: '#1a202c',
          950: '#0d1117',
        }
      },
      animation: {
        'pulse-slow': 'pulse 2s infinite',
        'shimmer': 'shimmer 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(108, 92, 231, 0.3)',
        'glow-lg': '0 0 30px rgba(108, 92, 231, 0.4)',
        'success-glow': '0 0 20px rgba(0, 184, 148, 0.3)',
        'error-glow': '0 0 20px rgba(232, 67, 147, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config;