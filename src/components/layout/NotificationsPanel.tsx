'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead, formatDate } from '@/types'

interface Notif {
  id: string
  leadId: string
  type: 'overdue' | 'today' | 'meeting'
  title: string
  sub: string
}

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchNotifs = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const in48h = new Date(Date.now() + 48 * 3600000).toISOString().split('T')[0]

    const { data } = await supabase
      .from('leads')
      .select('id, name, company, stage, next_followup, meetings')
      .not('stage', 'in', '("Closed","Dead")')
      .order('next_followup', { ascending: true })

    const leads = (data || []) as Lead[]
    const result: Notif[] = []

    // Overdue follow-ups
    leads
      .filter(l => l.next_followup < today)
      .forEach(l => result.push({
        id: `overdue-${l.id}`,
        leadId: l.id,
        type: 'overdue',
        title: l.name,
        sub: `Follow-up overdue since ${formatDate(l.next_followup)}`,
      }))

    // Due today
    leads
      .filter(l => l.next_followup === today)
      .forEach(l => result.push({
        id: `today-${l.id}`,
        leadId: l.id,
        type: 'today',
        title: l.name,
        sub: 'Follow-up due today',
      }))

    // Upcoming meetings in 48h
    leads.forEach(l => {
      Object.values(l.meetings || {}).forEach(m => {
        if (m?.date && m.date >= today && m.date <= in48h) {
          result.push({
            id: `meeting-${l.id}-${m.date}`,
            leadId: l.id,
            type: 'meeting',
            title: l.name,
            sub: `Meeting on ${formatDate(m.date)}${m.time ? ` at ${m.time}` : ''}`,
          })
        }
      })
    })

    setNotifs(result)
    setLoading(false)
  }

  // Fetch on open
  useEffect(() => {
    if (open) fetchNotifs()
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const countByType = (t: Notif['type']) => notifs.filter(n => n.type === t).length
  const badgeCount = countByType('overdue') + countByType('today')

  const iconColor = (type: Notif['type']) => ({
    overdue: 'text-danger bg-danger/10',
    today:   'text-warning bg-warning/10',
    meeting: 'text-info bg-info/10',
  }[type])

  const icon = (type: Notif['type']) => ({
    overdue: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    today: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    meeting: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  }[type])

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 rounded-xl border transition-all ${
          open
            ? 'border-accent/40 bg-accent/5 text-accent'
            : 'border-border bg-s2 text-tx-3 hover:text-tx hover:border-accent/40'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-heading font-semibold text-sm text-tx">Notifications</h3>
            {notifs.length > 0 && (
              <span className="badge bg-danger/10 text-danger text-xs">{notifs.length}</span>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="px-4 py-8 text-center text-tx-3 text-sm">Loading...</div>
            ) : notifs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                  <svg width="18" height="18" className="text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-tx">All caught up!</p>
                <p className="text-xs text-tx-3 mt-0.5">No overdue or upcoming items</p>
              </div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => { router.push(`/leads/${n.leadId}`); setOpen(false) }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-s2 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconColor(n.type)}`}>
                    {icon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-tx truncate">{n.title}</p>
                    <p className="text-xs text-tx-3 truncate mt-0.5">{n.sub}</p>
                  </div>
                  <svg width="12" height="12" className="text-tx-3 shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border">
              <button
                onClick={() => { router.push('/'); setOpen(false) }}
                className="text-xs text-accent hover:text-accent-h font-medium transition-colors"
              >
                View all in War Room →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
