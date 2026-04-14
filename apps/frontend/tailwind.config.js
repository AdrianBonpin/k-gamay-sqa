/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF2EF',
          100: '#FFE1DA',
          200: '#FFBFAF',
          300: '#FF9B84',
          400: '#FF7359',
          500: '#FF4B3A',
          600: '#E8331F',
          700: '#B9261A',
          800: '#8A1C13',
          900: '#5D120C',
        },
        accent: {
          mustard: '#E8A317',
          forest: '#1F6B4A',
          cream: '#FAF7F2',
          charcoal: '#1A1A1A',
        },
        surface: {
          DEFAULT: '#FAF7F2',
          soft: '#F4EFE7',
          muted: '#EDE6DA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(26, 26, 26, 0.06)',
        lift: '0 20px 40px -12px rgba(26, 26, 26, 0.12)',
        glow: '0 10px 40px -8px rgba(255, 75, 58, 0.35)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
      },
      backgroundImage: {
        'hero-grain':
          'radial-gradient(circle at 20% 20%, rgba(255, 75, 58, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(232, 163, 23, 0.08) 0%, transparent 55%)',
      },
    },
  },
  plugins: [],
};
