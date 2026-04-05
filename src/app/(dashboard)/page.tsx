import { createClient } from '@/lib/supabase/server'
import { Lead, getDealValue, formatCurrency, formatDate, STAGE_COLORS, INTENT_COLORS } from '@/types'
import Link from 'next/link'

function FollowupBadge({ date }: { date: string }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return <span className="badge bg-danger/15 text-danger">Overdue {Math.abs(diff)}d</span>
  if (diff === 0) return <span className="badge bg-warning/15 text-warning">Today</span>
  return <span className="badge bg-success/10 text-success">+{diff}d</span>
}

function MeetingBadge({ meetings }: { meetings: Lead['meetings'] }) {
  const count = Object.values(meetings || {}).filter(m => m?.date).length
  if (count === 0) return null
  return <span className="badge bg-info/10 text-info">📅 {count}</span>
}

function LeadRow({ lead }: { lead: Lead }) {
  const value = getDealValue(lead)
  return (
    <Link href={`/leads/${lead.id}`} className="flex items-center gap-4 p-3 hover:bg-s2 rounded-lg transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-tx group-hover:text-accent transition-colors">{lead.name}</span>
          <span className={`badge text-xs ${INTENT_COLORS[lead.intent]}`}>{lead.intent}</span>
        </div>
        {lead.company && <p className="text-xs text-tx-3 mt-0.5">{lead.company}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <MeetingBadge meetings={lead.meetings} />
        {value > 0 && <span className="text-xs text-success font-mono">{formatCurrency(value)}</span>}
        <FollowupBadge date={lead.next_followup} />
      </div>
    </Link>
  )
}

function StatCard({ label, value, sub, color = 'accent' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    accent: 'text-accent', danger: 'text-danger', warning: 'text-warning',
    success: 'text-success', info: 'text-info'
  }
  return (
    <div className="card p-5">
      <p className="text-xs text-tx-3 uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-heading text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-tx-3 mt-1">{sub}</p>}
    </div>
  )
}

export default async function WarRoomPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const in48h = new Date(Date.now() + 48 * 3600000).toISOString().split('T')[0]

  const [{ data: allLeads }, { data: activities7d }] = await Promise.all([
    supabase.from('leads').select('*').order('next_followup', { ascending: true }),
    supabase.from('activities').select('id, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ])

  const leads = (allLeads || []) as Lead[]

  const overdue = leads.filter(l => l.next_followup < today && l.stage !== 'Closed' && l.stage !== 'Dead')
  const dueToday = leads.filter(l => l.next_followup === today && l.stage !== 'Closed' && l.stage !== 'Dead')
  const upcoming = leads.filter(l => l.next_followup > today && l.next_followup <= in48h && l.stage !== 'Closed' && l.stage !== 'Dead')
  const closedLeads = leads.filter(l => l.stage === 'Closed')

  // Meetings in next 48h
  const upcomingMeetings = leads.flatMap(l =>
    Object.entries(l.meetings || {})
      .filter(([, m]) => m?.date && m.date >= today && m.date <= in48h)
      .map(([slot, m]) => ({ lead: l, slot, meeting: m! }))
  ).sort((a, b) => (a.meeting.date! + a.meeting.time) > (b.meeting.date! + b.meeting.time) ? 1 : -1)

  // At risk: no activity in 3+ days (we approximate by last_contact)
  const atRisk = leads.filter(l => {
    if (l.stage === 'Closed' || l.stage === 'Dead') return false
    if (!l.last_contact) return true
    const days = Math.floor((Date.now() - new Date(l.last_contact).getTime()) / 86400000)
    return days >= 3
  }).slice(0, 5)

  // KPIs
  const pipelineValue = leads
    .filter(l => l.stage !== 'Dead' && l.stage !== 'Closed')
    .reduce((sum, l) => sum + getDealValue(l), 0)
  const closedValue = closedLeads.reduce((sum, l) => sum + getDealValue(l), 0)
  const closedMRR = closedLeads
    .filter(l => l.deal_type === 'retainer')
    .reduce((sum, l) => sum + (l.monthly || 0), 0)

  const slotLabels: Record<string, string> = {
    meeting1: 'First Meeting', meeting2: 'Second Meeting', meeting3: 'Closing'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-tx">War Room 🎯</h1>
        <p className="text-tx-3 text-sm mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Leads" value={leads.filter(l => l.stage !== 'Dead').length} color="accent" />
        <StatCard label="Pipeline Value" value={formatCurrency(pipelineValue)} color="info" />
        <StatCard label="Closed Value" value={formatCurrency(closedValue)} color="success" />
        <StatCard label="MRR (Closed)" value={formatCurrency(closedMRR)} sub="monthly recurring" color="success" />
        <StatCard label="Overdue" value={overdue.length} color="danger" />
        <StatCard label="Meetings 48h" value={upcomingMeetings.length} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-border bg-danger/5">
                <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                <h2 className="font-heading font-semibold text-sm text-danger">Overdue ({overdue.length})</h2>
              </div>
              <div className="p-2">
                {overdue.map(l => <LeadRow key={l.id} lead={l} />)}
              </div>
            </div>
          )}

          {/* Due Today */}
          {dueToday.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-border bg-warning/5">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <h2 className="font-heading font-semibold text-sm text-warning">Due Today ({dueToday.length})</h2>
              </div>
              <div className="p-2">
                {dueToday.map(l => <LeadRow key={l.id} lead={l} />)}
              </div>
            </div>
          )}

          {/* Upcoming 48h */}
          {upcoming.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-border">
                <div className="w-2 h-2 rounded-full bg-success" />
                <h2 className="font-heading font-semibold text-sm text-success">Upcoming 48h ({upcoming.length})</h2>
              </div>
              <div className="p-2">
                {upcoming.map(l => <LeadRow key={l.id} lead={l} />)}
              </div>
            </div>
          )}

          {overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-heading font-semibold text-tx">All clear!</p>
              <p className="text-tx-3 text-sm mt-1">No overdue or upcoming follow-ups.</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Upcoming meetings */}
          <div className="card">
            <div className="p-4 border-b border-border">
              <h2 className="font-heading font-semibold text-sm text-info">Meetings Next 48h</h2>
            </div>
            <div className="p-3">
              {upcomingMeetings.length === 0 ? (
                <p className="text-tx-3 text-xs text-center py-3">No meetings scheduled</p>
              ) : (
                upcomingMeetings.map(({ lead, slot, meeting }) => (
                  <Link key={`${lead.id}-${slot}`} href={`/leads/${lead.id}`}
                    className="flex items-start gap-3 p-2.5 hover:bg-s2 rounded-lg transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center text-info text-xs shrink-0 mt-0.5">
                      📅
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-tx group-hover:text-accent transition-colors truncate">{lead.name}</p>
                      <p className="text-xs text-tx-3">{slotLabels[slot]}</p>
                      <p className="text-xs text-info mt-0.5">
                        {formatDate(meeting.date)} {meeting.time && `at ${meeting.time}`}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* At risk */}
          {atRisk.length > 0 && (
            <div className="card">
              <div className="p-4 border-b border-border">
                <h2 className="font-heading font-semibold text-sm text-warning">⚠️ At Risk</h2>
                <p className="text-xs text-tx-3 mt-0.5">No activity in 3+ days</p>
              </div>
              <div className="p-3 space-y-1">
                {atRisk.map(l => (
                  <Link key={l.id} href={`/leads/${l.id}`}
                    className="flex items-center gap-3 p-2 hover:bg-s2 rounded-lg transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-tx group-hover:text-accent transition-colors truncate">{l.name}</p>
                      <p className="text-xs text-tx-3">
                        Last: {l.last_contact ? formatDate(l.last_contact) : 'Never'}
                      </p>
                    </div>
                    <span className={`badge text-xs ${STAGE_COLORS[l.stage]}`}>{l.stage}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="card p-4">
            <h2 className="font-heading font-semibold text-sm text-tx mb-3">Activity (7 days)</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center text-accent font-heading font-bold text-lg">
                {activities7d?.length || 0}
              </div>
              <div>
                <p className="text-sm text-tx">Total touchpoints</p>
                <p className="text-xs text-tx-3">calls, messages, notes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
