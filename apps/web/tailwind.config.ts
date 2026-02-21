import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          600: '#1f6feb',
          700: '#1b5fd1'
        }
      }
    }
  },
  plugins: [forms, typography]
} satisfies Config;
