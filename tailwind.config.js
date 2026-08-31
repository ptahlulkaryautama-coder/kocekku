/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,html}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold: {
          50:  '#FDFBF7',
          100: '#FBF7ED',
          200: '#F4EBD2',
          300: '#ECD9AA',
          400: '#E1BF79',
          500: '#D4AF37',
          600: '#B8942B',
          700: '#855F1B',
          800: '#75571A',
          900: '#604617',
        },
        surface: {
          0:   '#FFFFFF',
          50:  '#FAF9F5',
          100: '#F5F3EC',
          200: '#E5E2DA',
          800: '#1C1917',
          850: '#141210',
          900: '#0C0A09',
        }
      }
    }
  },
  plugins: []
};
