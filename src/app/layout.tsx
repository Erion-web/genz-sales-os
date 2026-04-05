import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GENZ Sales OS',
  description: 'CRM & Sales Follow-up Enforcement System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
