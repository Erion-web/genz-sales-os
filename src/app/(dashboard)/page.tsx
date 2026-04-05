import { createClient } from '@/lib/supabase/server'
import { Lead, getDealValue, formatCurrency, formatDate, STAGE_COLORS, INTENT_COLORS } from '@/types'
import Link from 'next/link'

/* ── KPI Card ─────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, color, trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: 'accent' | 'success' | 'danger' | 'info' | 'warning'
  trend?: { value: string; up: boolean }
}) {
  const palette = {
    accent:  { ring: 'bg-accent/15',  text: 'text-accent',  trend: 'text-accent' },
    success: { ring: 'bg-success/15', text: 'text-success', trend: 'text-success' },
    danger:  { ring: 'bg-danger/15',  text: 'text-danger',  trend: 'text-danger' },
    info:    { ring: 'bg-info/15',    text: 'text-info',    trend: 'text-info' },
    warning: { ring: 'bg-warning/15', text: 'text-warning', trend: 'text-warning' },
  }[color]

  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-glow transition-shadow">
      <div className={`w-12 h-12 rounded-2xl ${palette.ring} flex items-center justify-center shrink-0`}>
        <span className={palette.text}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-tx-3 font-medium uppercase tracking-wider">{label}</p>
        <p className={`font-heading text-2xl font-bold mt-1 ${palette.text}`}>{value}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trend.up ? 'text-success' : 'text-danger'}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {trend.up
                  ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                  : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}
              </svg>
              {trend.value}
            </span>
          )}
          {sub && <p className="text-xs text-tx-3">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

/* ── Follow-up status badge ───────────────────────────────── */
function FollowupChip({ date }: { date: string }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return <span className="badge bg-danger/15 text-danger text-xs">⚠ {Math.abs(diff)}d late</span>
  if (diff === 0) return <span className="badge bg-warning/15 text-warning text-xs">Due today</span>
  return <span className="badge bg-success/10 text-success text-xs">+{diff}d</span>
}

/* ── Lead row ─────────────────────────────────────────────── */
function LeadRow({ lead }: { lead: Lead }) {
  const value = getDealValue(lead)
  const meetingCount = Object.values(lead.meetings || {}).filter(m => m?.date).length
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-s2/60 transition-colors rounded-lg group"
    >
      <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent text-xs font-bold shrink-0">
        {lead.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-tx group-hover:text-accent transition-colors truncate">{lead.name}</p>
        {lead.company && <p className="text-xs text-tx-3 truncate">{lead.company}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {meetingCount > 0 && <span className="badge bg-info/10 text-info text-xs">📅 {meetingCount}</span>}
        <span className={`badge text-xs ${INTENT_COLORS[lead.intent]}`}>{lead.intent}</span>
        {value > 0 && <span className="text-xs text-success font-mono hidden sm:block">{formatCurrency(value)}</span>}
        <FollowupChip date={lead.next_followup} />
      </div>
    </Link>
  )
}

/* ── Section card wrapper ─────────────────────────────────── */
function Section({ title, count, color, children, emptyMsg }: {
  title: string; count: number; color: string; children: React.ReactNode; emptyMsg?: string
}) {
  return (
    <div className="card overflow-hidden">
      <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b border-border ${color}`}>
        <span className="w-2 h-2 rounded-full bg-current opacity-80 animate-pulse" />
        <h2 className="font-heading font-semibold text-sm">{title}</h2>
        <span className="ml-auto badge bg-current/10 text-current text-xs">{count}</span>
      </div>
      <div className="p-2">
        {count === 0
          ? <p className="text-tx-3 text-xs text-center py-5">{emptyMsg ?? 'None'}</p>
          : children}
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────── */
export default async function WarRoomPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]
  const in48h = new Date(Date.now() + 48 * 3600000).toISOString().split('T')[0]

  const [{ data: allLeads }, { data: activities7d }, { data: profile }] = await Promise.all([
    supabase.from('leads').select('*').order('next_followup', { ascending: true }),
    supabase.from('activities').select('id, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
  ])

  const leads = (allLeads || []) as Lead[]
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const active = leads.filter(l => !['Closed', 'Dead'].includes(l.stage))
  const overdue = active.filter(l => l.next_followup < today)
  const dueToday = active.filter(l => l.next_followup === today)
  const upcoming48 = active.filter(l => l.next_followup > today && l.next_followup <= in48h)
  const closed = leads.filter(l => l.stage === 'Closed')

  const pipelineValue = active.reduce((s, l) => s + getDealValue(l), 0)
  const closedValue = closed.reduce((s, l) => s + getDealValue(l), 0)
  const closedMRR = closed.filter(l => l.deal_type === 'retainer').reduce((s, l) => s + (l.monthly || 0), 0)

  // Meetings in next 48h
  const upcomingMeetings = leads.flatMap(l =>
    Object.entries(l.meetings || {})
      .filter(([, m]) => m?.date && m.date >= today && m.date <= in48h)
      .map(([slot, m]) => ({ lead: l, slot, meeting: m! }))
  ).sort((a, b) => (a.meeting.date! > b.meeting.date! ? 1 : -1))

  // At risk: no contact in 3+ days
  const atRisk = active.filter(l => {
    if (!l.last_contact) return true
    return Math.floor((Date.now() - new Date(l.last_contact).getTime()) / 86400000) >= 3
  }).slice(0, 4)

  const slotLabel: Record<string, string> = {
    meeting1: 'First', meeting2: 'Second', meeting3: 'Closing',
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-tx">
            Welcome back, {firstName}! 👋
          </h2>
          <p className="text-tx-3 text-sm mt-0.5">
            {overdue.length > 0
              ? `You have ${overdue.length} overdue follow-up${overdue.length > 1 ? 's' : ''} — let's clear them.`
              : dueToday.length > 0
              ? `${dueToday.length} lead${dueToday.length > 1 ? 's' : ''} to follow up today.`
              : "You're all caught up. Keep the momentum going."}
          </p>
        </div>
        <Link href="/leads" className="btn-primary text-sm hidden sm:flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Lead
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total Leads"
          value={leads.filter(l => l.stage !== 'Dead').length}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          color="accent"
          sub={`${active.length} active`}
        />
        <KpiCard
          label="Pipeline"
          value={formatCurrency(pipelineValue)}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          color="info"
          sub="open deals"
        />
        <KpiCard
          label="Closed Value"
          value={formatCurrency(closedValue)}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          color="success"
          trend={closed.length > 0 ? { value: `${closed.length} deals`, up: true } : undefined}
        />
        <KpiCard
          label="Closed MRR"
          value={formatCurrency(closedMRR)}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          color="success"
          sub="per month"
        />
        <KpiCard
          label="Overdue"
          value={overdue.length}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          color="danger"
          sub="needs action"
        />
        <KpiCard
          label="Meetings 48h"
          value={upcomingMeetings.length}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          color="warning"
          sub="scheduled"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: follow-up sections */}
        <div className="lg:col-span-2 space-y-4">
          {overdue.length === 0 && dueToday.length === 0 && upcoming48.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-heading font-bold text-tx text-lg">You're all clear!</p>
              <p className="text-tx-3 text-sm mt-1">No overdue or upcoming follow-ups in the next 48 hours.</p>
            </div>
          ) : (
            <>
              {overdue.length > 0 && (
                <Section title="Overdue" count={overdue.length} color="text-danger">
                  {overdue.map(l => <LeadRow key={l.id} lead={l} />)}
                </Section>
              )}
              {dueToday.length > 0 && (
                <Section title="Due Today" count={dueToday.length} color="text-warning">
                  {dueToday.map(l => <LeadRow key={l.id} lead={l} />)}
                </Section>
              )}
              {upcoming48.length > 0 && (
                <Section title="Upcoming 48h" count={upcoming48.length} color="text-success">
                  {upcoming48.map(l => <LeadRow key={l.id} lead={l} />)}
                </Section>
              )}
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Meetings */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="font-heading font-semibold text-sm text-info">Meetings · 48h</h2>
              <span className="badge bg-info/10 text-info text-xs">{upcomingMeetings.length}</span>
            </div>
            <div className="p-2">
              {upcomingMeetings.length === 0 ? (
                <p className="text-tx-3 text-xs text-center py-5">No meetings scheduled</p>
              ) : upcomingMeetings.map(({ lead, slot, meeting }) => (
                <Link key={`${lead.id}-${slot}`} href={`/leads/${lead.id}`}
                  className="flex items-start gap-3 p-3 hover:bg-s2/60 rounded-lg transition-colors group">
                  <div className="w-8 h-8 rounded-xl bg-info/15 flex items-center justify-center text-info text-xs shrink-0">
                    📅
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-tx group-hover:text-accent transition-colors truncate">{lead.name}</p>
                    <p className="text-xs text-tx-3">{slotLabel[slot]} Meeting</p>
                    <p className="text-xs text-info mt-0.5">{formatDate(meeting.date)}{meeting.time && ` · ${meeting.time}`}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* At risk */}
          {atRisk.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <h2 className="font-heading font-semibold text-sm text-warning">⚠️ At Risk</h2>
                <span className="text-xs text-tx-3">No contact 3+ days</span>
              </div>
              <div className="p-2">
                {atRisk.map(l => (
                  <Link key={l.id} href={`/leads/${l.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-s2/60 rounded-lg transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-warning text-xs font-bold shrink-0">
                      {l.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-tx group-hover:text-accent transition-colors truncate">{l.name}</p>
                      <p className="text-xs text-tx-3">
                        Last contact: {l.last_contact ? formatDate(l.last_contact) : 'Never'}
                      </p>
                    </div>
                    <span className={`badge text-xs ${STAGE_COLORS[l.stage]}`}>{l.stage}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Activity pulse */}
          <div className="card p-5">
            <h2 className="font-heading font-semibold text-sm text-tx mb-4">Activity · 7 days</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                <span className="font-heading font-bold text-2xl text-accent">{activities7d?.length ?? 0}</span>
              </div>
              <div>
                <p className="text-sm text-tx font-medium">Total touchpoints</p>
                <p className="text-xs text-tx-3 mt-0.5">Calls, messages & notes</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
