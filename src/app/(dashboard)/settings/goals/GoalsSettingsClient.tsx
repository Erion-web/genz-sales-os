'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, GoalTarget } from '@/types'

interface Row {
  profile: Profile
  target: GoalTarget
}

const FIELDS: { key: keyof GoalTarget; label: string; section: 'daily' | 'weekly' }[] = [
  { key: 'daily_companies',  label: 'Companies/day',  section: 'daily' },
  { key: 'daily_outreach',   label: 'Outreach/day',   section: 'daily' },
  { key: 'daily_meetings',   label: 'Meetings/day',   section: 'daily' },
  { key: 'weekly_companies', label: 'Companies/wk',   section: 'weekly' },
  { key: 'weekly_outreach',  label: 'Outreach/wk',    section: 'weekly' },
  { key: 'weekly_meetings',  label: 'Meetings/wk',    section: 'weekly' },
  { key: 'weekly_closed',    label: 'Closed/wk',      section: 'weekly' },
]

export default function GoalsSettingsClient({ adminId, rows: initialRows }: { adminId: string; rows: Row[] }) {
  const supabase = createClient()
  const [rows, setRows] = useState(initialRows)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = (userId: string, field: keyof GoalTarget, value: string) => {
    setRows(prev => prev.map(r =>
      r.profile.id === userId
        ? { ...r, target: { ...r.target, [field]: parseInt(value) || 0 } }
        : r
    ))
  }

  const handleSave = async (row: Row) => {
    const uid = row.profile.id
    setSaving(uid)
    setErrors(prev => { const e = { ...prev }; delete e[uid]; return e })

    const patch = {
      daily_companies:  row.target.daily_companies,
      daily_outreach:   row.target.daily_outreach,
      daily_meetings:   row.target.daily_meetings,
      weekly_companies: row.target.weekly_companies,
      weekly_outreach:  row.target.weekly_outreach,
      weekly_meetings:  row.target.weekly_meetings,
      weekly_closed:    row.target.weekly_closed,
      updated_by:       adminId,
      updated_at:       new Date().toISOString(),
    }

    const { error } = await supabase
      .from('goal_targets')
      .upsert({ user_id: uid, ...patch }, { onConflict: 'user_id' })

    if (error) {
      setErrors(prev => ({ ...prev, [uid]: error.message }))
    } else {
      setSaved(uid)
      setTimeout(() => setSaved(s => s === uid ? null : s), 2500)
    }
    setSaving(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold text-tx">Goal Targets</h1>
        <p className="text-tx-3 text-sm mt-0.5">Set daily & weekly targets per sales rep. Only admins can edit this.</p>
      </div>

      {rows.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-tx-3">No sales users found. Invite team members first.</p>
        </div>
      )}

      {rows.map(row => (
        <div key={row.profile.id} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
                {row.profile.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium text-tx text-sm">{row.profile.full_name || 'Unnamed'}</p>
                <p className="text-xs text-tx-3">{row.profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {errors[row.profile.id] && (
                <p className="text-xs text-danger">{errors[row.profile.id]}</p>
              )}
              {saved === row.profile.id && (
                <span className="text-xs text-success font-medium">✓ Saved</span>
              )}
              <button
                onClick={() => handleSave(row)}
                disabled={saving === row.profile.id}
                className="btn-primary text-xs px-4 py-1.5"
              >
                {saving === row.profile.id ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Daily */}
            <div>
              <p className="text-xs text-tx-3 uppercase tracking-wider font-medium mb-2">Daily</p>
              <div className="space-y-2">
                {FIELDS.filter(f => f.section === 'daily').map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="text-xs text-tx-2 w-28 shrink-0">{f.label}</label>
                    <input
                      type="number"
                      min="0"
                      value={row.target[f.key] as number}
                      onChange={e => updateField(row.profile.id, f.key, e.target.value)}
                      className="w-20 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Weekly */}
            <div>
              <p className="text-xs text-tx-3 uppercase tracking-wider font-medium mb-2">Weekly</p>
              <div className="space-y-2">
                {FIELDS.filter(f => f.section === 'weekly').map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="text-xs text-tx-2 w-28 shrink-0">{f.label}</label>
                    <input
                      type="number"
                      min="0"
                      value={row.target[f.key] as number}
                      onChange={e => updateField(row.profile.id, f.key, e.target.value)}
                      className="w-20 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {row.target.updated_at && (
            <p className="text-xs text-tx-3 mt-3">
              Last updated: {new Date(row.target.updated_at).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
