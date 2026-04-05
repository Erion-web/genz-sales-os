'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Lead, Stage, Intent, Source, Service,
  STAGES, SOURCES, SERVICES, INTENTS,
  getDealValue
} from '@/types'

interface Props {
  lead?: Lead
  onSave: (lead: Lead) => void
  onCancel: () => void
}

const emptyMeeting = { date: null, time: null }

export default function LeadForm({ lead, onSave, onCancel }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<string[]>([])

  const [form, setForm] = useState({
    name: lead?.name || '',
    company: lead?.company || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    deal_type: lead?.deal_type || 'retainer',
    monthly: lead?.monthly?.toString() || '',
    months: lead?.months?.toString() || '6',
    project: lead?.project?.toString() || '',
    source: lead?.source || '',
    stage: lead?.stage || 'New',
    intent: lead?.intent || 'cold',
    services: lead?.services || [],
    next_followup: lead?.next_followup || '',
    last_contact: lead?.last_contact || '',
    owner_name: lead?.owner_name || '',
    meetings: {
      meeting1: lead?.meetings?.meeting1 || emptyMeeting,
      meeting2: lead?.meetings?.meeting2 || emptyMeeting,
      meeting3: lead?.meetings?.meeting3 || emptyMeeting,
    },
    follow_up_count: lead?.follow_up_count || 0,
  })

  const dealValue =
    form.deal_type === 'retainer'
      ? (parseFloat(form.monthly) || 0) * (parseInt(form.months) || 6)
      : parseFloat(form.project) || 0

  const toggleService = (s: Service) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter(x => x !== s)
        : [...prev.services, s],
    }))
  }

  const updateMeeting = (slot: 'meeting1' | 'meeting2' | 'meeting3', field: 'date' | 'time', value: string) => {
    setForm(prev => ({
      ...prev,
      meetings: {
        ...prev.meetings,
        [slot]: { ...prev.meetings[slot], [field]: value || null },
      },
    }))
  }

  // Conflict detection
  useEffect(() => {
    const dates = [
      form.meetings.meeting1?.date,
      form.meetings.meeting2?.date,
      form.meetings.meeting3?.date,
    ].filter(Boolean) as string[]

    if (dates.length === 0) { setConflicts([]); return }

    supabase
      .from('leads')
      .select('id, name, meetings')
      .neq('id', lead?.id || '00000000-0000-0000-0000-000000000000')
      .then(({ data }) => {
        if (!data) return
        const warns: string[] = []
        data.forEach(l => {
          const m = l.meetings as Record<string, { date: string | null } | null>
          Object.values(m || {}).forEach(slot => {
            if (slot?.date && dates.includes(slot.date)) {
              warns.push(`${l.name} has a meeting on ${slot.date}`)
            }
          })
        })
        setConflicts(warns.filter((v, i, a) => a.indexOf(v) === i))
      })
  }, [form.meetings.meeting1?.date, form.meetings.meeting2?.date, form.meetings.meeting3?.date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.next_followup) {
      setError('Next follow-up date is required.')
      return
    }
    if (!form.name.trim()) {
      setError('Lead name is required.')
      return
    }

    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setError('Not authenticated'); setLoading(false); return }
    const user = session.user

    const payload = {
      name: form.name.trim(),
      company: form.company || null,
      phone: form.phone || null,
      email: form.email || null,
      deal_type: form.deal_type,
      monthly: form.deal_type === 'retainer' ? parseFloat(form.monthly) || null : null,
      months: form.deal_type === 'retainer' ? parseInt(form.months) || 6 : null,
      project: form.deal_type === 'project' ? parseFloat(form.project) || null : null,
      source: form.source || null,
      stage: form.stage as Stage,
      intent: form.intent as Intent,
      services: form.services.length > 0 ? form.services : null,
      meetings: form.meetings,
      next_followup: form.next_followup,
      last_contact: form.last_contact || null,
      follow_up_count: form.follow_up_count,
      owner_name: form.owner_name || null,
    }

    if (lead) {
      const { data, error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', lead.id)
        .select()
        .single()
      if (error) { setError(error.message); setLoading(false); return }
      onSave(data as Lead)
    } else {
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...payload, owner_id: user.id })
        .select()
        .single()
      if (error) { setError(error.message); setLoading(false); return }
      onSave(data as Lead)
    }
    setLoading(false)
  }

  const meetingLabels = ['First Meeting', 'Second Meeting', 'Closing Meeting']
  const meetingKeys = ['meeting1', 'meeting2', 'meeting3'] as const

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-6 card">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-tx">
            {lead ? 'Edit Lead' : 'New Lead'}
          </h2>
          <button onClick={onCancel} className="text-tx-3 hover:text-tx transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Contact info */}
          <section>
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-3">Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-tx-3 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Smith" required />
              </div>
              <div>
                <label className="block text-xs text-tx-3 mb-1">Company</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Acme Inc." />
              </div>
              <div>
                <label className="block text-xs text-tx-3 mb-1">Owner Name</label>
                <input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs text-tx-3 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 8900" />
              </div>
              <div>
                <label className="block text-xs text-tx-3 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@acme.com" />
              </div>
            </div>
          </section>

          {/* Deal */}
          <section>
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-3">Deal</h3>
            <div className="flex gap-2 mb-3">
              {(['retainer', 'project'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, deal_type: t }))}
                  className={`px-4 py-2 rounded-lg text-sm capitalize transition-all border ${
                    form.deal_type === t
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'border-border text-tx-3 hover:border-s3'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {form.deal_type === 'retainer' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-tx-3 mb-1">Monthly (€)</label>
                  <input type="number" min="0" value={form.monthly} onChange={e => setForm(p => ({ ...p, monthly: e.target.value }))} placeholder="2000" />
                </div>
                <div>
                  <label className="block text-xs text-tx-3 mb-1">Months</label>
                  <input type="number" min="1" value={form.months} onChange={e => setForm(p => ({ ...p, months: e.target.value }))} placeholder="6" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-tx-3 mb-1">Project Value (€)</label>
                <input type="number" min="0" value={form.project} onChange={e => setForm(p => ({ ...p, project: e.target.value }))} placeholder="5000" />
              </div>
            )}
            {dealValue > 0 && (
              <p className="text-success text-sm mt-2">
                Total value: <span className="font-semibold">€{dealValue.toLocaleString()}</span>
              </p>
            )}
          </section>

          {/* Stage & Intent */}
          <section>
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-3">Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-tx-3 mb-1">Stage</label>
                <select value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value as Stage }))}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-tx-3 mb-1">Source</label>
                <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value as Source }))}>
                  <option value="">Select source</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-tx-3 mb-2">Buying Intent</label>
              <div className="flex gap-2">
                {INTENTS.map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, intent: i }))}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize border transition-all ${
                      form.intent === i
                        ? i === 'cold' ? 'bg-s3 border-s3 text-tx-2'
                          : i === 'warm' ? 'bg-warning/10 border-warning text-warning'
                          : i === 'hot' ? 'bg-danger/10 border-danger text-danger'
                          : 'bg-accent/10 border-accent text-accent'
                        : 'border-border text-tx-3 hover:border-s3'
                    }`}
                  >
                    {i === 'cold' ? '🧊' : i === 'warm' ? '🔥' : i === 'hot' ? '🚀' : '⚡'} {i}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Services */}
          <section>
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-3">Services</h3>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s as Service)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    (form.services as string[]).includes(s)
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'border-border text-tx-3 hover:border-s3'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Follow-up */}
          <section>
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-3">Follow-up</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-tx-3 mb-1">Next Follow-up *</label>
                <input type="date" value={form.next_followup} onChange={e => setForm(p => ({ ...p, next_followup: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-tx-3 mb-1">Last Contact</label>
                <input type="date" value={form.last_contact} onChange={e => setForm(p => ({ ...p, last_contact: e.target.value }))} />
              </div>
            </div>
          </section>

          {/* Meetings */}
          <section>
            <h3 className="text-xs text-tx-3 uppercase tracking-wider mb-3">Meetings</h3>
            {conflicts.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs space-y-1">
                <p className="font-medium">⚠️ Meeting conflicts detected:</p>
                {conflicts.map(c => <p key={c}>• {c}</p>)}
              </div>
            )}
            <div className="space-y-3">
              {meetingKeys.map((key, i) => (
                <div key={key} className="bg-s2 rounded-lg p-3">
                  <p className="text-xs text-tx-2 mb-2 font-medium">{meetingLabels[i]}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={form.meetings[key]?.date || ''}
                      onChange={e => updateMeeting(key, 'date', e.target.value)}
                    />
                    <input
                      type="time"
                      value={form.meetings[key]?.time || ''}
                      onChange={e => updateMeeting(key, 'time', e.target.value)}
                    />
                  </div>
                  {form.meetings[key]?.date && form.meetings[key]?.time && (
                    <a
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Meeting: ${form.name}`)}&dates=${form.meetings[key]?.date?.replace(/-/g, '')}T${form.meetings[key]?.time?.replace(':', '')}00/${form.meetings[key]?.date?.replace(/-/g, '')}T${(form.meetings[key]?.time || '').replace(':', '')}00`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-info text-xs mt-1.5 hover:underline"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Add to Google Calendar
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : lead ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
