'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RepStat {
  userId: string
  name: string
  companies: number
  calls: number
  messages: number
  lastActiveAt: string | null
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date().toDateString()
  if (d.toDateString() === today) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function isRecentlyActive(iso: string | null): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 30 * 60 * 1000 // 30 min
}

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-accent tabular-nums">{time}</span>
}

export default function AdminTeamToday({
  initialStats,
  today,
}: {
  initialStats: RepStat[]
  today: string
}) {
  const [stats, setStats] = useState<RepStat[]>(initialStats)
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    const { data: acts } = await supabase
      .from('activities')
      .select('id, owner_id, type, created_at')
      .in('type', ['Called', 'Messaged'])
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false })

    const { data: todayLeads } = await supabase
      .from('leads')
      .select('id, owner_id, created_at')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)

    setStats(prev => prev.map(rep => {
      const repActs   = (acts || []).filter(a => a.owner_id === rep.userId)
      const repLeads  = (todayLeads || []).filter(l => l.owner_id === rep.userId)
      const lastAct   = repActs[0]?.created_at ?? null
      return {
        ...rep,
        companies:    repLeads.length,
        calls:        repActs.filter(a => a.type === 'Called').length,
        messages:     repActs.filter(a => a.type === 'Messaged').length,
        lastActiveAt: lastAct,
      }
    }))
  }, [today])

  // Flash row on update
  const [flashId, setFlashId] = useState<string | null>(null)

  useEffect(() => {
    // Realtime: activities INSERT (admin sees all reps)
    const actSub = supabase
      .channel('team-today-acts')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'activities',
      }, (payload) => {
        const type: string = payload.new?.type
        if (!['Called', 'Messaged'].includes(type)) return
        const ownerId: string = payload.new?.owner_id
        const createdAt: string = payload.new?.created_at ?? new Date().toISOString()
        if (!createdAt.startsWith(today)) return

        setStats(prev => prev.map(rep => {
          if (rep.userId !== ownerId) return rep
          return {
            ...rep,
            calls:        rep.calls    + (type === 'Called'   ? 1 : 0),
            messages:     rep.messages + (type === 'Messaged' ? 1 : 0),
            lastActiveAt: createdAt,
          }
        }))
        setFlashId(ownerId)
        setTimeout(() => setFlashId(id => id === ownerId ? null : id), 1500)
      })
      .subscribe()

    // Realtime: leads INSERT
    const leadSub = supabase
      .channel('team-today-leads')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'leads',
      }, (payload) => {
        const ownerId: string = payload.new?.owner_id
        const createdAt: string = payload.new?.created_at ?? ''
        if (!createdAt.startsWith(today)) return

        setStats(prev => prev.map(rep => {
          if (rep.userId !== ownerId) return rep
          return { ...rep, companies: rep.companies + 1 }
        }))
        setFlashId(ownerId)
        setTimeout(() => setFlashId(id => id === ownerId ? null : id), 1500)
      })
      .subscribe()

    // Poll every 60s for accuracy
    const interval = setInterval(fetchStats, 60_000)

    return () => {
      supabase.removeChannel(actSub)
      supabase.removeChannel(leadSub)
      clearInterval(interval)
    }
  }, [today, fetchStats])

  const sortedStats = [...stats].sort((a, b) => (b.calls + b.messages) - (a.calls + a.messages))

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <h2 className="font-heading font-semibold text-sm text-tx">Team Today</h2>
          <span className="badge bg-accent/10 text-accent text-xs">{today}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-tx-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <LiveClock />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-2.5 text-xs text-tx-3 font-medium uppercase tracking-wider">Rep</th>
              <th className="text-center px-4 py-2.5 text-xs text-tx-3 font-medium uppercase tracking-wider">Companies</th>
              <th className="text-center px-4 py-2.5 text-xs text-tx-3 font-medium uppercase tracking-wider">Calls</th>
              <th className="text-center px-4 py-2.5 text-xs text-tx-3 font-medium uppercase tracking-wider">Messages</th>
              <th className="text-center px-4 py-2.5 text-xs text-tx-3 font-medium uppercase tracking-wider">Total</th>
              <th className="text-right px-5 py-2.5 text-xs text-tx-3 font-medium uppercase tracking-wider">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map(rep => {
              const total   = rep.calls + rep.messages
              const active  = isRecentlyActive(rep.lastActiveAt)
              const flashing = flashId === rep.userId
              return (
                <tr
                  key={rep.userId}
                  className={`border-b border-border/50 transition-colors duration-300 ${
                    flashing ? 'bg-accent/10' : 'hover:bg-s2/60'
                  }`}
                >
                  {/* Name + pulse */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                          {rep.name.charAt(0).toUpperCase()}
                        </div>
                        {active && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface" />
                        )}
                      </div>
                      <span className="font-medium text-tx text-sm">{rep.name}</span>
                    </div>
                  </td>

                  {/* Companies */}
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold tabular-nums ${rep.companies > 0 ? 'text-info' : 'text-tx-3'}`}>
                      {rep.companies}
                    </span>
                  </td>

                  {/* Calls */}
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold tabular-nums ${rep.calls > 0 ? 'text-success' : 'text-tx-3'}`}>
                      {rep.calls}
                    </span>
                  </td>

                  {/* Messages */}
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold tabular-nums ${rep.messages > 0 ? 'text-warning' : 'text-tx-3'}`}>
                      {rep.messages}
                    </span>
                  </td>

                  {/* Total outreach */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      total > 0 ? 'bg-accent/15 text-accent' : 'bg-s3 text-tx-3'
                    }`}>
                      {total}
                    </span>
                  </td>

                  {/* Last active */}
                  <td className="px-5 py-3 text-right">
                    {rep.lastActiveAt ? (
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-mono font-medium tabular-nums ${active ? 'text-success' : 'text-tx-2'}`}>
                          {formatTime(rep.lastActiveAt)}
                        </span>
                        <span className="text-xs text-tx-3">
                          {new Date(rep.lastActiveAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-tx-3">No activity</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2.5 border-t border-border/50 flex items-center justify-between">
        <p className="text-xs text-tx-3">
          <span className="inline-block w-2 h-2 rounded-full bg-success mr-1.5" />active within 30 min
        </p>
        <p className="text-xs text-tx-3">Live · updates instantly</p>
      </div>
    </div>
  )
}
