'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Intent, Objection, INTENT_COLORS } from '@/types'

interface Props {
  leadId: string
  activityId: string
  onSave: (nextStepDate: string | null) => void
  onSkip: () => void
}

const OBJECTION_LABELS: Record<Objection, string> = {
  price: 'Price',
  has_other_agency: 'Has other agency',
  not_now: 'Not now',
  no_budget: 'No budget',
  no_need: 'No need',
  other: 'Other',
}

const INTENT_LABELS: Record<Intent, string> = {
  cold: '🧊 Cold',
  warm: '🔥 Warm',
  hot: '🚀 Hot',
  urgent: '⚡ Urgent',
}

export default function CallBriefModal({ leadId, activityId, onSave, onSkip }: Props) {
  const supabase = createClient()
  const [contactPerson, setContactPerson] = useState('')
  const [summary, setSummary] = useState('')
  const [interest, setInterest] = useState<Intent | ''>('')
  const [objection, setObjection] = useState<Objection | ''>('')
  const [objectionNote, setObjectionNote] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [nextStepDate, setNextStepDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { error } = await supabase.from('call_briefs').insert({
        lead_id: leadId,
        user_id: session.user.id,
        activity_id: activityId,
        contact_person: contactPerson.trim() || null,
        summary: summary.trim() || null,
        interest_level: interest || null,
        objection: objection || null,
        objection_note: objection === 'other' ? objectionNote.trim() || null : null,
        next_step: nextStep.trim() || null,
        next_step_date: nextStepDate || null,
      })
      if (error) throw new Error(error.message)

      if (nextStepDate) {
        await supabase.from('leads').update({ next_followup: nextStepDate }).eq('id', leadId)
      }

      onSave(nextStepDate || null)
    } catch (e: any) {
      setErr(e?.message || 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />
      <div className="relative card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl z-10 rounded-t-2xl sm:rounded-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-heading font-bold text-base text-tx">Log Call Brief</h2>
            <p className="text-xs text-tx-3 mt-0.5">Quick capture while it's fresh</p>
          </div>
          <button onClick={onSkip} className="text-xs text-tx-3 hover:text-tx px-3 py-1.5 rounded-lg hover:bg-s2 transition-colors border border-border">
            Skip
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Contact person */}
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1.5 block">Contact person</label>
            <input
              value={contactPerson}
              onChange={e => setContactPerson(e.target.value)}
              className="w-full"
              placeholder="Name / role of who you spoke with"
              autoFocus
            />
          </div>

          {/* Summary */}
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1.5 block">What was said</label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={3}
              className="w-full resize-none"
              placeholder="Key points from the call — 3-4 lines max"
            />
          </div>

          {/* Interest level — segmented control */}
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1.5 block">Interest level</label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-s2 rounded-xl border border-border">
              {(['cold','warm','hot','urgent'] as Intent[]).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setInterest(interest === lvl ? '' : lvl)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    interest === lvl
                      ? `${INTENT_COLORS[lvl]} border border-current/30`
                      : 'text-tx-3 hover:text-tx'
                  }`}
                >
                  {INTENT_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>

          {/* Objection */}
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1.5 block">Objection (if any)</label>
            <select
              value={objection}
              onChange={e => setObjection(e.target.value as Objection | '')}
              className="w-full"
            >
              <option value="">— None —</option>
              {(Object.keys(OBJECTION_LABELS) as Objection[]).map(k => (
                <option key={k} value={k}>{OBJECTION_LABELS[k]}</option>
              ))}
            </select>
            {objection === 'other' && (
              <input
                value={objectionNote}
                onChange={e => setObjectionNote(e.target.value)}
                className="w-full mt-2"
                placeholder="Describe the objection…"
              />
            )}
          </div>

          {/* Next step + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1.5 block">Next step</label>
              <input
                value={nextStep}
                onChange={e => setNextStep(e.target.value)}
                className="w-full"
                placeholder="e.g. Send proposal"
              />
            </div>
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1.5 block">
                Date <span className="text-tx-3 font-normal">(bumps follow-up)</span>
              </label>
              <input
                type="date"
                value={nextStepDate}
                onChange={e => setNextStepDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {err && <p className="text-xs text-danger p-2 bg-danger/10 rounded-lg">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onSkip} className="btn-ghost flex-1 text-sm">Skip for now</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 text-sm"
            >
              {saving ? 'Saving…' : 'Save brief'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
