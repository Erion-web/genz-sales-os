'use client'

import { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Lead, Activity, STAGES, getDealValue, formatCurrency } from '@/types'
import { subDays, format, startOfWeek, startOfMonth } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

// Blue family palette for all charts
const BLUE  = '#2563EB'
const BLUE2 = '#3B82F6'
const BLUE3 = '#93C5FD'
const TEAL  = '#0284C7'
const SLATE = '#64748B'

const chartDefaults = {
  plugins: {
    legend: { labels: { color: '#667085', font: { family: 'DM Mono', size: 11 } } },
  },
  scales: {
    x: {
      ticks: { color: '#98A2B3', font: { family: 'DM Mono', size: 11 } },
      grid: { color: '#F3F6FA' },
      border: { color: '#E6EAF0' },
    },
    y: {
      ticks: { color: '#98A2B3', font: { family: 'DM Mono', size: 11 } },
      grid: { color: '#F3F6FA' },
      border: { color: '#E6EAF0' },
    },
  },
}

type Range = 'today' | 'week' | 'month' | 'all'

function filterByRange<T extends { created_at: string }>(items: T[], range: Range, now: Date): T[] {
  if (range === 'all') return items
  const start =
    range === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
    range === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) :
    startOfMonth(now)
  return items.filter(i => new Date(i.created_at) >= start)
}

function filterLeadsByRange(leads: Lead[], range: Range, now: Date): Lead[] {
  if (range === 'all') return leads
  const start =
    range === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
    range === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) :
    startOfMonth(now)
  return leads.filter(l => new Date(l.created_at) >= start)
}

export default function StatsClient({
  leads,
  activities,
  profiles,
}: {
  leads: Lead[]
  activities: Activity[]
  profiles: { id: string; full_name: string | null }[]
}) {
  const [range, setRange] = useState<Range>('month')
  const [personFilter, setPersonFilter] = useState<string>('')
  const now = new Date()

  const filteredLeads = useMemo(() => {
    let l = filterLeadsByRange(leads, range, now)
    if (personFilter) l = l.filter(x => x.owner_id === personFilter)
    return l
  }, [leads, range, personFilter])

  const filteredActivities = useMemo(() => {
    let a = filterByRange(activities, range, now)
    if (personFilter) a = a.filter(x => x.owner_id === personFilter)
    return a
  }, [activities, range, personFilter])

  // Contacts per day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(now, 6 - i)
    return format(d, 'yyyy-MM-dd')
  })
  const contactsPerDay = {
    labels: last7Days.map(d => format(new Date(d), 'EEE dd')),
    datasets: [{
      label: 'Touchpoints',
      data: last7Days.map(d =>
        filteredActivities.filter(a => a.created_at.startsWith(d)).length
      ),
      backgroundColor: BLUE,
      borderRadius: 6,
    }],
  }

  // Inbound vs outbound
  const inboundSources = ['Referral', 'Website']
  const outboundSources = ['Cold outreach', 'Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'Other']
  const inbound = filteredLeads.filter(l => inboundSources.includes(l.source || '')).length
  const outbound = filteredLeads.filter(l => outboundSources.includes(l.source || '')).length
  const sourceBreakdown = {
    labels: ['Inbound', 'Outbound', 'Unknown'],
    datasets: [{
      data: [inbound, outbound, filteredLeads.length - inbound - outbound],
      backgroundColor: ['#16A34A', BLUE, SLATE],
      borderWidth: 0,
    }],
  }

  // Pipeline funnel
  const funnelData = {
    labels: STAGES,
    datasets: [{
      label: 'Leads',
      data: STAGES.map(s => filteredLeads.filter(l => l.stage === s).length),
      backgroundColor: [
        BLUE, BLUE2, TEAL, TEAL, BLUE3, BLUE3, SLATE,
      ],
      borderRadius: 4,
    }],
  }

  // Revenue: retainer vs project
  const revenueData = {
    labels: ['Retainer', 'Project'],
    datasets: [{
      label: 'Total Value (€)',
      data: [
        filteredLeads.filter(l => l.deal_type === 'retainer' && l.stage === 'Closed')
          .reduce((sum, l) => sum + getDealValue(l), 0),
        filteredLeads.filter(l => l.deal_type === 'project' && l.stage === 'Closed')
          .reduce((sum, l) => sum + getDealValue(l), 0),
      ],
      backgroundColor: [BLUE, TEAL],
      borderRadius: 6,
    }],
  }

  // Per-person stats
  const personStats = profiles.map(p => {
    const pLeads = leads.filter(l => l.owner_id === p.id)
    const closed = pLeads.filter(l => l.stage === 'Closed')
    const closedValue = closed.reduce((sum, l) => sum + getDealValue(l), 0)
    const pActivities = activities.filter(a => a.owner_id === p.id)
    const closingRate = pLeads.length > 0 ? Math.round((closed.length / pLeads.length) * 100) : 0
    return {
      id: p.id,
      name: p.full_name || 'Unknown',
      totalLeads: pLeads.length,
      closedCount: closed.length,
      closedValue,
      activities: pActivities.length,
      closingRate,
      commission: closedValue * 0.2,
    }
  }).sort((a, b) => b.closedValue - a.closedValue)

  // Source breakdown
  const sourceCounts: Record<string, number> = {}
  filteredLeads.forEach(l => {
    if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1
  })
  const sourceChartData = {
    labels: Object.keys(sourceCounts),
    datasets: [{
      data: Object.values(sourceCounts),
      backgroundColor: [
        BLUE, TEAL, BLUE2, BLUE3, SLATE,
        '#0EA5E9', '#38BDF8', '#7DD3FC',
      ],
      borderWidth: 0,
    }],
  }

  // KPIs
  const totalClosed = filteredLeads.filter(l => l.stage === 'Closed').reduce((sum, l) => sum + getDealValue(l), 0)
  const totalPipeline = filteredLeads.filter(l => !['Closed', 'Dead'].includes(l.stage)).reduce((sum, l) => sum + getDealValue(l), 0)
  const closingRate = filteredLeads.length > 0
    ? Math.round(filteredLeads.filter(l => l.stage === 'Closed').length / filteredLeads.length * 100)
    : 0

  const ranges: Range[] = ['today', 'week', 'month', 'all']

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4 md:mb-6 flex-wrap gap-3">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-tx">Statistics</h1>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap w-full md:w-auto">
          {/* Range filter */}
          <div className="flex bg-surface border border-border rounded-lg overflow-hidden flex-1 md:flex-none">
            {ranges.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex-1 md:flex-none px-2 md:px-3 py-1.5 text-xs capitalize transition-all ${
                  range === r ? 'bg-accent text-white' : 'text-tx-3 hover:text-tx'
                }`}
              >
                {r === 'all' ? 'All' : r === 'week' ? 'Week' : r === 'today' ? 'Today' : 'Month'}
              </button>
            ))}
          </div>

          {/* Person filter */}
          <select
            value={personFilter}
            onChange={e => setPersonFilter(e.target.value)}
            className="w-full md:w-44 py-1.5 text-xs"
          >
            <option value="">All team</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Leads</p>
          <p className="font-heading text-2xl font-bold text-accent mt-1">{filteredLeads.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Pipeline</p>
          <p className="font-heading text-2xl font-bold text-info mt-1">{formatCurrency(totalPipeline)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Closed</p>
          <p className="font-heading text-2xl font-bold text-success mt-1">{formatCurrency(totalClosed)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Closing rate</p>
          <p className="font-heading text-2xl font-bold text-warning mt-1">{closingRate}%</p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Contacts per day */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-sm text-tx mb-4">Touchpoints (last 7 days)</h3>
          <Bar data={contactsPerDay} options={{
            ...chartDefaults,
            plugins: { ...chartDefaults.plugins, legend: { display: false } },
            responsive: true,
            maintainAspectRatio: true,
          }} />
        </div>

        {/* Inbound vs outbound */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-sm text-tx mb-4">Inbound vs Outbound</h3>
          <div className="flex items-center justify-center">
            <div className="w-56 h-56">
              <Doughnut data={sourceBreakdown} options={{
                plugins: {
                  legend: { position: 'bottom', labels: { color: '#a0a0b8', font: { family: 'DM Mono', size: 11 }, padding: 12 } },
                },
                responsive: true,
                maintainAspectRatio: true,
              }} />
            </div>
          </div>
        </div>

        {/* Pipeline funnel */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-sm text-tx mb-4">Pipeline Funnel</h3>
          <Bar data={funnelData} options={{
            ...chartDefaults,
            indexAxis: 'y' as const,
            plugins: { ...chartDefaults.plugins, legend: { display: false } },
            responsive: true,
            maintainAspectRatio: true,
          }} />
        </div>

        {/* Revenue */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-sm text-tx mb-4">Revenue (Closed)</h3>
          <Bar data={revenueData} options={{
            ...chartDefaults,
            plugins: { ...chartDefaults.plugins, legend: { display: false } },
            responsive: true,
            maintainAspectRatio: true,
          }} />
        </div>
      </div>

      {/* Source breakdown */}
      {Object.keys(sourceCounts).length > 0 && (
        <div className="card p-4 md:p-5 mb-4 md:mb-6">
          <h3 className="font-heading font-semibold text-sm text-tx mb-4">Leads by Source</h3>
          <div className="flex items-center justify-center">
            <div className="w-64 h-64">
              <Doughnut data={sourceChartData} options={{
                plugins: {
                  legend: { position: 'right', labels: { color: '#a0a0b8', font: { family: 'DM Mono', size: 11 }, padding: 10 } },
                },
                responsive: true,
                maintainAspectRatio: true,
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-heading font-semibold text-sm text-tx">Team Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-s2">
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">#</th>
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">Name</th>
                <th className="text-right p-3 text-xs text-tx-3 uppercase tracking-wider">Leads</th>
                <th className="text-right p-3 text-xs text-tx-3 uppercase tracking-wider">Closed</th>
                <th className="text-right p-3 text-xs text-tx-3 uppercase tracking-wider">Closing %</th>
                <th className="text-right p-3 text-xs text-tx-3 uppercase tracking-wider">Closed Value</th>
                <th className="text-right p-3 text-xs text-tx-3 uppercase tracking-wider">Commission</th>
                <th className="text-right p-3 text-xs text-tx-3 uppercase tracking-wider">Activity</th>
              </tr>
            </thead>
            <tbody>
              {personStats.map((p, i) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-s2/50 transition-colors">
                  <td className="p-3 text-tx-3 text-xs font-mono">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </td>
                  <td className="p-3 font-medium text-tx">{p.name}</td>
                  <td className="p-3 text-right text-tx-2">{p.totalLeads}</td>
                  <td className="p-3 text-right text-success">{p.closedCount}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-s3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full"
                          style={{ width: `${p.closingRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-tx-2 w-8 text-right">{p.closingRate}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-right text-success font-mono text-xs">{formatCurrency(p.closedValue)}</td>
                  <td className="p-3 text-right text-accent font-mono text-xs">{formatCurrency(p.commission)}</td>
                  <td className="p-3 text-right text-tx-3 text-xs">{p.activities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
