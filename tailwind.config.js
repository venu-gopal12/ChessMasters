// Purpose: Tailwind theme tokens and content scanning configuration.
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          page: '#055826',
          pageAlt: '#16051F',
          surface: '#1B1B2E',
          surfaceAlt: '#14213D',
          ink: '#F8FAFC',
          muted: '#D7E0DC',
          accent: '#2563EB',
          accentHover: '#1D4ED8',
          accentSoft: '#14213D',
          action: '#3B82F6',
          actionHover: '#2563EB',
          danger: '#DC2626',
          success: '#22C55E',
        },
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'fadeIn': {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        },
        'slideUp': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'customPulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' }
        },
        'glowEffect': {
          '0%': { textShadow: '0 0 5px rgba(255,255,255,0.5)' },
          '50%': { textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.6)' },
          '100%': { textShadow: '0 0 5px rgba(255,255,255,0.5)' }
        },
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fadeIn': 'fadeIn 0.5s ease-out',
        'slideUp': 'slideUp 1s ease-in forwards',
        'customPulse': 'customPulse 0.8s ease-in-out infinite',
        'glowEffect': 'glowEffect 1.5s ease-in-out infinite',
        blob: "blob 7s infinite",
      }
    },
  },
  plugins: [],
}
