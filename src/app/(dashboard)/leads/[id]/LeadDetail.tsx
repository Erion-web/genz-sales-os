'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Lead, Activity, Stage, getDealValue, formatCurrency, formatDate,
  STAGE_COLORS, INTENT_COLORS, STAGES
} from '@/types'
import LeadForm from '@/components/leads/LeadForm'
import ActivityLog from '@/components/leads/ActivityLog'

const intentEmoji: Record<string, string> = {
  cold: '🧊', warm: '🔥', hot: '🚀', urgent: '⚡',
}

const meetingLabels: Record<string, string> = {
  meeting1: 'First Meeting', meeting2: 'Second Meeting', meeting3: 'Closing Meeting',
}

export default function LeadDetail({ lead: initialLead, activities: initialActivities }: {
  lead: Lead
  activities: Activity[]
}) {
  const [lead, setLead] = useState(initialLead)
  const [activities, setActivities] = useState(initialActivities)
  const [showEdit, setShowEdit] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const value = getDealValue(lead)
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = lead.next_followup < today
  const isToday = lead.next_followup === today

  const phone = lead.phone?.replace(/\s/g, '')
  const waMsg = encodeURIComponent(`Hi ${lead.name}, following up from GENZ Digital Marketing. `)

  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.from('leads').delete().eq('id', lead.id)
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      setConfirmDelete(false)
      return
    }
    router.push('/leads')
  }

  const handleStageChange = async (stage: Stage) => {
    await supabase.from('leads').update({ stage }).eq('id', lead.id)
    setLead(prev => ({ ...prev, stage }))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-tx-3 mb-6">
        <Link href="/leads" className="hover:text-tx transition-colors">All Leads</Link>
        <span>/</span>
        <span className="text-tx">{lead.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header card */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl font-bold text-tx">{lead.name}</h1>
                {lead.company && <p className="text-tx-2 mt-1">{lead.company}</p>}
                <div className="flex items-center flex-wrap gap-2 mt-3">
                  <span className={`badge ${STAGE_COLORS[lead.stage]}`}>{lead.stage}</span>
                  <span className={`badge ${INTENT_COLORS[lead.intent]}`}>
                    {intentEmoji[lead.intent]} {lead.intent}
                  </span>
                  {lead.source && <span className="badge bg-s3 text-tx-3">{lead.source}</span>}
                  <span className={`badge ${
                    isOverdue ? 'bg-danger/15 text-danger' :
                    isToday ? 'bg-warning/15 text-warning' :
                    'bg-success/10 text-success'
                  }`}>
                    {isOverdue ? '⚠️ Overdue' : isToday ? '📅 Today' : '✅'} {formatDate(lead.next_followup)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setShowEdit(true)} className="btn-ghost text-xs px-3">Edit</button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-danger">Sure?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-danger text-white hover:bg-danger/80 transition-colors"
                    >
                      {deleting ? '...' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-tx-3 hover:text-tx transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="btn-ghost text-xs px-3 hover:text-danger hover:border-danger/30"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {deleteError && (
              <div className="mt-3 p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
                {deleteError}
              </div>
            )}

            {/* Quick actions */}
            {(phone || lead.email) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                {phone && (
                  <a href={`tel:${phone}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 text-success text-xs hover:bg-success/20 transition-colors border border-success/20">
                    📞 Call
                  </a>
                )}
                {phone && (
                  <a href={`https://wa.me/${phone.replace('+', '')}?text=${waMsg}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 text-success text-xs hover:bg-success/20 transition-colors border border-success/20">
                    💬 WhatsApp
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}?subject=Following up - GENZ Digital&body=Hi ${lead.name},%0D%0A%0D%0AJust following up on our conversation. I wanted to check in and see if you had any questions...%0D%0A%0D%0ABest regards`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-info/10 text-info text-xs hover:bg-info/20 transition-colors border border-info/20">
                    ✉️ Email
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Stage progression */}
          <div className="card p-4">
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-3">Stage</h3>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    lead.stage === s
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'border-border text-tx-3 hover:border-s3 hover:text-tx'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Deal info */}
          <div className="card p-5">
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-4">Deal</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-tx-3">Type</p>
                <p className="text-sm text-tx mt-1 capitalize">{lead.deal_type || '—'}</p>
              </div>
              {lead.deal_type === 'retainer' ? (
                <>
                  <div>
                    <p className="text-xs text-tx-3">Monthly</p>
                    <p className="text-sm text-tx mt-1">{lead.monthly ? formatCurrency(lead.monthly) : '—'}/mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-tx-3">Duration</p>
                    <p className="text-sm text-tx mt-1">{lead.months || 6} months</p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-xs text-tx-3">Project Value</p>
                  <p className="text-sm text-tx mt-1">{lead.project ? formatCurrency(lead.project) : '—'}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-tx-3">Total Value</p>
                <p className="text-lg font-heading font-bold text-success mt-1">
                  {value > 0 ? formatCurrency(value) : '—'}
                </p>
              </div>
              {lead.stage === 'Closed' && (
                <div>
                  <p className="text-xs text-tx-3">Commission (20%)</p>
                  <p className="text-lg font-heading font-bold text-accent mt-1">
                    {formatCurrency(value * 0.2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          {lead.services && lead.services.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-3">Services</h3>
              <div className="flex flex-wrap gap-2">
                {lead.services.map(s => (
                  <span key={s} className="badge bg-accent/10 text-accent border border-accent/20">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Activity log */}
          <div className="card p-5">
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-4">Activity Log</h3>
            <ActivityLog
              leadId={lead.id}
              activities={activities}
              onUpdate={acts => {
                setActivities(acts)
                setLead(prev => ({
                  ...prev,
                  follow_up_count: acts.filter(a => a.type !== 'Note').length,
                  last_contact: new Date().toISOString().split('T')[0],
                }))
              }}
            />
          </div>
        </div>

        {/* Right: Contact + Meetings */}
        <div className="space-y-5">
          {/* Contact */}
          <div className="card p-5">
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-4">Contact</h3>
            <div className="space-y-3">
              {lead.phone && (
                <div>
                  <p className="text-xs text-tx-3">Phone</p>
                  <a href={`tel:${lead.phone}`} className="text-sm text-tx hover:text-accent transition-colors">{lead.phone}</a>
                </div>
              )}
              {lead.email && (
                <div>
                  <p className="text-xs text-tx-3">Email</p>
                  <a href={`mailto:${lead.email}`} className="text-sm text-tx hover:text-accent transition-colors break-all">{lead.email}</a>
                </div>
              )}
              <div>
                <p className="text-xs text-tx-3">Owner</p>
                <p className="text-sm text-tx">{lead.owner_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-tx-3">Follow-ups</p>
                <p className="text-sm text-tx">{lead.follow_up_count}</p>
              </div>
              <div>
                <p className="text-xs text-tx-3">Last Contact</p>
                <p className="text-sm text-tx">{formatDate(lead.last_contact)}</p>
              </div>
              <div>
                <p className="text-xs text-tx-3">Created</p>
                <p className="text-sm text-tx">{formatDate(lead.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Meetings */}
          <div className="card p-5">
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-4">Meetings</h3>
            <div className="space-y-3">
              {Object.entries(lead.meetings || {}).map(([slot, meeting]) => (
                <div key={slot} className={`rounded-lg p-3 ${meeting?.date ? 'bg-info/5 border border-info/20' : 'bg-s2'}`}>
                  <p className="text-xs font-medium text-tx-2 mb-1">{meetingLabels[slot]}</p>
                  {meeting?.date ? (
                    <>
                      <p className="text-sm text-info">{formatDate(meeting.date)}{meeting.time && ` at ${meeting.time}`}</p>
                      <a
                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Meeting: ${lead.name}`)}&dates=${meeting.date.replace(/-/g, '')}T${(meeting.time || '0900').replace(':', '')}00/${meeting.date.replace(/-/g, '')}T${(meeting.time || '1000').replace(':', '')}00&details=${encodeURIComponent(`Lead: ${lead.name}\nCompany: ${lead.company || ''}\nPhone: ${lead.phone || ''}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-tx-3 hover:text-info mt-1.5 transition-colors"
                      >
                        📅 Add to Calendar
                      </a>
                    </>
                  ) : (
                    <p className="text-xs text-tx-3">Not scheduled</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <LeadForm
          lead={lead}
          onSave={saved => { setLead(saved); setShowEdit(false) }}
          onCancel={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
