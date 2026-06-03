'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmailOutreachLog, Profile } from '@/types'

interface AdminWeekLog extends EmailOutreachLog {
  profile?: { full_name: string | null }
}

interface Props {
  userId: string
  isAdmin: boolean
  initialLogs: EmailOutreachLog[]
  adminWeekLogs: AdminWeekLog[]
  salesProfiles: Profile[]
  weekStart: string
}

function fmt(n: number) { return n === 0 ? '—' : String(n) }

export default function OutreachClient({
  userId, isAdmin, initialLogs, adminWeekLogs, salesProfiles, weekStart,
}: Props) {
  const supabase = createClient()
  const [logs, setLogs] = useState(initialLogs)
  const [tab, setTab] = useState<'log' | 'admin'>(isAdmin ? 'admin' : 'log')

  // Form state
  const [tool, setTool] = useState('Apollo')
  const [emailsSent, setEmailsSent] = useState('')
  const [replies, setReplies] = useState('')
  const [note, setNote] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const emailsNum = parseInt(emailsSent) || 0

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') setPdfFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setSuccess(false)

    if (emailsNum > 0 && !pdfFile) {
      setErr('A PDF proof is required when emails_sent > 0. Upload your Apollo export.')
      return
    }

    setSaving(true)
    try {
      let proofUrl: string | null = null

      if (pdfFile) {
        setUploading(true)
        const ext = pdfFile.name.split('.').pop()
        const path = `${userId}/${logDate}-${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('outreach-proofs')
          .upload(path, pdfFile, { contentType: 'application/pdf' })
        setUploading(false)
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
        proofUrl = path
      }

      const { data, error } = await supabase
        .from('email_outreach_logs')
        .insert({
          user_id: userId,
          log_date: logDate,
          tool: tool.trim() || 'Apollo',
          emails_sent: emailsNum,
          replies: parseInt(replies) || 0,
          note: note.trim() || null,
          proof_url: proofUrl,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      setLogs(prev => [data as EmailOutreachLog, ...prev])
      setEmailsSent('')
      setReplies('')
      setNote('')
      setPdfFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setErr(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('outreach-proofs')
      .createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  // Admin weekly summary per user
  const adminSummary = salesProfiles.map(p => {
    const userLogs = adminWeekLogs.filter(l => l.user_id === p.id)
    const totalEmails = userLogs.reduce((s, l) => s + l.emails_sent, 0)
    const totalReplies = userLogs.reduce((s, l) => s + l.replies, 0)
    const replyRate = totalEmails > 0 ? Math.round((totalReplies / totalEmails) * 100) : 0
    const proofLogs = userLogs.filter(l => l.proof_url)
    return { profile: p, totalEmails, totalReplies, replyRate, proofLogs, logCount: userLogs.length }
  }).sort((a, b) => b.totalEmails - a.totalEmails)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-tx">Outreach Log</h1>
          <p className="text-tx-3 text-sm mt-0.5">Email outreach tracking with proof</p>
        </div>
      </div>

      {/* Tab bar (admin sees both) */}
      {isAdmin && (
        <div className="flex gap-1 border-b border-border">
          {([['log', 'My Log'], ['admin', 'Team Review']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === key ? 'border-accent text-accent' : 'border-transparent text-tx-3 hover:text-tx'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── My Log tab ─────────────────────────────────────── */}
      {tab === 'log' && (
        <div className="space-y-5">

          {/* Log form */}
          <form onSubmit={handleSubmit} className="card p-5 space-y-4">
            <h2 className="font-heading font-semibold text-sm text-tx">Log today's email outreach</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-tx-3 font-medium mb-1 block">Date</label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-tx-3 font-medium mb-1 block">Tool</label>
                <input value={tool} onChange={e => setTool(e.target.value)} className="w-full" placeholder="Apollo" />
              </div>
              <div>
                <label className="text-xs text-tx-3 font-medium mb-1 block">Emails sent *</label>
                <input
                  type="number" min="0" value={emailsSent}
                  onChange={e => setEmailsSent(e.target.value)}
                  className="w-full" placeholder="0" required
                />
              </div>
              <div>
                <label className="text-xs text-tx-3 font-medium mb-1 block">Replies</label>
                <input
                  type="number" min="0" value={replies}
                  onChange={e => setReplies(e.target.value)}
                  className="w-full" placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-tx-3 font-medium mb-1 block">Note (companies / sequences / context)</label>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                rows={2} className="w-full resize-none"
                placeholder="e.g. Apollo sequence 'Cold SaaS founders' — 40 companies in healthcare vertical"
              />
            </div>

            {/* PDF drop zone */}
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1.5 block">
                Apollo PDF export / screenshot
                {emailsNum > 0 && <span className="text-danger ml-1">*required</span>}
              </label>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  pdfFile
                    ? 'border-success/40 bg-success/5'
                    : 'border-border hover:border-accent/40 hover:bg-accent/5'
                }`}
              >
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-success text-lg">📄</span>
                    <span className="text-sm text-success font-medium truncate max-w-[240px]">{pdfFile.name}</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPdfFile(null); if (fileRef.current) fileRef.current.value = '' }}
                      className="text-xs text-tx-3 hover:text-danger ml-1"
                    >✕</button>
                  </div>
                ) : (
                  <>
                    <p className="text-tx-3 text-sm">Drag & drop PDF here, or click to browse</p>
                    <p className="text-tx-3 text-xs mt-1">PDF only · max 10 MB</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {err && <p className="text-xs text-danger p-2 bg-danger/10 rounded-lg">{err}</p>}
            {success && <p className="text-xs text-success p-2 bg-success/10 rounded-lg">✓ Logged successfully</p>}

            <button
              type="submit"
              disabled={saving || uploading}
              className="btn-primary w-full"
            >
              {uploading ? 'Uploading PDF…' : saving ? 'Saving…' : 'Log Outreach'}
            </button>
          </form>

          {/* Recent logs */}
          {logs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <h2 className="font-heading font-semibold text-sm text-tx">Recent Logs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-s2">
                      {['Date','Tool','Sent','Replies','Rate','Note','Proof'].map(h => (
                        <th key={h} className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id} className="border-b border-border last:border-0 hover:bg-s2/40 transition-colors">
                        <td className="p-3 text-xs text-tx-3">{l.log_date}</td>
                        <td className="p-3 text-xs text-tx">{l.tool}</td>
                        <td className="p-3 text-xs font-bold text-info tabular-nums">{l.emails_sent}</td>
                        <td className="p-3 text-xs tabular-nums">{l.replies}</td>
                        <td className="p-3 text-xs text-tx-3">
                          {l.emails_sent > 0 ? `${Math.round((l.replies / l.emails_sent) * 100)}%` : '—'}
                        </td>
                        <td className="p-3 text-xs text-tx-3 max-w-[180px] truncate">{l.note || '—'}</td>
                        <td className="p-3">
                          {l.proof_url ? (
                            <button
                              onClick={() => getSignedUrl(l.proof_url!)}
                              className="text-[10px] px-2 py-1 rounded bg-info/10 text-info hover:bg-info/20 font-medium transition-colors"
                            >
                              📄 View
                            </button>
                          ) : (
                            <span className="text-xs text-tx-3">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Admin team review tab ─────────────────────────── */}
      {tab === 'admin' && isAdmin && (
        <div className="space-y-4">
          <p className="text-xs text-tx-3">
            Week of {new Date(weekStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-s2">
                    {['Sales Rep','Emails','Replies','Reply Rate','Proofs','Days Logged'].map(h => (
                      <th key={h} className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adminSummary.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-tx-3 text-xs py-10">No sales users found</td></tr>
                  )}
                  {adminSummary.map(row => (
                    <tr key={row.profile.id} className="border-b border-border last:border-0 hover:bg-s2/40 transition-colors">
                      <td className="p-3 font-medium text-tx">{row.profile.full_name || row.profile.email}</td>
                      <td className={`p-3 font-bold tabular-nums ${row.totalEmails === 0 ? 'text-danger' : 'text-info'}`}>
                        {row.totalEmails === 0 ? (
                          <span className="badge bg-danger/10 text-danger text-xs">0 — flag</span>
                        ) : row.totalEmails}
                      </td>
                      <td className="p-3 text-xs tabular-nums">{fmt(row.totalReplies)}</td>
                      <td className="p-3 text-xs text-tx-3">
                        {row.totalEmails > 0 ? `${row.replyRate}%` : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {row.proofLogs.length === 0
                            ? <span className="text-xs text-tx-3">—</span>
                            : row.proofLogs.map(pl => (
                              <button
                                key={pl.id}
                                onClick={() => getSignedUrl(pl.proof_url!)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info hover:bg-info/20 font-medium transition-colors"
                              >
                                {pl.log_date}
                              </button>
                            ))
                          }
                        </div>
                      </td>
                      <td className="p-3 text-xs text-tx-3 tabular-nums">{row.logCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed logs per user */}
          {adminWeekLogs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <h2 className="font-heading font-semibold text-sm text-tx">All logs this week</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-s2">
                      {['Rep','Date','Tool','Sent','Replies','Note','Proof'].map(h => (
                        <th key={h} className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminWeekLogs.map(l => (
                      <tr key={l.id} className="border-b border-border last:border-0 hover:bg-s2/40 transition-colors">
                        <td className="p-3 text-xs text-tx font-medium">{l.profile?.full_name || '—'}</td>
                        <td className="p-3 text-xs text-tx-3">{l.log_date}</td>
                        <td className="p-3 text-xs">{l.tool}</td>
                        <td className="p-3 text-xs font-bold text-info tabular-nums">{l.emails_sent}</td>
                        <td className="p-3 text-xs tabular-nums">{l.replies}</td>
                        <td className="p-3 text-xs text-tx-3 max-w-[200px] truncate">{l.note || '—'}</td>
                        <td className="p-3">
                          {l.proof_url ? (
                            <button
                              onClick={() => getSignedUrl(l.proof_url!)}
                              className="text-[10px] px-2 py-1 rounded bg-info/10 text-info hover:bg-info/20 font-medium transition-colors"
                            >
                              📄 View
                            </button>
                          ) : <span className="text-xs text-tx-3">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
