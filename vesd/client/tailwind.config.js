/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F1F1F',
        muted: '#6A6F83',
        line: '#CED8F4',
        brand: '#2453D6',
        action: '#2453D6',
        secondary: '#2453D6',
        premium: '#CDBE9F',
        soft: '#F2F5FF',
        surface: '#FBF9FD',
        brand2: '#9DAFE5',
        pale: '#CED8F4',
        night: '#1F1F1F'
      },
      fontFamily: {
        sans: ['SF Pro Text', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 45px rgba(90, 143, 250, 0.16)'
      }
    }
  },
  plugins: []
};
