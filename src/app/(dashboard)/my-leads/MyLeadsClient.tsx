'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Lead, Stage, getDealValue, formatCurrency, formatDate,
  STAGE_COLORS, INTENT_COLORS, STAGES
} from '@/types'
import LeadForm from '@/components/leads/LeadForm'

const intentEmoji: Record<string, string> = {
  cold: '🧊', warm: '🔥', hot: '🚀', urgent: '⚡',
}

function FollowupBadge({ date }: { date: string }) {
  const today = new Date().toISOString().split('T')[0]
  if (date < today) return <span className="badge bg-danger/15 text-danger text-xs">⚠️ Overdue</span>
  if (date === today) return <span className="badge bg-warning/15 text-warning text-xs">📅 Today</span>
  return <span className="badge bg-success/10 text-success text-xs">{formatDate(date)}</span>
}

export default function MyLeadsClient({ leads: initialLeads, userName }: {
  leads: Lead[]
  userName: string
}) {
  const [leads, setLeads] = useState(initialLeads)
  useEffect(() => { setLeads(initialLeads) }, [initialLeads])
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState<Lead | undefined>()
  const [stageFilter, setStageFilter] = useState<Stage | ''>('')

  const filtered = stageFilter ? leads.filter(l => l.stage === stageFilter) : leads

  const closedLeads = leads.filter(l => l.stage === 'Closed')
  const activeLeads = leads.filter(l => !['Closed', 'Dead'].includes(l.stage))
  const today = new Date().toISOString().split('T')[0]
  const overdueCount = leads.filter(l => l.next_followup < today && !['Closed', 'Dead'].includes(l.stage)).length

  const closedValue = closedLeads.reduce((sum, l) => sum + getDealValue(l), 0)
  const pipelineValue = activeLeads.reduce((sum, l) => sum + getDealValue(l), 0)
  const commission = closedValue * 0.2
  const potentialCommission = pipelineValue * 0.2
  const closedMRR = closedLeads.filter(l => l.deal_type === 'retainer').reduce((sum, l) => sum + (l.monthly || 0), 0)
  const closingRate = leads.length > 0 ? Math.round((closedLeads.length / leads.length) * 100) : 0

  const handleSaved = (saved: Lead) => {
    setLeads(prev => {
      const exists = prev.find(l => l.id === saved.id)
      if (exists) return prev.map(l => l.id === saved.id ? saved : l)
      return [...prev, saved]
    })
    setShowForm(false)
    setEditLead(undefined)
  }

  // Commission breakdown by month
  const monthlyCommission: Record<string, number> = {}
  closedLeads.forEach(l => {
    const month = l.created_at.slice(0, 7)
    monthlyCommission[month] = (monthlyCommission[month] || 0) + getDealValue(l) * 0.2
  })

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-tx">My Leads</h1>
          <p className="text-tx-3 text-sm mt-0.5">{userName} · {leads.length} total leads</p>
        </div>
        <button onClick={() => { setEditLead(undefined); setShowForm(true) }} className="btn-primary">
          + New Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Active</p>
          <p className="font-heading text-2xl font-bold text-accent mt-1">{activeLeads.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Pipeline</p>
          <p className="font-heading text-xl font-bold text-info mt-1">{formatCurrency(pipelineValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Closed</p>
          <p className="font-heading text-xl font-bold text-success mt-1">{formatCurrency(closedValue)}</p>
          <p className="text-xs text-tx-3 mt-0.5">{closedLeads.length} deals · {closingRate}% rate</p>
        </div>
        {overdueCount > 0 && (
          <div className="card p-4 border-danger/30">
            <p className="text-xs text-danger uppercase tracking-wider">Overdue</p>
            <p className="font-heading text-2xl font-bold text-danger mt-1">{overdueCount}</p>
          </div>
        )}
      </div>

      {/* Commission card */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-accent/5 to-success/5 border-accent/20">
        <h2 className="font-heading font-bold text-tx mb-4">💰 Commission Calculator</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-tx-3 uppercase tracking-wider mb-1">Earned (20% closed)</p>
            <p className="font-heading text-3xl font-bold text-accent">{formatCurrency(commission)}</p>
            {closedMRR > 0 && <p className="text-xs text-success mt-1">+ {formatCurrency(closedMRR * 0.2)}/mo recurring</p>}
          </div>
          <div>
            <p className="text-xs text-tx-3 uppercase tracking-wider mb-1">Potential (if pipeline closes)</p>
            <p className="font-heading text-2xl font-bold text-info">{formatCurrency(potentialCommission)}</p>
            <p className="text-xs text-tx-3 mt-1">Based on {activeLeads.length} active leads</p>
          </div>
          <div>
            <p className="text-xs text-tx-3 uppercase tracking-wider mb-2">By closed deal</p>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {closedLeads.map(l => (
                <div key={l.id} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-tx-2 truncate">{l.name}</span>
                  <span className="text-xs text-accent font-mono shrink-0">{formatCurrency(getDealValue(l) * 0.2)}</span>
                </div>
              ))}
              {closedLeads.length === 0 && <p className="text-xs text-tx-3">No closed deals yet</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setStageFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${!stageFilter ? 'bg-accent/20 border-accent text-accent' : 'border-border text-tx-3 hover:border-s3'}`}
        >
          All ({leads.length})
        </button>
        {STAGES.map(s => {
          const count = leads.filter(l => l.stage === s).length
          if (count === 0) return null
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${stageFilter === s ? 'bg-accent/20 border-accent text-accent' : 'border-border text-tx-3 hover:border-s3'}`}
            >
              {s} ({count})
            </button>
          )
        })}
      </div>

      {/* Leads list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-heading font-semibold text-tx">No leads yet</p>
            <p className="text-tx-3 text-sm mt-1">Add your first lead to get started</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4">+ Add Lead</button>
          </div>
        )}
        {filtered.map(lead => {
          const value = getDealValue(lead)
          const phone = lead.phone?.replace(/\s/g, '')
          const waMsg = encodeURIComponent(`Hi ${lead.name}, following up from GENZ Digital...`)
          const meetingCount = Object.values(lead.meetings || {}).filter(m => m?.date).length
          return (
            <div key={lead.id} className="card-hover p-4 group">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-tx hover:text-accent transition-colors">
                      {lead.name}
                    </Link>
                    <span className={`badge text-xs ${STAGE_COLORS[lead.stage]}`}>{lead.stage}</span>
                    <span className={`badge text-xs ${INTENT_COLORS[lead.intent]}`}>
                      {intentEmoji[lead.intent]} {lead.intent}
                    </span>
                    {meetingCount > 0 && <span className="badge bg-info/10 text-info text-xs">📅 {meetingCount}</span>}
                  </div>
                  {lead.company && <p className="text-xs text-tx-3 mt-0.5">{lead.company}</p>}
                  {lead.services && lead.services.length > 0 && (
                    <p className="text-xs text-tx-3 mt-1">{lead.services.join(', ')}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {value > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-success font-mono">{formatCurrency(value)}</p>
                      {lead.stage === 'Closed' && (
                        <p className="text-xs text-accent font-mono">{formatCurrency(value * 0.2)} 💰</p>
                      )}
                    </div>
                  )}
                  <FollowupBadge date={lead.next_followup} />

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {phone && (
                      <a href={`tel:${phone}`} className="p-1.5 rounded hover:bg-success/10 text-tx-3 hover:text-success text-sm transition-all">📞</a>
                    )}
                    {phone && (
                      <a href={`https://wa.me/${phone.replace('+', '')}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-success/10 text-tx-3 hover:text-success text-sm transition-all">💬</a>
                    )}
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="p-1.5 rounded hover:bg-info/10 text-tx-3 hover:text-info text-sm transition-all">✉️</a>
                    )}
                    <button onClick={() => { setEditLead(lead); setShowForm(true) }} className="p-1.5 rounded hover:bg-accent/10 text-tx-3 hover:text-accent text-sm transition-all">✏️</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <LeadForm
          lead={editLead}
          onSave={handleSaved}
          onCancel={() => { setShowForm(false); setEditLead(undefined) }}
        />
      )}
    </div>
  )
}
