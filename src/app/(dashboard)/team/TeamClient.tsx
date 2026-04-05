'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Profile, formatCurrency } from '@/types'

interface MemberStat {
  profile: Profile
  totalLeads: number
  activeLeads: number
  closedCount: number
  closedValue: number
  pipelineValue: number
  closedMRR: number
  totalActivities: number
  activitiesThisMonth: number
  closingRate: number
  commission: number
}

export default function TeamClient({
  teamStats,
  isAdmin,
  currentUserId,
}: {
  teamStats: MemberStat[]
  isAdmin: boolean
  currentUserId: string
}) {
  const [stats, setStats] = useState(teamStats)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true)
    setError(null)
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Failed to delete user')
      setDeleting(false)
      setConfirmId(null)
      return
    }
    setStats(prev => prev.filter(m => m.profile.id !== userId))
    setConfirmId(null)
    setDeleting(false)
  }

  const totalClosedValue = stats.reduce((sum, s) => sum + s.closedValue, 0)
  const totalPipeline = stats.reduce((sum, s) => sum + s.pipelineValue, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-tx">Team</h1>
          <p className="text-tx-3 text-sm mt-0.5">
            {stats.length} members · Closed:{' '}
            <span className="text-success">{formatCurrency(totalClosedValue)}</span>
            {' · '}Pipeline:{' '}
            <span className="text-info">{formatCurrency(totalPipeline)}</span>
          </p>
        </div>
        {isAdmin && (
          <span className="badge bg-accent/10 text-accent border border-accent/20 text-xs">
            👑 Admin view
          </span>
        )}
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-danger/60 hover:text-danger ml-4">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((member, i) => (
          <div key={member.profile.id} className="card p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="relative">
                {member.profile.avatar_url ? (
                  <Image
                    src={member.profile.avatar_url}
                    alt={member.profile.full_name || 'User'}
                    width={44}
                    height={44}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                    {member.profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                {i === 0 && member.closedValue > 0 && (
                  <span className="absolute -top-1 -right-1 text-sm">🏆</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-tx truncate">
                  {member.profile.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-tx-3 truncate">{member.profile.email}</p>
                <span className={`badge text-xs mt-1 ${
                  member.profile.role === 'admin'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-s3 text-tx-3'
                }`}>
                  {member.profile.role === 'admin' ? '👑 Admin' : 'Sales'}
                </span>
              </div>

              {/* Admin delete button — not shown for self or other admins */}
              {isAdmin &&
                member.profile.id !== currentUserId &&
                member.profile.role !== 'admin' && (
                  <div className="shrink-0">
                    {confirmId === member.profile.id ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <p className="text-xs text-danger">Remove user?</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDeleteUser(member.profile.id)}
                            disabled={deleting}
                            className="text-xs px-2.5 py-1 rounded bg-danger text-white hover:bg-danger/80 transition-colors"
                          >
                            {deleting ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs px-2.5 py-1 rounded border border-border text-tx-3 hover:text-tx transition-colors"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setConfirmId(member.profile.id); setError(null) }}
                        title="Remove user"
                        className="p-1.5 rounded-lg text-tx-3 hover:text-danger hover:bg-danger/10 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-s2 rounded-lg p-3">
                <p className="text-xs text-tx-3">Total Leads</p>
                <p className="font-heading font-bold text-lg text-accent mt-0.5">{member.totalLeads}</p>
              </div>
              <div className="bg-s2 rounded-lg p-3">
                <p className="text-xs text-tx-3">Closed</p>
                <p className="font-heading font-bold text-lg text-success mt-0.5">{member.closedCount}</p>
              </div>
              <div className="bg-s2 rounded-lg p-3">
                <p className="text-xs text-tx-3">Closed Value</p>
                <p className="font-heading font-bold text-sm text-success mt-0.5">{formatCurrency(member.closedValue)}</p>
              </div>
              <div className="bg-s2 rounded-lg p-3">
                <p className="text-xs text-tx-3">Pipeline</p>
                <p className="font-heading font-bold text-sm text-info mt-0.5">{formatCurrency(member.pipelineValue)}</p>
              </div>
            </div>

            {/* Closing rate bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-tx-3">Closing rate</span>
                <span className="text-tx-2 font-medium">{member.closingRate}%</span>
              </div>
              <div className="h-2 bg-s3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${member.closingRate}%`,
                    background: 'linear-gradient(90deg, #7c6af7, #3ecf8e)',
                  }}
                />
              </div>
            </div>

            {/* Commission */}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-tx-3">Commission (20%)</p>
                <p className="font-heading font-bold text-accent">{formatCurrency(member.commission)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-tx-3">Activity this month</p>
                <p className="text-sm font-medium text-tx">{member.activitiesThisMonth}</p>
              </div>
            </div>

            {member.closedMRR > 0 && (
              <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                <p className="text-xs text-tx-3">MRR (closed retainers)</p>
                <p className="text-success font-mono font-medium">{formatCurrency(member.closedMRR)}/mo</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
