'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, ActivityType, formatDate } from '@/types'

interface Props {
  leadId: string
  activities: Activity[]
  onUpdate: (activities: Activity[]) => void
}

const ACTIVITY_TYPES: ActivityType[] = ['Called', 'Messaged', 'No answer', 'Note']

const typeIcons: Record<ActivityType, string> = {
  Called: '📞',
  Messaged: '💬',
  'No answer': '🔇',
  Note: '📝',
}

const typeColors: Record<ActivityType, string> = {
  Called: 'text-success bg-success/10',
  Messaged: 'text-info bg-info/10',
  'No answer': 'text-tx-3 bg-s3',
  Note: 'text-warning bg-warning/10',
}

export default function ActivityLog({ leadId, activities, onUpdate }: Props) {
  const supabase = createClient()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const logActivity = async (type: ActivityType) => {
    setLoading(type)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setLoading(null); return }
    const user = session.user

    const today = new Date().toISOString().split('T')[0]

    // Log activity
    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        lead_id: leadId,
        type,
        note: type === 'Note' ? note.trim() || null : note.trim() || null,
        owner_id: user.id,
      })
      .select()
      .single()

    if (!error && activity) {
      // Update last_contact and follow_up_count
      const nextFollowupDate = new Date()
      nextFollowupDate.setDate(nextFollowupDate.getDate() + (type === 'No answer' ? 2 : 3))
      const nextFollowup = nextFollowupDate.toISOString().split('T')[0]

      await supabase
        .from('leads')
        .update({
          last_contact: today,
          next_followup: nextFollowup,
          follow_up_count: activities.filter(a => a.type !== 'Note').length + 1,
        })
        .eq('id', leadId)

      onUpdate([activity as Activity, ...activities])
      setNote('')
    }
    setLoading(null)
  }

  return (
    <div>
      {/* Quick log buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ACTIVITY_TYPES.map(type => (
          <button
            key={type}
            onClick={() => logActivity(type)}
            disabled={!!loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:border-s3 bg-s2 text-tx-2 hover:text-tx transition-all disabled:opacity-50`}
          >
            <span>{typeIcons[type]}</span>
            {loading === type ? '...' : type}
          </button>
        ))}
      </div>

      {/* Note input */}
      <div className="flex gap-2 mb-4">
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional)..."
          className="flex-1"
          onKeyDown={e => e.key === 'Enter' && note.trim() && logActivity('Note')}
        />
        {note.trim() && (
          <button onClick={() => logActivity('Note')} className="btn-primary text-xs px-3">
            Log Note
          </button>
        )}
      </div>

      {/* History */}
      <div className="space-y-2">
        {activities.length === 0 && (
          <p className="text-tx-3 text-sm text-center py-4">No activity yet</p>
        )}
        {activities.map(a => (
          <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
            <span className={`badge shrink-0 mt-0.5 ${typeColors[a.type as ActivityType]}`}>
              {typeIcons[a.type as ActivityType]} {a.type}
            </span>
            <div className="flex-1 min-w-0">
              {a.note && <p className="text-sm text-tx-2">{a.note}</p>}
              <p className="text-xs text-tx-3 mt-0.5">
                {new Date(a.created_at).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
