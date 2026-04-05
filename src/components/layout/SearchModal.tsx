'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead, getDealValue, formatCurrency, STAGE_COLORS, INTENT_COLORS } from '@/types'

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Fetch all leads once when modal opens
  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    setLoading(true)
    supabase
      .from('leads')
      .select('id, name, company, phone, email, stage, intent, deal_type, monthly, months, project, owner_name')
      .order('next_followup', { ascending: true })
      .then(({ data }) => {
        setLeads((data || []) as Lead[])
        setLoading(false)
      })
  }, [open])

  // Focus input when open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const results = query.trim()
    ? leads.filter(l => {
        const q = query.toLowerCase()
        return (
          l.name.toLowerCase().includes(q) ||
          (l.company || '').toLowerCase().includes(q) ||
          (l.phone || '').includes(q) ||
          (l.email || '').toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : leads.slice(0, 6)

  const navigate = useCallback((lead: Lead) => {
    router.push(`/leads/${lead.id}`)
    onClose()
  }, [router, onClose])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) navigate(results[selected])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, selected, navigate, onClose])

  useEffect(() => { setSelected(0) }, [query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <svg width="16" height="16" className="text-tx-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search leads by name, company, phone, email..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-tx placeholder:text-tx-3 p-0"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-tx-3 hover:text-tx transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
          <kbd className="text-tx-3 text-xs bg-s3 border border-border px-1.5 py-0.5 rounded font-mono shrink-0">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-tx-3 text-sm">Loading...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-tx-3 text-sm">
              {query ? `No leads matching "${query}"` : 'No leads yet'}
            </div>
          ) : (
            results.map((lead, i) => {
              const value = getDealValue(lead)
              return (
                <button
                  key={lead.id}
                  onClick={() => navigate(lead)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i === selected ? 'bg-accent/8' : 'hover:bg-s2'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-tx truncate">{lead.name}</p>
                    <p className="text-xs text-tx-3 truncate">{lead.company || lead.email || lead.phone || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {value > 0 && <span className="text-xs text-success font-mono hidden sm:block">{formatCurrency(value)}</span>}
                    <span className={`badge text-xs ${INTENT_COLORS[lead.intent]}`}>{lead.intent}</span>
                    <span className={`badge text-xs ${STAGE_COLORS[lead.stage]}`}>{lead.stage}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-tx-3">
            <span><kbd className="bg-s3 border border-border px-1 py-0.5 rounded font-mono">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-s3 border border-border px-1 py-0.5 rounded font-mono">↵</kbd> Open</span>
            <span className="ml-auto">{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
