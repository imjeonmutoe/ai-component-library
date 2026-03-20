import type { Config } from 'tailwindcss';

const config: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors: {
        ai: {
          primary: '#6366f1',
          'primary-hover': '#4f46e5',
          surface: '#f8fafc',
          border: '#e2e8f0',
        },
      },
      keyframes: {
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;