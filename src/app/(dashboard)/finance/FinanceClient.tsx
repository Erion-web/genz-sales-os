'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────

type FinanceClient = {
  id: string
  name: string
  service: string | null
  monthly_retainer: number
  currency: string
  has_tvsh: boolean
  tvsh_included: boolean
  status: 'active' | 'paused' | 'ended'
  notes: string | null
  lead_id: string | null
  created_at: string
}

type Invoice = {
  id: string
  client_id: string
  month: string
  amount: number
  tvsh_rate: number
  type: 'retainer' | 'project' | 'other'
  status: 'pending' | 'half_paid' | 'paid'
  paid_amount: number
  notes: string | null
  due_date: string | null
  paid_at: string | null
  created_at: string
}

type PipelineOffer = {
  id: string
  title: string
  client_name: string
  client_company: string | null
  status: string
  created_at: string
  sent_at: string | null
  services: { name: string; price: number; unit: string }[]
  share_token: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

const TVSH_RATE = 18
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}`
}
function monthKeyToDate(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1)
}
function monthLabel(key: string) {
  const d = monthKeyToDate(key)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}
function firstOfMonth(key: string) { return `${key}-01` }

function fmt(n: number) {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}
function tvshOf(amount: number, rate: number) { return (amount * rate) / 100 }
function totalOf(amount: number, rate: number) { return amount + tvshOf(amount, rate) }

function daysSince(iso: string | null) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Invoice['status'] }) {
  if (status === 'paid')
    return <span className="badge bg-success/15 text-success text-xs font-medium">Paid</span>
  if (status === 'half_paid')
    return <span className="badge bg-warning/15 text-warning text-xs font-medium">Half paid</span>
  return <span className="badge bg-danger/10 text-danger text-xs font-medium">Pending</span>
}

// ── Client form modal ─────────────────────────────────────────────────────

function ClientFormModal({
  edit,
  onSave,
  onCancel,
}: {
  edit?: FinanceClient
  onSave: (data: Omit<FinanceClient, 'id' | 'created_at' | 'lead_id'>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(edit?.name || '')
  const [service, setService] = useState(edit?.service || '')
  const [retainer, setRetainer] = useState(String(edit?.monthly_retainer ?? ''))
  const [hasTvsh, setHasTvsh] = useState(edit?.has_tvsh ?? false)
  const [tvshIncluded, setTvshIncluded] = useState(edit?.tvsh_included ?? false)
  const [status, setStatus] = useState<FinanceClient['status']>(edit?.status || 'active')
  const [notes, setNotes] = useState(edit?.notes || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const retainerNum = parseFloat(retainer) || 0
  const previewBase = tvshIncluded ? retainerNum / (1 + TVSH_RATE / 100) : retainerNum
  const previewTotal = tvshIncluded ? retainerNum : retainerNum * (1 + TVSH_RATE / 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSave({
        name: name.trim(),
        service: service.trim() || null,
        monthly_retainer: retainerNum,
        currency: 'EUR',
        has_tvsh: hasTvsh,
        tvsh_included: hasTvsh ? tvshIncluded : false,
        status,
        notes: notes.trim() || null,
      })
    } catch (e: any) {
      setErr(e?.message || 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-md p-6 shadow-xl z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-lg text-tx">{edit ? 'Edit Client' : 'Add Client'}</h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-tx-3 hover:text-tx hover:bg-s2 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Client name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full" placeholder="e.g. CCL" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1 block">Service</label>
              <input value={service} onChange={e => setService(e.target.value)} className="w-full" placeholder="SMM, Ads…" />
            </div>
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1 block">
                {hasTvsh && tvshIncluded ? 'Contract price incl. TVSH (€)' : 'Monthly retainer (€)'}
              </label>
              <input type="number" min="0" step="0.01" value={retainer} onChange={e => setRetainer(e.target.value)} className="w-full" placeholder="300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg hover:bg-s2 transition-colors border border-border">
                <input type="checkbox" checked={hasTvsh} onChange={e => { setHasTvsh(e.target.checked); if (!e.target.checked) setTvshIncluded(false) }} className="w-4 h-4" />
                <div>
                  <p className="text-sm text-tx font-medium leading-tight">TVSH ({TVSH_RATE}%)</p>
                  <p className="text-xs text-tx-3 leading-tight">{hasTvsh ? 'Applies' : 'NGO / exempt'}</p>
                </div>
              </label>
            </div>
          </div>

          {hasTvsh && (
            <div className="rounded-xl border border-border overflow-hidden">
              <p className="text-xs text-tx-3 font-medium px-3 pt-2.5 pb-1.5 bg-s2 border-b border-border">TVSH mode</p>
              <div className="divide-y divide-border">
                {([
                  { value: false, label: 'Added on top', desc: retainerNum > 0 ? `${fmt(retainerNum)} + ${TVSH_RATE}% = ${fmt(previewTotal)}` : `e.g. €300 + 18% = €354` },
                  { value: true,  label: 'Already included in price', desc: retainerNum > 0 ? `${fmt(retainerNum)} total → ${fmt(previewBase)} base + ${fmt(retainerNum - previewBase)} TVSH` : `e.g. €300 incl. → €254.24 base` },
                ] as const).map(opt => (
                  <label key={String(opt.value)} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-s2 transition-colors">
                    <input type="radio" name="tvsh_mode" checked={tvshIncluded === opt.value} onChange={() => setTvshIncluded(opt.value)} className="mt-0.5 w-3.5 h-3.5 shrink-0" />
                    <div>
                      <p className="text-sm text-tx font-medium leading-tight">{opt.label}</p>
                      <p className="text-xs text-tx-3 leading-tight mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full" placeholder="Extra info…" />
          </div>
          {err && <p className="text-xs text-danger p-2 bg-danger/10 rounded-lg">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="btn-primary flex-1">
              {saving ? 'Saving…' : edit ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add invoice modal ─────────────────────────────────────────────────────

function AddInvoiceModal({
  clients,
  selectedMonth,
  onSave,
  onCancel,
}: {
  clients: FinanceClient[]
  selectedMonth: string
  onSave: (invoice: Invoice) => void
  onCancel: () => void
}) {
  const supabase = createClient()
  const activeClients = clients.filter(c => c.status === 'active')
  const [clientId, setClientId] = useState(activeClients[0]?.id || '')
  const [type, setType] = useState<Invoice['type']>('project')
  const [amount, setAmount] = useState('')
  const [hasTvsh, setHasTvsh] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const c = activeClients.find(c => c.id === clientId)
    if (c) setHasTvsh(c.has_tvsh)
  }, [clientId])

  const amtNum = parseFloat(amount) || 0
  const tvshAmt = hasTvsh ? amtNum * (TVSH_RATE / 100) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const { data, error } = await supabase.from('invoices').insert({
        client_id: clientId,
        month: firstOfMonth(selectedMonth),
        amount: amtNum,
        tvsh_rate: hasTvsh ? TVSH_RATE : 0,
        type,
        status: 'pending',
        paid_amount: 0,
        notes: notes.trim() || null,
      }).select().single()
      if (error) throw new Error(error.message)
      onSave(data as Invoice)
    } catch (e: any) {
      setErr(e?.message || 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-md p-6 shadow-xl z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-lg text-tx">Add Invoice</h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-tx-3 hover:text-tx hover:bg-s2 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Client *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full" required>
              {activeClients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value as Invoice['type'])} className="w-full">
                <option value="project">Project</option>
                <option value="retainer">Retainer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1 block">Amount (€) *</label>
              <input
                type="number" min="0" step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full" placeholder="500" required autoFocus
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg hover:bg-s2 transition-colors border border-border">
            <input type="checkbox" checked={hasTvsh} onChange={e => setHasTvsh(e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm text-tx font-medium leading-tight">Apply TVSH ({TVSH_RATE}%)</p>
              <p className="text-xs text-tx-3 leading-tight">
                {hasTvsh && amtNum > 0 ? `+${fmt(tvshAmt)} = ${fmt(amtNum + tvshAmt)} total` : 'No VAT'}
              </p>
            </div>
          </label>
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full" placeholder="e.g. Website redesign phase 1" />
          </div>
          {err && <p className="text-xs text-danger p-2 bg-danger/10 rounded-lg">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving || !clientId || !amount} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Add Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Half-pay modal ────────────────────────────────────────────────────────

function HalfPayModal({
  invoice,
  clientName,
  onConfirm,
  onCancel,
}: {
  invoice: Invoice
  clientName: string
  onConfirm: (paidAmount: number, notes: string) => Promise<void>
  onCancel: () => void
}) {
  const total = totalOf(invoice.amount, invoice.tvsh_rate)
  const [amount, setAmount] = useState(String(invoice.paid_amount || Math.round(total / 2)))
  const [notes, setNotes] = useState(invoice.notes || '')
  const [saving, setSaving] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-sm p-6 shadow-xl z-10">
        <h2 className="font-heading font-bold text-lg text-tx mb-1">Partial payment</h2>
        <p className="text-xs text-tx-3 mb-4">{clientName} · Total: {fmt(total)}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Amount paid (€)</label>
            <input type="number" min="0" step="0.01" max={total} value={amount} onChange={e => setAmount(e.target.value)} className="w-full" autoFocus />
          </div>
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Note</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full" placeholder="e.g. Paid first half…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
            <button
              disabled={saving}
              onClick={async () => { setSaving(true); await onConfirm(parseFloat(amount) || 0, notes) }}
              className="btn-primary flex-1"
            >
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────

function OverviewTab({
  clients,
  invoices,
  setInvoices,
}: {
  clients: FinanceClient[]
  invoices: Invoice[]
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>
}) {
  const supabase = createClient()
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(toMonthKey(today))
  const generated = useRef(new Set<string>())
  const [halfPayInvoice, setHalfPayInvoice] = useState<Invoice | null>(null)
  const [showAddInvoice, setShowAddInvoice] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  // Auto-generate missing retainer invoices for selected month.
  // Never generate for months before May 2026 (the finance start date) to
  // prevent phantom invoices accumulating as borgje when scrolling back.
  const FINANCE_START = '2026-05'

  useEffect(() => {
    if (selectedMonth < FINANCE_START) return
    if (generated.current.has(selectedMonth)) return
    generated.current.add(selectedMonth)

    const activeClients = clients.filter(c => c.status === 'active' && c.monthly_retainer > 0)
    const monthDate = firstOfMonth(selectedMonth)
    const existingIds = new Set(
      invoices.filter(i => i.month.startsWith(selectedMonth) && i.type === 'retainer').map(i => i.client_id)
    )
    const missing = activeClients.filter(c => !existingIds.has(c.id))
    if (missing.length === 0) return

    supabase.from('invoices').insert(
      missing.map(c => {
        const baseAmount = c.has_tvsh && c.tvsh_included
          ? Math.round((c.monthly_retainer / (1 + TVSH_RATE / 100)) * 100) / 100
          : c.monthly_retainer
        return {
          client_id: c.id,
          month: monthDate,
          amount: baseAmount,
          tvsh_rate: c.has_tvsh ? TVSH_RATE : 0,
          type: 'retainer',
          status: 'pending',
          paid_amount: 0,
        }
      })
    ).select().then(({ data }) => {
      if (data) setInvoices(prev => [...prev, ...(data as Invoice[])])
    })
  }, [selectedMonth, clients])

  const monthInvoices = useMemo(() =>
    invoices
      .filter(i => i.month.startsWith(selectedMonth))
      .sort((a, b) => {
        const ca = clients.find(c => c.id === a.client_id)?.name || ''
        const cb = clients.find(c => c.id === b.client_id)?.name || ''
        return ca.localeCompare(cb)
      }),
    [invoices, selectedMonth, clients]
  )

  // KPIs
  const totalBase = monthInvoices.reduce((s, i) => s + i.amount, 0)
  const totalTvsh = monthInvoices.reduce((s, i) => s + tvshOf(i.amount, i.tvsh_rate), 0)
  const totalGross = totalBase + totalTvsh
  const totalPaid = monthInvoices.reduce((s, i) => s + i.paid_amount, 0)
  const totalPending = totalGross - totalPaid

  // All-time outstanding (past months, not paid)
  const borgje = useMemo(() => {
    const currentMonthDate = firstOfMonth(selectedMonth)
    return invoices
      .filter(i => i.month < currentMonthDate && i.status !== 'paid')
      .reduce((s, i) => s + totalOf(i.amount, i.tvsh_rate) - i.paid_amount, 0)
  }, [invoices, selectedMonth])

  const prevMonth = () => {
    if (selectedMonth <= FINANCE_START) return
    const d = monthKeyToDate(selectedMonth)
    d.setMonth(d.getMonth() - 1)
    setSelectedMonth(toMonthKey(d))
  }
  const nextMonth = () => {
    const d = monthKeyToDate(selectedMonth)
    d.setMonth(d.getMonth() + 1)
    setSelectedMonth(toMonthKey(d))
  }

  const updateInvoice = async (id: string, patch: Partial<Invoice>) => {
    const { data, error } = await supabase.from('invoices').update(patch).eq('id', id).select().single()
    if (!error && data) setInvoices(prev => prev.map(i => i.id === id ? data as Invoice : i))
  }

  const markPaid = (inv: Invoice) => {
    const total = totalOf(inv.amount, inv.tvsh_rate)
    updateInvoice(inv.id, { status: 'paid', paid_amount: total, paid_at: new Date().toISOString() })
  }
  const markPending = (inv: Invoice) => updateInvoice(inv.id, { status: 'pending', paid_amount: 0, paid_at: null })
  const confirmHalfPay = async (inv: Invoice, paidAmount: number, notes: string) => {
    await updateInvoice(inv.id, { status: 'half_paid', paid_amount: paidAmount, notes: notes || inv.notes })
    setHalfPayInvoice(null)
  }

  return (
    <div className="space-y-5">

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} disabled={selectedMonth <= FINANCE_START} className="p-1.5 rounded-lg hover:bg-s2 text-tx-3 hover:text-tx transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="font-heading font-bold text-tx text-base w-40 text-center">{monthLabel(selectedMonth)}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-s2 text-tx-3 hover:text-tx transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddInvoice(true)}
            className="btn-primary text-xs px-3 py-1.5"
          >
            + Add Invoice
          </button>
          <button
            onClick={() => { generated.current.delete(selectedMonth); setSelectedMonth(s => s) }}
            className="btn-ghost text-xs px-3 py-1.5"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Base retainer', value: fmt(totalBase), color: 'text-info' },
          { label: 'TVSH (18%)', value: fmt(totalTvsh), color: 'text-tx-2' },
          { label: 'Total gross', value: fmt(totalGross), color: 'text-accent' },
          { label: borgje > 0 ? `Borgje (prev months)` : 'All paid', value: borgje > 0 ? fmt(borgje) : '✓ Clear', color: borgje > 0 ? 'text-danger' : 'text-success' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <p className="text-xs text-tx-3 font-medium uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`font-heading font-bold text-xl ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalGross > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-tx-3 font-medium">Collection progress</span>
            <span className="text-xs text-tx font-bold">{fmt(totalPaid)} / {fmt(totalGross)}</span>
          </div>
          <div className="h-2 bg-s3 rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalPaid / totalGross) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-success">{Math.round((totalPaid / totalGross) * 100)}% collected</span>
            <span className="text-xs text-danger">{fmt(totalPending)} outstanding</span>
          </div>
        </div>
      )}

      {/* Invoice table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-s2">
                {['Client','Service','Base','TVSH','Total','Paid','Status',''].map(h => (
                  <th key={h} className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthInvoices.length === 0 && (
                <tr><td colSpan={8} className="text-center text-tx-3 text-xs py-10">No invoices for this month</td></tr>
              )}
              {monthInvoices.map(inv => {
                const client = clients.find(c => c.id === inv.client_id)
                const tvsh = tvshOf(inv.amount, inv.tvsh_rate)
                const total = inv.amount + tvsh
                return (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-s2/40 transition-colors group">
                    <td className="p-3 font-medium text-tx">{client?.name || '—'}</td>
                    <td className="p-3 text-xs">
                      <span className="text-tx-3">{client?.service || '—'}</span>
                      {inv.type !== 'retainer' && (
                        <span className={`ml-1.5 badge text-[10px] ${inv.type === 'project' ? 'bg-info/10 text-info' : 'bg-s3 text-tx-3'}`}>
                          {inv.type}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-tx">{fmt(inv.amount)}</td>
                    <td className="p-3 font-mono text-xs text-tx-3">{tvsh > 0 ? fmt(tvsh) : '—'}</td>
                    <td className="p-3 font-mono text-xs font-semibold text-tx">{fmt(total)}</td>
                    <td className="p-3 font-mono text-xs text-success">
                      {inv.paid_amount > 0 ? fmt(inv.paid_amount) : '—'}
                    </td>
                    <td className="p-3"><StatusBadge status={inv.status} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => markPaid(inv)}
                            className="text-[10px] px-2 py-1 rounded bg-success/15 text-success hover:bg-success/25 font-medium transition-colors"
                          >
                            Mark paid
                          </button>
                        )}
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => setHalfPayInvoice(inv)}
                            className="text-[10px] px-2 py-1 rounded bg-warning/15 text-warning hover:bg-warning/25 font-medium transition-colors"
                          >
                            Partial
                          </button>
                        )}
                        {inv.status === 'paid' && (
                          <button
                            onClick={() => markPending(inv)}
                            className="text-[10px] px-2 py-1 rounded bg-s3 text-tx-3 hover:bg-s2 font-medium transition-colors"
                          >
                            Undo
                          </button>
                        )}
                        <button
                          onClick={() => { setNoteId(inv.id); setNoteText(inv.notes || '') }}
                          className="p-1 rounded hover:bg-s2 text-tx-3 hover:text-tx transition-colors"
                          title="Add note"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                      </div>
                      {inv.notes && <p className="text-[10px] text-tx-3 mt-0.5 truncate max-w-[120px]">{inv.notes}</p>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddInvoice && (
        <AddInvoiceModal
          clients={clients}
          selectedMonth={selectedMonth}
          onSave={inv => { setInvoices(prev => [...prev, inv]); setShowAddInvoice(false) }}
          onCancel={() => setShowAddInvoice(false)}
        />
      )}

      {halfPayInvoice && (
        <HalfPayModal
          invoice={halfPayInvoice}
          clientName={clients.find(c => c.id === halfPayInvoice.client_id)?.name || ''}
          onConfirm={(amt, notes) => confirmHalfPay(halfPayInvoice, amt, notes)}
          onCancel={() => setHalfPayInvoice(null)}
        />
      )}

      {noteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setNoteId(null)} />
          <div className="relative card w-full max-w-sm p-5 shadow-xl z-10">
            <h3 className="font-heading font-semibold text-tx mb-3">Invoice note</h3>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              className="w-full resize-none mb-3"
              placeholder="e.g. Client confirmed payment for 24 May…"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setNoteId(null)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={async () => {
                  await updateInvoice(noteId, { notes: noteText.trim() || null })
                  setNoteId(null)
                }}
                className="btn-primary flex-1"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Clients tab ───────────────────────────────────────────────────────────

function ClientsTab({
  clients,
  setClients,
  invoices,
}: {
  clients: FinanceClient[]
  setClients: React.Dispatch<React.SetStateAction<FinanceClient[]>>
  invoices: Invoice[]
}) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<FinanceClient | undefined>()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'ended'>('active')

  const displayed = clients.filter(c => filter === 'all' || c.status === filter)
  const activeClients = clients.filter(c => c.status === 'active')

  // For tvsh_included clients the contract price already contains TVSH,
  // so we extract the real base. For tvsh_added, the retainer IS the base.
  const totalMRR = activeClients.reduce((s, c) => {
    if (c.has_tvsh && c.tvsh_included)
      return s + c.monthly_retainer / (1 + TVSH_RATE / 100)
    return s + c.monthly_retainer
  }, 0)

  const totalTvsh = activeClients.reduce((s, c) => {
    if (!c.has_tvsh) return s
    const base = c.tvsh_included
      ? c.monthly_retainer / (1 + TVSH_RATE / 100)
      : c.monthly_retainer
    return s + base * (TVSH_RATE / 100)
  }, 0)

  const totalMRRWithTvsh = totalMRR + totalTvsh

  const handleSave = async (data: Omit<FinanceClient, 'id' | 'created_at' | 'lead_id'>) => {
    if (editClient) {
      const { data: updated, error } = await supabase
        .from('finance_clients').update(data).eq('id', editClient.id).select().single()
      if (error) throw new Error(error.message)
      setClients(prev => prev.map(c => c.id === editClient.id ? updated as FinanceClient : c))
    } else {
      const { data: created, error } = await supabase
        .from('finance_clients').insert(data).select().single()
      if (error) throw new Error(error.message)
      setClients(prev => [...prev, created as FinanceClient])
    }
    setShowForm(false)
    setEditClient(undefined)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('finance_clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
    setConfirmDeleteId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['all','active','paused','ended'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${
                filter === f ? 'bg-accent/15 text-accent' : 'text-tx-3 hover:bg-s2 hover:text-tx'
              }`}
            >
              {f === 'all' ? `All (${clients.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${clients.filter(c => c.status === f).length})`}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditClient(undefined); setShowForm(true) }} className="btn-primary text-sm">
          + Add Client
        </button>
      </div>

      {/* MRR summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider mb-1">Active clients</p>
          <p className="font-heading font-bold text-2xl text-accent">{activeClients.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider mb-1">MRR (base)</p>
          <p className="font-heading font-bold text-2xl text-info">{fmt(totalMRR)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider mb-1">TVSH ({TVSH_RATE}%)</p>
          <p className="font-heading font-bold text-2xl text-tx-2">{fmt(totalTvsh)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider mb-1">MRR + TVSH</p>
          <p className="font-heading font-bold text-2xl text-success">{fmt(totalMRRWithTvsh)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-s2">
                {['Client','Service','Retainer/mo','TVSH','Status','Notes',''].map(h => (
                  <th key={h} className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr><td colSpan={7} className="text-center text-tx-3 text-xs py-10">No clients</td></tr>
              )}
              {displayed.map(c => {
                const paid = invoices.filter(i => i.client_id === c.id && i.status === 'paid').length
                const total = invoices.filter(i => i.client_id === c.id).length
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-s2/40 transition-colors group">
                    <td className="p-3 font-medium text-tx">{c.name}</td>
                    <td className="p-3 text-xs text-tx-3">{c.service || '—'}</td>
                    <td className="p-3 font-mono text-xs font-semibold text-info">
                      {fmt(c.monthly_retainer)}
                      {c.has_tvsh && !c.tvsh_included && (
                        <span className="text-tx-3 font-normal"> → {fmt(c.monthly_retainer * (1 + TVSH_RATE / 100))}</span>
                      )}
                      {c.has_tvsh && c.tvsh_included && (
                        <span className="text-tx-3 font-normal"> ({fmt(Math.round(c.monthly_retainer / (1 + TVSH_RATE / 100) * 100) / 100)} base)</span>
                      )}
                    </td>
                    <td className="p-3">
                      {!c.has_tvsh && <span className="badge bg-s3 text-tx-3 text-xs">Exempt</span>}
                      {c.has_tvsh && !c.tvsh_included && <span className="badge bg-warning/10 text-warning text-xs">+{TVSH_RATE}%</span>}
                      {c.has_tvsh && c.tvsh_included && <span className="badge bg-info/10 text-info text-xs">incl. TVSH</span>}
                    </td>
                    <td className="p-3">
                      <span className={`badge text-xs ${
                        c.status === 'active' ? 'bg-success/15 text-success' :
                        c.status === 'paused' ? 'bg-warning/15 text-warning' :
                        'bg-s3 text-tx-3'}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-tx-3 max-w-[140px] truncate">{c.notes || '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {total > 0 && (
                          <span className="text-[10px] text-tx-3 mr-1">{paid}/{total} paid</span>
                        )}
                        <button
                          onClick={() => { setEditClient(c); setShowForm(true) }}
                          className="p-1 rounded hover:bg-accent/10 text-tx-3 hover:text-accent transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {confirmDeleteId === c.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(c.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-danger text-white">Yes</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] px-1.5 py-0.5 rounded border border-border text-tx-3">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            className="p-1 rounded hover:bg-danger/10 text-tx-3 hover:text-danger transition-all"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
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

      {showForm && (
        <ClientFormModal
          edit={editClient}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditClient(undefined) }}
        />
      )}
    </div>
  )
}

// ── Pipeline tab ──────────────────────────────────────────────────────────

function PipelineTab({ offers }: { offers: PipelineOffer[] }) {
  const totalValue = (o: PipelineOffer) =>
    (o.services || []).reduce((s: number, sv: any) =>
      s + (sv.unit === 'month' ? sv.price * 6 : sv.price), 0)

  const fmt2 = (n: number) => new Intl.NumberFormat('en-EU', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-tx">Waiting for response</h3>
          <p className="text-xs text-tx-3 mt-0.5">{offers.length} offer{offers.length !== 1 ? 's' : ''} sent, awaiting decision</p>
        </div>
        <Link href="/offers" className="btn-ghost text-xs px-3 py-1.5">View all offers</Link>
      </div>

      {offers.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-tx-3 text-sm">No pending proposals</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-s2">
                  {['Client','Proposal','Value','Status','Sent','Days waiting',''].map(h => (
                    <th key={h} className="text-left p-3 text-xs text-tx-3 uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offers.map(o => {
                  const days = daysSince(o.sent_at || o.created_at)
                  const value = totalValue(o)
                  return (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-s2/40 transition-colors">
                      <td className="p-3 font-medium text-tx">{o.client_name}{o.client_company ? <span className="text-tx-3 font-normal"> · {o.client_company}</span> : ''}</td>
                      <td className="p-3 text-xs text-tx-3">{o.title}</td>
                      <td className="p-3 font-mono text-xs text-success font-semibold">{value > 0 ? fmt2(value) : '—'}</td>
                      <td className="p-3">
                        <span className={`badge text-xs ${o.status === 'viewed' ? 'bg-info/15 text-info' : 'bg-warning/15 text-warning'}`}>
                          {o.status === 'viewed' ? '👀 Viewed' : '📤 Sent'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-tx-3">{o.sent_at ? new Date(o.sent_at).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="p-3">
                        {days !== null && (
                          <span className={`text-xs font-medium ${days > 7 ? 'text-danger' : days > 3 ? 'text-warning' : 'text-tx-3'}`}>
                            {days}d
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Link href={`/offers/${o.id}`} className="text-[10px] px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 font-medium transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

type Tab = 'overview' | 'clients' | 'pipeline'

export default function FinanceClient({
  initialClients,
  initialInvoices,
  pipelineOffers,
}: {
  initialClients: FinanceClient[]
  initialInvoices: Invoice[]
  pipelineOffers: PipelineOffer[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [clients, setClients] = useState<FinanceClient[]>(initialClients)
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Monthly Overview' },
    { key: 'clients', label: `Clients (${clients.filter(c => c.status === 'active').length})` },
    { key: 'pipeline', label: `Pipeline (${pipelineOffers.length})` },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-tx">Finance</h1>
          <p className="text-tx-3 text-sm mt-0.5">Admin only · Retainers, invoices & proposals</p>
        </div>
        <span className="badge bg-accent/10 text-accent text-xs">👑 Admin</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-tx-3 hover:text-tx'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab clients={clients} invoices={invoices} setInvoices={setInvoices} />
      )}
      {activeTab === 'clients' && (
        <ClientsTab clients={clients} setClients={setClients} invoices={invoices} />
      )}
      {activeTab === 'pipeline' && (
        <PipelineTab offers={pipelineOffers} />
      )}
    </div>
  )
}
