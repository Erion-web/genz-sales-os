'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Offer, OfferStatus } from '@/types'

const STATUS_STYLES: Record<OfferStatus, string> = {
  draft:    'bg-s3 text-tx-3',
  sent:     'bg-info/10 text-info',
  viewed:   'bg-warning/10 text-warning',
  accepted: 'bg-success/10 text-success',
  declined: 'bg-danger/10 text-danger',
}

export default function OfferDetail({ offer }: { offer: Offer }) {
  const router = useRouter()
  const supabase = createClient()
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<OfferStatus>(offer.status)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/offer/${offer.share_token}`
    : `/offer/${offer.share_token}`

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const markSent = async () => {
    await supabase.from('offers').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', offer.id)
    setStatus('sent')
  }

  const updateStatus = async (s: OfferStatus) => {
    await supabase.from('offers').update({ status: s }).eq('id', offer.id)
    setStatus(s)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('offers').delete().eq('id', offer.id)
    router.push('/offers')
  }

  const monthly = offer.services.filter(s => s.unit === 'month').reduce((sum, s) => sum + s.price, 0)
  const once = offer.services.filter(s => s.unit === 'once').reduce((sum, s) => sum + s.price, 0)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/offers" className="text-tx-3 hover:text-tx transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </Link>
            <h1 className="font-heading text-xl font-bold text-tx">{offer.title}</h1>
            <span className={`badge text-xs capitalize ${STATUS_STYLES[status]}`}>{status}</span>
          </div>
          <p className="text-tx-3 text-sm ml-7">
            {offer.client_name}{offer.client_company ? ` · ${offer.client_company}` : ''}
            {offer.client_email ? ` · ${offer.client_email}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {status === 'draft' && (
            <button onClick={markSent} className="btn-primary text-sm">
              Mark as Sent
            </button>
          )}
          <Link href={`/offer/${offer.share_token}`} target="_blank" className="btn-ghost text-sm flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Preview
          </Link>
        </div>
      </div>

      {/* Share card */}
      <div className="card p-5 bg-accent/3 border-accent/20">
        <p className="text-xs font-medium text-tx-2 mb-2">Shareable link — send this to your client</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx-2 font-mono truncate">
            {shareUrl}
          </div>
          <button onClick={copyLink} className={`btn-primary text-xs shrink-0 ${copied ? 'bg-success hover:bg-success' : ''}`}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
          {offer.client_email && (
            <a
              href={`mailto:${offer.client_email}?subject=${encodeURIComponent(offer.title)}&body=${encodeURIComponent(`Hi ${offer.client_name},\n\nPlease find your proposal here:\n${shareUrl}\n\nLooking forward to your feedback!\n\nBest regards,\nGENZ Digital`)}`}
              className="btn-ghost text-xs shrink-0"
            >
              Send email
            </a>
          )}
        </div>
      </div>

      {/* Status update */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-tx mb-3">Update status</p>
        <div className="flex flex-wrap gap-2">
          {(['draft', 'sent', 'viewed', 'accepted', 'declined'] as OfferStatus[]).map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`badge text-xs capitalize cursor-pointer transition-all border ${
                status === s
                  ? STATUS_STYLES[s] + ' border-current/30 scale-105'
                  : 'bg-s3 text-tx-3 border-transparent hover:bg-s2'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-heading font-semibold text-sm text-tx">Services in this proposal</h3>
        </div>
        <div className="divide-y divide-border">
          {offer.services.map((s, i) => (
            <div key={i} className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-tx">{s.name}</p>
                <p className="text-xs text-tx-3 mt-0.5">{s.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-accent">€{s.price.toLocaleString()}</p>
                <p className="text-xs text-tx-3">{s.unit === 'month' ? '/month' : 'one-time'}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-s2 flex justify-end gap-6 text-sm border-t border-border">
          {monthly > 0 && <span className="text-tx-2">Monthly retainer: <span className="font-bold text-accent">€{monthly.toLocaleString()}/mo</span></span>}
          {once > 0 && <span className="text-tx-2">One-time: <span className="font-bold text-success">€{once.toLocaleString()}</span></span>}
        </div>
      </div>

      {/* Delete */}
      <div className="flex justify-end pt-2">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-tx-3 hover:text-danger transition-colors">
            Delete offer
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-tx-3">Are you sure?</span>
            <button onClick={handleDelete} disabled={deleting} className="text-xs text-danger font-medium hover:underline">
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-tx-3 hover:text-tx">Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
