import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0f172a', light: '#1e293b' },
        maroon: { DEFAULT: '#6b1c35', light: '#8a2846', subtle: '#fdf2f4' },
        teal: { DEFAULT: '#4FBFB8', dark: '#3a9a94', light: '#7ed4cf' },
        slate: { DEFAULT: '#334155' },
        gray: { DEFAULT: '#64748b', light: '#94a3b8' },
        border: '#e2e8f0',
        bg: '#f8fafc',
        success: { DEFAULT: '#059669', bg: '#ecfdf5' },
        warning: { DEFAULT: '#d97706', bg: '#fffbeb' },
        error: { DEFAULT: '#dc2626', bg: '#fef2f2' },
        info: { DEFAULT: '#0284c7', bg: '#f0f9ff' },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
