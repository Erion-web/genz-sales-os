import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Offer } from '@/types'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

const SERVICE_ICONS: Record<string, string> = {
  'Meta Ads Management': '📣',
  'Google Ads Management': '🔍',
  'TikTok Ads Management': '🎵',
  'Social Media Management': '📱',
  'Branding & Identity': '🎨',
  'Website Development': '💻',
  'E-Commerce Store': '🛒',
  'Marketing Automation': '⚡',
  'Video Production': '🎬',
  'SEO & Content': '📈',
}

function getIcon(name: string) {
  for (const key of Object.keys(SERVICE_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase().split(' ')[0].toLowerCase())) {
      return SERVICE_ICONS[key]
    }
  }
  return '✦'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PublicOfferPage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const { data } = await supabase
    .from('offers')
    .select('*')
    .eq('share_token', params.token)
    .single()

  if (!data) notFound()
  const offer = data as Offer

  // Mark as viewed if it was sent
  if (offer.status === 'sent') {
    await supabase.from('offers').update({ status: 'viewed' }).eq('id', offer.id)
  }

  const monthly = offer.services.filter(s => s.unit === 'month').reduce((sum, s) => sum + s.price, 0)
  const once = offer.services.filter(s => s.unit === 'once').reduce((sum, s) => sum + s.price, 0)

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800" style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #2563EB 100%)' }}
        className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #60A5FA 0%, transparent 50%), radial-gradient(circle at 80% 20%, #93C5FD 0%, transparent 50%)'
        }} />
        <div className="relative max-w-4xl mx-auto px-8 py-20 md:py-28 text-center">
          <div className="flex justify-center mb-8">
            <Image src="/logo.svg" alt="GENZ Digital" width={180} height={48} className="h-12 w-auto brightness-0 invert" />
          </div>
          <p className="text-blue-300 text-sm font-medium tracking-widest uppercase mb-4">Business Proposal</p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
            {offer.client_company || offer.client_name}
          </h1>
          <p className="text-blue-200 text-lg mb-8">Prepared exclusively for {offer.client_name}</p>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white/70 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {formatDate(offer.created_at)}
          </div>
        </div>
        {/* Wave bottom */}
        <div className="relative h-16">
          <svg viewBox="0 0 1440 64" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,64 C480,0 960,0 1440,64 L1440,64 L0,64 Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── ABOUT GENZ ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-3">Who we are</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-5 leading-tight">
              We grow brands with<br/>data-driven marketing.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-5">
              GENZ Digital is a full-service digital marketing agency specializing in performance advertising, branding, and growth strategy for ambitious businesses across the Balkans and beyond.
            </p>
            <p className="text-gray-500 leading-relaxed">
              We don't believe in guesswork. Every campaign we run is backed by real data, creative testing, and a relentless focus on results that matter — revenue, leads, and growth.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '50+', label: 'Clients Served' },
              { value: '€5M+', label: 'Ad Spend Managed' },
              { value: '3.8x', label: 'Average ROAS' },
              { value: '4 yrs', label: 'In Business' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-2xl p-5 text-center">
                <p className="text-3xl font-black text-blue-600 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR CLIENTS ─────────────────────────────────────────── */}
      {offer.client_logos.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-8">
            <p className="text-center text-xs font-bold tracking-widest uppercase text-gray-400 mb-10">
              Trusted by forward-thinking brands
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {offer.client_logos.map((logo, i) => (
                <div key={i} className="bg-white rounded-xl px-6 py-3 shadow-sm border border-gray-100 min-w-[120px] text-center">
                  {logo.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.logo_url} alt={logo.name} className="h-8 w-auto object-contain mx-auto" />
                  ) : (
                    <p className="text-sm font-bold text-gray-600 tracking-tight">{logo.name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GREETING ────────────────────────────────────────────── */}
      {offer.greeting && (
        <section className="max-w-3xl mx-auto px-8 py-16">
          <div className="bg-blue-50 rounded-3xl p-8 md:p-10 border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">G</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">GENZ Digital Team</p>
                <p className="text-xs text-gray-400">To {offer.client_name}</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]">{offer.greeting}</p>
          </div>
        </section>
      )}

      {/* ── SERVICES ────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-8 pb-16">
        <div className="text-center mb-12">
          <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-3">What we'll deliver</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Our proposal for you</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {offer.services.map((s, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getIcon(s.name)}</span>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{s.name}</h3>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-blue-600 font-black text-lg leading-none">€{s.price.toLocaleString()}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{s.unit === 'month' ? '/month' : 'one-time'}</p>
                </div>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INVESTMENT ──────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' }} className="py-16">
        <div className="max-w-3xl mx-auto px-8">
          <div className="text-center mb-10">
            <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-3">Investment</p>
            <h2 className="text-3xl font-black text-gray-900">Your total investment</h2>
          </div>
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-blue-100">
            <div className="divide-y divide-gray-100">
              {offer.services.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getIcon(s.name)}</span>
                    <span className="text-sm font-medium text-gray-700">{s.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">€{s.price.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-1">{s.unit === 'month' ? '/mo' : 'once'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 px-6 py-5 space-y-2">
              {monthly > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Monthly retainer</span>
                  <span className="text-xl font-black text-blue-600">€{monthly.toLocaleString()}<span className="text-sm font-normal text-gray-400">/mo</span></span>
                </div>
              )}
              {once > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">One-time setup</span>
                  <span className="text-xl font-black text-green-600">€{once.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── NEXT STEPS ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-3">What happens next</p>
          <h2 className="text-3xl font-black text-gray-900">3 steps to get started</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Review this proposal', desc: 'Take your time to go through the services and investment. Feel free to ask any questions.' },
            { step: '02', title: 'Schedule a call', desc: 'We\'ll get on a call to answer questions, align on goals, and confirm the scope of work.' },
            { step: '03', title: 'Let\'s get to work', desc: 'Once aligned, we kick off onboarding, set up accounts, and start building results from day one.' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ──────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)' }} className="py-16">
        <div className="max-w-2xl mx-auto px-8 text-center">
          <Image src="/logo.svg" alt="GENZ Digital" width={140} height={38} className="h-10 w-auto mx-auto mb-6 brightness-0 invert" />
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">Ready to grow your business?</h2>
          <p className="text-blue-200 mb-8">Reply to our email or reach out directly — we'd love to hear from you.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-blue-200">
            <a href="mailto:erion@gen-z.digital" className="flex items-center gap-2 hover:text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              erion@gen-z.digital
            </a>
            <span className="text-blue-700">·</span>
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              gen-z.digital
            </span>
          </div>
          <p className="text-blue-800 text-xs mt-8">© {new Date().getFullYear()} GENZ Digital. All rights reserved.</p>
        </div>
      </section>

    </div>
  )
}
