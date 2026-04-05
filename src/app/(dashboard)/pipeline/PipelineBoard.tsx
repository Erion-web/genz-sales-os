'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lead, Stage, STAGES, getDealValue, formatCurrency, INTENT_COLORS } from '@/types'
import LeadForm from '@/components/leads/LeadForm'
import { useRouter } from 'next/navigation'

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  'New': 'border-info',
  'Contacted': 'border-accent',
  'Follow-up 1': 'border-warning',
  'Follow-up 2': 'border-warning',
  'Negotiation': 'border-success',
  'Closed': 'border-success',
  'Dead': 'border-border',
}

function LeadCard({ lead, onStageChange }: { lead: Lead; onStageChange: (id: string, stage: Stage) => void }) {
  const today = new Date().toISOString().split('T')[0]
  const value = getDealValue(lead)
  const isOverdue = lead.next_followup < today
  const isToday = lead.next_followup === today
  const meetingCount = Object.values(lead.meetings || {}).filter(m => m?.date).length
  const supabase = createClient()

  const moveStage = async (direction: 'prev' | 'next') => {
    const idx = STAGES.indexOf(lead.stage)
    const newIdx = direction === 'next' ? idx + 1 : idx - 1
    if (newIdx < 0 || newIdx >= STAGES.length) return
    const newStage = STAGES[newIdx]
    await supabase.from('leads').update({ stage: newStage }).eq('id', lead.id)
    onStageChange(lead.id, newStage)
  }

  return (
    <div className="card p-3 space-y-2 group hover:border-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-tx hover:text-accent transition-colors block truncate">
            {lead.name}
          </Link>
          {lead.company && <p className="text-xs text-tx-3 truncate">{lead.company}</p>}
        </div>
        <span className={`badge text-xs shrink-0 ${INTENT_COLORS[lead.intent]}`}>{lead.intent}</span>
      </div>

      {/* Services */}
      {lead.services && lead.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.services.slice(0, 3).map(s => (
            <span key={s} className="text-xs bg-s3 text-tx-3 px-1.5 py-0.5 rounded">{s}</span>
          ))}
          {lead.services.length > 3 && (
            <span className="text-xs text-tx-3">+{lead.services.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        {value > 0 ? (
          <span className="text-xs text-success font-mono">{formatCurrency(value)}</span>
        ) : <span />}
        <div className="flex items-center gap-1.5">
          {meetingCount > 0 && <span className="badge bg-info/10 text-info text-xs">📅 {meetingCount}</span>}
          <span className={`badge text-xs ${
            isOverdue ? 'bg-danger/15 text-danger' :
            isToday ? 'bg-warning/15 text-warning' :
            'bg-success/10 text-success'
          }`}>
            {isOverdue ? `⚠️ ${lead.next_followup}` : lead.next_followup}
          </span>
        </div>
      </div>

      {/* Move arrows */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {STAGES.indexOf(lead.stage) > 0 && (
          <button
            onClick={() => moveStage('prev')}
            className="flex-1 py-1 text-xs rounded bg-s3 text-tx-3 hover:bg-s2 hover:text-tx transition-all"
          >
            ← {STAGES[STAGES.indexOf(lead.stage) - 1]}
          </button>
        )}
        {STAGES.indexOf(lead.stage) < STAGES.length - 1 && (
          <button
            onClick={() => moveStage('next')}
            className="flex-1 py-1 text-xs rounded bg-accent/10 text-accent hover:bg-accent/20 transition-all"
          >
            {STAGES[STAGES.indexOf(lead.stage) + 1]} →
          </button>
        )}
      </div>
    </div>
  )
}

export default function PipelineBoard({
  grouped: initialGrouped,
}: {
  grouped: Record<Stage, Lead[]>
}) {
  const [grouped, setGrouped] = useState(initialGrouped)
  useEffect(() => { setGrouped(initialGrouped) }, [initialGrouped])
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  const handleStageChange = (leadId: string, newStage: Stage) => {
    setGrouped(prev => {
      const updated = { ...prev }
      let movedLead: Lead | undefined
      STAGES.forEach(stage => {
        updated[stage] = updated[stage].filter(l => {
          if (l.id === leadId) { movedLead = l; return false }
          return true
        })
      })
      if (movedLead) {
        updated[newStage] = [...updated[newStage], { ...movedLead, stage: newStage }]
      }
      return updated
    })
  }

  const totalPipeline = STAGES
    .filter(s => s !== 'Dead' && s !== 'Closed')
    .reduce((sum, s) => sum + grouped[s].reduce((a, l) => a + getDealValue(l), 0), 0)

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-heading text-xl font-bold text-tx">Pipeline</h1>
          <p className="text-xs text-tx-3 mt-0.5">
            Pipeline value: <span className="text-success">{formatCurrency(totalPipeline)}</span>
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + New Lead
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {STAGES.map(stage => {
            const stageLeads = grouped[stage]
            const stageValue = stageLeads.reduce((sum, l) => sum + getDealValue(l), 0)
            return (
              <div key={stage} className="w-64 flex flex-col">
                {/* Column header */}
                <div className={`card mb-3 p-3 border-t-2 ${STAGE_HEADER_COLORS[stage]}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-semibold text-sm text-tx">{stage}</h3>
                    <span className="badge bg-s3 text-tx-3 text-xs">{stageLeads.length}</span>
                  </div>
                  {stageValue > 0 && (
                    <p className="text-xs text-tx-3 mt-1">{formatCurrency(stageValue)}</p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {stageLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onStageChange={handleStageChange} />
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                      <p className="text-tx-3 text-xs">Empty</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showForm && (
        <LeadForm
          onSave={() => { setShowForm(false); router.refresh() }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
