import { heroui } from '@heroui/react';
import * as tailwindcssanimate from 'tailwindcss-animate';
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        'dash-violet': {
          50: '#f1eeff',
          100: '#e6e1ff',
          200: '#d2cbff',
          300: '#b7acff',
          400: '#9c8cff',
          500: '#8470ff',
          600: '#755ff8',
          700: '#5d47de',
          800: '#4634b1',
          900: '#2f227c',
          950: '#1c1357',
        },
        'dash-sky': {
          50: '#e3f3ff',
          100: '#d1ecff',
          200: '#b6e1ff',
          300: '#a0d7ff',
          400: '#7bc8ff',
          500: '#67bfff',
          600: '#56b1f3',
          700: '#3193da',
          800: '#1c71ae',
          900: '#124d79',
          950: '#0b324f',
        },
        'dash-green': {
          50: '#d2ffe2',
          100: '#b1fdcd',
          200: '#8bf0b0',
          300: '#67e294',
          400: '#4bd37d',
          500: '#3ec972',
          600: '#34bd68',
          700: '#239f52',
          800: '#15773a',
          900: '#0f5429',
          950: '#0a3f1e',
        },
        'dash-red': {
          50: '#ffe8e8',
          100: '#ffd1d1',
          200: '#ffb2b2',
          300: '#ff9494',
          400: '#ff7474',
          500: '#ff5656',
          600: '#fa4949',
          700: '#e63939',
          800: '#c52727',
          900: '#941818',
          950: '#600f0f',
        },
        'dash-yellow': {
          50: '#fff2c9',
          100: '#ffe7a0',
          200: '#ffe081',
          300: '#ffd968',
          400: '#f7cd4c',
          500: '#f0bb33',
          600: '#dfad2b',
          700: '#bc9021',
          800: '#816316',
          900: '#4f3d0e',
          950: '#342809',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        slack: {
				DEFAULT: '#5c3B58',
				dark: '#481349',
				medium: '#5E2C5F'
			},
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
    },
  },
  plugins: [
    tailwindcssanimate,
    heroui({
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#755ff8',
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
};
