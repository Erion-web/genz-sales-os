import { createClient } from '@/lib/supabase/server'
import { Offer, OfferStatus } from '@/types'
import Link from 'next/link'

const STATUS_STYLES: Record<OfferStatus, string> = {
  draft:    'bg-s3 text-tx-3',
  sent:     'bg-info/10 text-info',
  viewed:   'bg-warning/10 text-warning',
  accepted: 'bg-success/10 text-success',
  declined: 'bg-danger/10 text-danger',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function OffersPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false })

  const offers = (data || []) as Offer[]

  const stats = {
    total: offers.length,
    sent: offers.filter(o => o.status === 'sent' || o.status === 'viewed').length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    monthly: offers.filter(o => o.status === 'accepted').reduce((sum, o) =>
      sum + o.services.filter(s => s.unit === 'month').reduce((s, sv) => s + sv.price, 0), 0),
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-tx">Offer Creator</h1>
          <p className="text-tx-3 text-sm mt-0.5">Build and send professional proposals to your clients</p>
        </div>
        <Link href="/offers/new" className="btn-primary">
          + New Proposal
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Total</p>
          <p className="font-heading text-2xl font-bold text-tx mt-1">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Sent</p>
          <p className="font-heading text-2xl font-bold text-info mt-1">{stats.sent}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">Accepted</p>
          <p className="font-heading text-2xl font-bold text-success mt-1">{stats.accepted}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-tx-3 uppercase tracking-wider">MRR Won</p>
          <p className="font-heading text-2xl font-bold text-accent mt-1">€{stats.monthly.toLocaleString()}</p>
        </div>
      </div>

      {/* List */}
      {offers.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" className="text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-tx text-lg mb-1">No proposals yet</h3>
          <p className="text-tx-3 text-sm mb-5">Create your first professional proposal and impress your clients.</p>
          <Link href="/offers/new" className="btn-primary inline-flex">+ New Proposal</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-border">
            {offers.map(offer => {
              const monthly = offer.services.filter(s => s.unit === 'month').reduce((sum, s) => sum + s.price, 0)
              const once = offer.services.filter(s => s.unit === 'once').reduce((sum, s) => sum + s.price, 0)
              return (
                <Link key={offer.id} href={`/offers/${offer.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-s2 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-tx group-hover:text-accent transition-colors truncate">{offer.title}</p>
                    <p className="text-xs text-tx-3 truncate">
                      {offer.client_name}{offer.client_company ? ` · ${offer.client_company}` : ''} · {formatDate(offer.created_at)}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    {monthly > 0 && <span className="text-xs font-mono text-accent">€{monthly.toLocaleString()}/mo</span>}
                    {once > 0 && <span className="text-xs font-mono text-success">€{once.toLocaleString()}</span>}
                    <span className={`badge text-xs capitalize ${STATUS_STYLES[offer.status]}`}>{offer.status}</span>
                  </div>
                  <svg width="14" height="14" className="text-tx-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
