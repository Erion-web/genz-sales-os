'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LogEntry {
  id: string
  user_id: string
  event: string
  label: string
  path: string | null
  created_at: string
}

const EVENT_STYLE: Record<string, { dot: string; badge: string; icon: string }> = {
  lead_create:     { dot: 'bg-success',  badge: 'bg-success/10 text-success',  icon: '＋' },
  lead_edit:       { dot: 'bg-info',     badge: 'bg-info/10 text-info',        icon: '✎' },
  lead_view:       { dot: 'bg-info/60',  badge: 'bg-s3 text-tx-3',             icon: '👁' },
  activity_log:    { dot: 'bg-accent',   badge: 'bg-accent/10 text-accent',    icon: '⚡' },
  stage_change:    { dot: 'bg-warning',  badge: 'bg-warning/10 text-warning',  icon: '→' },
  page_view:       { dot: 'bg-s3',       badge: 'bg-s3 text-tx-3',             icon: '⎋' },
  outreach_submit: { dot: 'bg-success',  badge: 'bg-success/10 text-success',  icon: '📤' },
}

const DEFAULT_STYLE = { dot: 'bg-tx-3', badge: 'bg-s3 text-tx-3', icon: '·' }

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function AdminActivityFeed({
  userMap,
}: {
  userMap: Record<string, string> // userId → full_name
}) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [flashId, setFlashId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Initial fetch
  useEffect(() => {
    supabase
      .from('user_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setLogs(data ?? [])
        setLoading(false)
      })
  }, [])

  // Realtime
  useEffect(() => {
    const sub = supabase
      .channel('admin-activity-feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_activity_log',
      }, (payload) => {
        const entry = payload.new as LogEntry
        setLogs(prev => [entry, ...prev].slice(0, 50))
        setFlashId(entry.id)
        setTimeout(() => setFlashId(id => id === entry.id ? null : id), 1800)
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  const today = new Date().toDateString()

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <h2 className="font-heading font-semibold text-sm text-tx">Live Activity Feed</h2>
        </div>
        <span className="text-xs text-tx-3">last 50 events</span>
      </div>

      {loading && (
        <div className="p-6 text-center text-xs text-tx-3">Loading…</div>
      )}

      {!loading && logs.length === 0 && (
        <div className="p-6 text-center text-xs text-tx-3">No activity recorded yet. Navigation and key actions will appear here.</div>
      )}

      {/* Feed */}
      <div className="divide-y divide-border/40 max-h-[480px] overflow-y-auto">
        {logs.map(entry => {
          const style = EVENT_STYLE[entry.event] ?? DEFAULT_STYLE
          const name = userMap[entry.user_id] ?? 'Unknown'
          const entryDate = new Date(entry.created_at).toDateString()
          const isFlashing = flashId === entry.id

          return (
            <div
              key={entry.id}
              className={`flex items-start gap-3 px-5 py-2.5 transition-colors duration-500 ${isFlashing ? 'bg-accent/10' : 'hover:bg-s2/40'}`}
            >
              {/* Dot */}
              <div className="flex items-center justify-center pt-1 shrink-0">
                <span className={`w-2 h-2 rounded-full ${style.dot} ${isFlashing ? 'animate-ping' : ''}`} />
              </div>

              {/* Time */}
              <div className="w-16 shrink-0 text-right">
                <p className="text-xs font-mono text-tx-2 tabular-nums">{formatTime(entry.created_at)}</p>
                {entryDate !== today && (
                  <p className="text-xs text-tx-3">{formatDate(entry.created_at)}</p>
                )}
              </div>

              {/* Name */}
              <div className="w-24 shrink-0">
                <span className="text-xs font-semibold text-tx truncate block">{name.split(' ')[0]}</span>
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tx-2 truncate">{entry.label}</p>
                {entry.path && entry.event !== 'page_view' && (
                  <p className="text-xs text-tx-3 truncate mt-0.5">{entry.path}</p>
                )}
              </div>

              {/* Event badge */}
              <div className="shrink-0">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${style.badge}`}>
                  <span>{style.icon}</span>
                  <span className="hidden sm:inline">{entry.event.replace('_', ' ')}</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
