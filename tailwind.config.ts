import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#13131a',
        's2': '#1c1c27',
        's3': '#252535',
        accent: '#7c6af7',
        'accent-h': '#6a58e6',
        danger: '#ff4d4d',
        warning: '#f5a623',
        success: '#3ecf8e',
        info: '#4d9fff',
        tx: '#e8e8f0',
        'tx-2': '#a0a0b8',
        'tx-3': '#666680',
        border: '#2a2a3a',
        'border-2': '#3a3a50',
      },
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
        sans: ['"DM Mono"', 'monospace'],
        heading: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 106, 247, 0.15)',
        'glow-sm': '0 0 10px rgba(124, 106, 247, 0.1)',
      },
    },
  },
  plugins: [],
}

export default config
