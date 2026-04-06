import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:            'rgb(var(--bg) / <alpha-value>)',
        surface:       'rgb(var(--surface) / <alpha-value>)',
        's2':          'rgb(var(--s2) / <alpha-value>)',
        's3':          'rgb(var(--s3) / <alpha-value>)',
        accent:        'rgb(var(--accent) / <alpha-value>)',
        'accent-h':    'rgb(var(--accent-h) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        danger:        'rgb(var(--danger) / <alpha-value>)',
        warning:       'rgb(var(--warning) / <alpha-value>)',
        success:       'rgb(var(--success) / <alpha-value>)',
        info:          'rgb(var(--info) / <alpha-value>)',
        tx:            'rgb(var(--tx) / <alpha-value>)',
        'tx-2':        'rgb(var(--tx-2) / <alpha-value>)',
        'tx-3':        'rgb(var(--tx-3) / <alpha-value>)',
        border:        'rgb(var(--border) / <alpha-value>)',
        'border-2':    'rgb(var(--border-2) / <alpha-value>)',
      },
      fontFamily: {
        mono:    ['"DM Mono"', 'monospace'],
        sans:    ['"DM Mono"', 'monospace'],
        heading: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        card:     '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
        'card-md': '0 4px 8px rgba(16,24,40,0.08), 0 1px 3px rgba(16,24,40,0.04)',
        glow:     '0 0 0 3px rgba(37,99,235,0.12)',
        'glow-sm': '0 0 0 2px rgba(37,99,235,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
