'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/track'

const PATH_LABELS: Record<string, string> = {
  '/':               'War Room',
  '/leads':          'All Leads',
  '/pipeline':       'Pipeline',
  '/calendar':       'Calendar',
  '/stats':          'Statistics',
  '/offers':         'Offers',
  '/team':           'Team',
  '/outreach':       'Outreach',
  '/finance':        'Finance',
  '/settings/goals': 'Goal Targets',
}

function labelForPath(path: string): string {
  if (PATH_LABELS[path]) return `Navigated to ${PATH_LABELS[path]}`
  if (path.startsWith('/leads/')) return 'Opened a lead'
  if (path.startsWith('/offer/')) return 'Viewed offer link'
  return `Navigated to ${path}`
}

export default function PageTracker() {
  const pathname = usePathname()
  const prev = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === prev.current) return
    prev.current = pathname
    // Skip lead detail — LeadDetail fires a more specific event with the lead name
    if (!pathname.startsWith('/leads/')) {
      track('page_view', labelForPath(pathname))
    }
  }, [pathname])

  return null
}
