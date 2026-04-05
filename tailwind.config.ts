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
        bg:          '#F6F8FB',
        surface:     '#FFFFFF',
        's2':        '#FAFBFD',
        's3':        '#F3F6FA',
        accent:      '#2563EB',
        'accent-h':  '#1D4ED8',
        'accent-soft': '#EFF6FF',
        danger:      '#DC2626',
        warning:     '#D97706',
        success:     '#16A34A',
        info:        '#0284C7',
        tx:          '#1F2937',
        'tx-2':      '#667085',
        'tx-3':      '#98A2B3',
        border:      '#E6EAF0',
        'border-2':  '#D0D5DD',
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
