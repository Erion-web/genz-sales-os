'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GoalTarget } from '@/types'

interface Counts {
  todayLeads: number
  todayOutreach: number
  todayMeetings: number
  weekLeads: number
  weekOutreach: number
  weekMeetings: number
  weekClosed: number
  yesterdayLeads: number
  yesterdayOutreach: number
}

interface Props {
  userId: string
  targets: GoalTarget
  initialCounts: Counts
  wStart: string
  today: string
  yesterday: string
  isAdmin: boolean
  leaderboard: { name: string; companies: number }[]
}

function GoalBar({ label, actual, target }: { label: string; actual: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0
  const barColor = pct >= 100 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger'
  const textColor = pct >= 100 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-tx-2 font-medium">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${textColor}`}>
          {actual}<span className="text-tx-3 font-normal">/{target}</span>
        </span>
      </div>
      <div className="h-1.5 bg-s3 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function YesterdayCheck({ hit, label }: { hit: boolean; label: string }) {
  return (
    <span className={`text-xs font-medium flex items-center gap-1 ${hit ? 'text-success' : 'text-danger'}`}>
      {hit ? '✓' : '✗'} {label}
    </span>
  )
}

export default function DailyBriefClient({
  userId, targets, initialCounts, wStart, today, yesterday, isAdmin, leaderboard,
}: Props) {
  const [counts, setCounts] = useState<Counts>(initialCounts)
  const supabase = createClient()

  const fetchCounts = useCallback(async () => {
    const [
      { data: tLeads },
      { data: tActivities },
      { data: tCalEvents },
      { data: wLeads },
      { data: wActivities },
      { data: wCalEvents },
      { data: closedLeads },
      { data: yLeads },
      { data: yActivities },
    ] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('owner_id', userId).gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('activities').select('id', { count: 'exact', head: true })
        .eq('owner_id', userId).in('type', ['Called', 'Messaged'])
        .gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('calendar_events').select('id', { count: 'exact', head: true })
        .eq('created_by', userId).eq('date', today),
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('owner_id', userId).gte('created_at', `${wStart}T00:00:00`),
      supabase.from('activities').select('id', { count: 'exact', head: true })
        .eq('owner_id', userId).in('type', ['Called', 'Messaged'])
        .gte('created_at', `${wStart}T00:00:00`),
      supabase.from('calendar_events').select('id', { count: 'exact', head: true })
        .eq('created_by', userId).gte('date', wStart),
      supabase.from('leads').select('id, closed_at', { count: 'exact', head: true })
        .eq('owner_id', userId).eq('stage', 'Closed').gte('closed_at', `${wStart}T00:00:00`),
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('owner_id', userId).gte('created_at', `${yesterday}T00:00:00`).lte('created_at', `${yesterday}T23:59:59`),
      supabase.from('activities').select('id', { count: 'exact', head: true })
        .eq('owner_id', userId).in('type', ['Called', 'Messaged'])
        .gte('created_at', `${yesterday}T00:00:00`).lte('created_at', `${yesterday}T23:59:59`),
    ])

    setCounts({
      todayLeads:      tLeads?.length    ?? 0,
      todayOutreach:   tActivities?.length ?? 0,
      todayMeetings:   tCalEvents?.length  ?? 0,
      weekLeads:       wLeads?.length     ?? 0,
      weekOutreach:    wActivities?.length ?? 0,
      weekMeetings:    wCalEvents?.length  ?? 0,
      weekClosed:      closedLeads?.length ?? 0,
      yesterdayLeads:  yLeads?.length    ?? 0,
      yesterdayOutreach: yActivities?.length ?? 0,
    })
  }, [userId, today, wStart, yesterday])

  useEffect(() => {
    // Realtime: activities INSERT
    const actSub = supabase
      .channel('brief-activities')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'activities',
        filter: `owner_id=eq.${userId}`,
      }, (payload) => {
        const type = payload.new?.type
        if (!['Called', 'Messaged'].includes(type)) return
        const createdAt: string = payload.new?.created_at ?? ''
        const isToday = createdAt.startsWith(today)
        const isThisWeek = createdAt >= `${wStart}T00:00:00`
        setCounts(prev => ({
          ...prev,
          todayOutreach:  prev.todayOutreach  + (isToday    ? 1 : 0),
          weekOutreach:   prev.weekOutreach   + (isThisWeek ? 1 : 0),
        }))
      })
      .subscribe()

    // Realtime: leads INSERT
    const leadSub = supabase
      .channel('brief-leads')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'leads',
        filter: `owner_id=eq.${userId}`,
      }, (payload) => {
        const createdAt: string = payload.new?.created_at ?? ''
        const isToday = createdAt.startsWith(today)
        const isThisWeek = createdAt >= `${wStart}T00:00:00`
        setCounts(prev => ({
          ...prev,
          todayLeads: prev.todayLeads + (isToday    ? 1 : 0),
          weekLeads:  prev.weekLeads  + (isThisWeek ? 1 : 0),
        }))
      })
      .subscribe()

    // Realtime: leads UPDATE (stage → Closed)
    const closedSub = supabase
      .channel('brief-closed')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'leads',
        filter: `owner_id=eq.${userId}`,
      }, (payload) => {
        if (payload.new?.stage === 'Closed' && payload.old?.stage !== 'Closed') {
          const closedAt: string = payload.new?.closed_at ?? ''
          if (closedAt >= `${wStart}T00:00:00`) {
            setCounts(prev => ({ ...prev, weekClosed: prev.weekClosed + 1 }))
          }
        }
      })
      .subscribe()

    // Realtime: calendar_events INSERT
    const calSub = supabase
      .channel('brief-cal')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'calendar_events',
        filter: `created_by=eq.${userId}`,
      }, (payload) => {
        const date: string = payload.new?.date ?? ''
        if (date === today) setCounts(prev => ({ ...prev, todayMeetings: prev.todayMeetings + 1 }))
        if (date >= wStart)  setCounts(prev => ({ ...prev, weekMeetings:  prev.weekMeetings  + 1 }))
      })
      .subscribe()

    // Poll every 60s for accuracy (catches edge cases)
    const interval = setInterval(fetchCounts, 60_000)

    return () => {
      supabase.removeChannel(actSub)
      supabase.removeChannel(leadSub)
      supabase.removeChannel(closedSub)
      supabase.removeChannel(calSub)
      clearInterval(interval)
    }
  }, [userId, today, wStart, fetchCounts])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Today's targets */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm text-tx">Today's Targets</h2>
          <span className="text-xs text-tx-3">{new Date().toLocaleDateString('en-GB', { weekday: 'long' })}</span>
        </div>
        <GoalBar label="Companies" actual={counts.todayLeads} target={targets.daily_companies} />
        <GoalBar label="Outreach (calls + messages)" actual={counts.todayOutreach} target={targets.daily_outreach} />
        <GoalBar label="Meetings" actual={counts.todayMeetings} target={targets.daily_meetings} />

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-tx-3 font-medium mb-2">Yesterday recap</p>
          <div className="flex items-center gap-4">
            <YesterdayCheck hit={counts.yesterdayLeads >= targets.daily_companies} label="Companies" />
            <YesterdayCheck hit={counts.yesterdayOutreach >= targets.daily_outreach} label="Outreach" />
          </div>
        </div>
      </div>

      {/* Weekly goals */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm text-tx">Weekly Goals</h2>
          <Link href="/outreach" className="text-xs text-accent hover:underline">Log outreach →</Link>
        </div>
        <GoalBar label="Companies" actual={counts.weekLeads} target={targets.weekly_companies} />
        <GoalBar label="Outreach" actual={counts.weekOutreach} target={targets.weekly_outreach} />
        <GoalBar label="Meetings" actual={counts.weekMeetings} target={targets.weekly_meetings} />
        <GoalBar label="Closed" actual={counts.weekClosed} target={targets.weekly_closed} />

        {isAdmin && leaderboard.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-tx-3 font-medium mb-2">Companies this week</p>
            <div className="space-y-1">
              {leaderboard.map((row, i) => (
                <div key={row.name} className="flex items-center gap-2">
                  <span className="text-xs text-tx-3 w-4">{i + 1}</span>
                  <span className="text-xs text-tx flex-1 truncate">{row.name}</span>
                  <span className="text-xs font-bold text-accent tabular-nums">{row.companies}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
