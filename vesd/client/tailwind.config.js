/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F1F1F',
        muted: '#6A6F83',
        line: '#AABBCE',
        brand: '#5A8FFA',
        action: '#5A8FFA',
        secondary: '#2C3D8F',
        premium: '#CDBE9F',
        soft: '#F2F5FF',
        surface: '#FBF9FD',
        brand2: '#7FA1F9',
        pale: '#AABBCE',
        night: '#1F1F1F'
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      },
      fontSize: {
        xs: ['16px', { lineHeight: '24px' }],
        sm: ['16px', { lineHeight: '24px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['24px', { lineHeight: '32px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
        '4xl': ['32px', { lineHeight: '40px' }],
        '5xl': ['48px', { lineHeight: '56px' }],
        '6xl': ['48px', { lineHeight: '56px' }],
        '7xl': ['48px', { lineHeight: '56px' }]
      },
      boxShadow: {
        soft: '0 18px 45px rgba(90, 143, 250, 0.16)'
      }
    }
  },
  plugins: []
};
