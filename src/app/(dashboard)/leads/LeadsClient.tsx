'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Lead, Stage, Source, Intent, STAGES, SOURCES, INTENTS,
  getDealValue, formatCurrency, formatDate, STAGE_COLORS, INTENT_COLORS
} from '@/types'
import LeadForm from '@/components/leads/LeadForm'
import ExcelImport from '@/components/leads/ExcelImport'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const intentEmoji: Record<Intent, string> = {
  cold: '🧊', warm: '🔥', hot: '🚀', urgent: '⚡',
}

function FollowupBadge({ date }: { date: string }) {
  const today = new Date().toISOString().split('T')[0]
  if (date < today) return <span className="badge bg-danger/15 text-danger text-xs">Overdue</span>
  if (date === today) return <span className="badge bg-warning/15 text-warning text-xs">Today</span>
  return <span className="badge bg-success/10 text-success text-xs">{formatDate(date)}</span>
}

export default function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  useEffect(() => { setLeads(initialLeads) }, [initialLeads])
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<Stage | ''>('')
  const [filterSource, setFilterSource] = useState<Source | ''>('')
  const [filterIntent, setFilterIntent] = useState<Intent | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editLead, setEditLead] = useState<Lead | undefined>()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const q = search.toLowerCase()
      const matchSearch = !q || l.name.toLowerCase().includes(q) ||
        (l.company || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.email || '').toLowerCase().includes(q)
      const matchStage = !filterStage || l.stage === filterStage
      const matchSource = !filterSource || l.source === filterSource
      const matchIntent = !filterIntent || l.intent === filterIntent
      return matchSearch && matchStage && matchSource && matchIntent
    })
  }, [leads, search, filterStage, filterSource, filterIntent])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      setConfirmDeleteId(null)
      return
    }
    setLeads(prev => prev.filter(l => l.id !== id))
    setConfirmDeleteId(null)
    setDeleting(false)
  }

  const handleSaved = (saved: Lead) => {
    setLeads(prev => {
      const exists = prev.find(l => l.id === saved.id)
      if (exists) return prev.map(l => l.id === saved.id ? saved : l)
      return [saved, ...prev]
    })
    setShowForm(false)
    setEditLead(undefined)
  }

  const totalValue = filtered.filter(l => l.stage !== 'Dead').reduce((sum, l) => sum + getDealValue(l), 0)
  const closedValue = filtered.filter(l => l.stage === 'Closed').reduce((sum, l) => sum + getDealValue(l), 0)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-tx">All Leads</h1>
          <p className="text-tx-3 text-sm mt-0.5">
            {filtered.length} leads · Pipeline: <span className="text-info">{formatCurrency(totalValue)}</span>
            {closedValue > 0 && <> · Closed: <span className="text-success">{formatCurrency(closedValue)}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="btn-ghost text-xs px-3 py-2">
            📥 Import Excel
          </button>
          <button onClick={() => { setEditLead(undefined); setShowForm(true) }} className="btn-primary">
            + New Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="w-56"
        />
        <select value={filterStage} onChange={e => setFilterStage(e.target.value as Stage | '')} className="w-40">
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value as Source | '')} className="w-44">
          <option value="">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterIntent} onChange={e => setFilterIntent(e.target.value as Intent | '')} className="w-36">
          <option value="">All intent</option>
          {INTENTS.map(i => <option key={i} value={i}>{intentEmoji[i]} {i}</option>)}
        </select>
        {(search || filterStage || filterSource || filterIntent) && (
          <button
            onClick={() => { setSearch(''); setFilterStage(''); setFilterSource(''); setFilterIntent('') }}
            className="btn-ghost text-xs px-3"
          >
            Clear filters
          </button>
        )}
      </div>

      {deleteError && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>Delete failed: {deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="text-danger/60 hover:text-danger ml-4">✕</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-s2">
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">Lead</th>
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">Stage</th>
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">Intent</th>
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">Value</th>
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">Source</th>
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">Follow-up</th>
                <th className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider">Owner</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-tx-3 py-12">
                    No leads found
                  </td>
                </tr>
              )}
              {filtered.map(lead => {
                const value = getDealValue(lead)
                const phone = lead.phone?.replace(/\s/g, '')
                const waMsg = encodeURIComponent(`Hi ${lead.name}, following up from GENZ Digital...`)
                return (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-s2/50 transition-colors group">
                    <td className="p-3">
                      <Link href={`/leads/${lead.id}`} className="hover:text-accent transition-colors">
                        <p className="font-medium text-tx">{lead.name}</p>
                        {lead.company && <p className="text-xs text-tx-3">{lead.company}</p>}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className={`badge text-xs ${STAGE_COLORS[lead.stage]}`}>{lead.stage}</span>
                    </td>
                    <td className="p-3">
                      <span className={`badge text-xs ${INTENT_COLORS[lead.intent]}`}>
                        {intentEmoji[lead.intent]} {lead.intent}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono text-success">
                      {value > 0 ? formatCurrency(value) : '—'}
                    </td>
                    <td className="p-3 text-xs text-tx-3">{lead.source || '—'}</td>
                    <td className="p-3">
                      <FollowupBadge date={lead.next_followup} />
                    </td>
                    <td className="p-3 text-xs text-tx-3">{lead.owner_name || '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {phone && (
                          <a href={`tel:${phone}`} title="Call" className="p-1.5 rounded hover:bg-success/10 text-tx-3 hover:text-success transition-all">
                            📞
                          </a>
                        )}
                        {phone && (
                          <a href={`https://wa.me/${phone.replace('+', '')}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-1.5 rounded hover:bg-success/10 text-tx-3 hover:text-success transition-all">
                            💬
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}?subject=Following up - GENZ Digital&body=Hi ${lead.name},%0D%0A%0D%0AJust following up on our conversation...`} title="Email" className="p-1.5 rounded hover:bg-info/10 text-tx-3 hover:text-info transition-all">
                            ✉️
                          </a>
                        )}
                        <button onClick={() => { setEditLead(lead); setShowForm(true) }} title="Edit" className="p-1.5 rounded hover:bg-accent/10 text-tx-3 hover:text-accent transition-all">
                          ✏️
                        </button>
                        {confirmDeleteId === lead.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(lead.id)}
                              disabled={deleting}
                              className="text-xs px-2 py-1 rounded bg-danger text-white hover:bg-danger/80"
                            >
                              {deleting ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2 py-1 rounded border border-border text-tx-3 hover:text-tx"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setConfirmDeleteId(lead.id); setDeleteError(null) }}
                            title="Delete"
                            className="p-1.5 rounded hover:bg-danger/10 text-tx-3 hover:text-danger transition-all"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showImport && (
        <ExcelImport onDone={() => { setShowImport(false); router.refresh() }} />
      )}

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
