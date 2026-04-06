'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OfferService, OfferClientLogo, Lead } from '@/types'

const SERVICE_TEMPLATES: OfferService[] = [
  { name: 'Meta Ads Management', description: 'Full campaign management across Facebook & Instagram. Strategy, creatives, A/B testing, and monthly reporting.', price: 500, unit: 'month' },
  { name: 'Google Ads Management', description: 'Google Search, Display & Shopping campaign setup and ongoing optimization for maximum ROI.', price: 400, unit: 'month' },
  { name: 'TikTok Ads Management', description: 'TikTok advertising campaigns tailored to your audience. Content strategy, ad creation, and performance analysis.', price: 400, unit: 'month' },
  { name: 'Social Media Management', description: 'Daily content creation, scheduling, and community management across your social platforms.', price: 600, unit: 'month' },
  { name: 'Branding & Identity', description: 'Complete brand identity design — logo, colors, typography, brand guidelines document.', price: 1500, unit: 'once' },
  { name: 'Website Development', description: 'Custom website design and development. Mobile-first, fast, conversion-optimized.', price: 2500, unit: 'once' },
  { name: 'E-Commerce Store', description: 'Full e-commerce store setup with product catalog, payment integration, and SEO optimization.', price: 3000, unit: 'once' },
  { name: 'Marketing Automation', description: 'Email sequences, CRM setup, lead scoring, and automated follow-up flows.', price: 1200, unit: 'once' },
  { name: 'Video Production', description: 'Professional video ads, reels, and content creation for social media and digital advertising.', price: 800, unit: 'month' },
  { name: 'SEO & Content', description: 'Search engine optimization, keyword strategy, content calendar, and monthly blog posts.', price: 500, unit: 'month' },
]

const DEFAULT_LOGOS: OfferClientLogo[] = [
  { name: 'Nourish Albania' },
  { name: 'Vitrina Store' },
  { name: 'Sezoni' },
  { name: 'ProSport' },
  { name: 'Delta City' },
  { name: 'Klan Media' },
]

interface Step1Data {
  lead_id: string
  client_name: string
  client_company: string
  client_email: string
  greeting: string
}

interface Props {
  leads: Pick<Lead, 'id' | 'name' | 'company' | 'email'>[]
}

export default function OfferBuilder({ leads }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [step1, setStep1] = useState<Step1Data>({
    lead_id: '', client_name: '', client_company: '', client_email: '', greeting: '',
  })

  // Step 2 — services
  const [services, setServices] = useState<OfferService[]>([])
  const [customService, setCustomService] = useState<OfferService>({ name: '', description: '', price: 0, unit: 'month' })
  const [addingCustom, setAddingCustom] = useState(false)

  // Step 3 — client logos
  const [logos, setLogos] = useState<OfferClientLogo[]>(DEFAULT_LOGOS)
  const [newLogoName, setNewLogoName] = useState('')
  const [newLogoUrl, setNewLogoUrl] = useState('')

  // Autofill from lead
  const handleLeadSelect = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (lead) {
      setStep1(s => ({
        ...s,
        lead_id: leadId,
        client_name: lead.name,
        client_company: lead.company || '',
        client_email: lead.email || '',
      }))
    } else {
      setStep1(s => ({ ...s, lead_id: '' }))
    }
  }

  const toggleTemplate = (tpl: OfferService) => {
    const exists = services.find(s => s.name === tpl.name)
    if (exists) {
      setServices(prev => prev.filter(s => s.name !== tpl.name))
    } else {
      setServices(prev => [...prev, { ...tpl }])
    }
  }

  const updateService = (i: number, field: keyof OfferService, value: string | number) => {
    setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  const addCustomService = () => {
    if (!customService.name) return
    setServices(prev => [...prev, { ...customService }])
    setCustomService({ name: '', description: '', price: 0, unit: 'month' })
    setAddingCustom(false)
  }

  const addLogo = () => {
    if (!newLogoName.trim()) return
    setLogos(prev => [...prev, { name: newLogoName.trim(), logo_url: newLogoUrl.trim() || undefined }])
    setNewLogoName('')
    setNewLogoUrl('')
  }

  const total = services.reduce((sum, s) => {
    if (s.unit === 'month') return sum + s.price
    return sum
  }, 0)
  const totalOnce = services.reduce((sum, s) => {
    if (s.unit === 'once') return sum + s.price
    return sum
  }, 0)

  const handleSave = async (sendNow = false) => {
    setSaving(true)
    const { data, error } = await supabase.from('offers').insert({
      lead_id: step1.lead_id || null,
      title: step1.client_company
        ? `Proposal for ${step1.client_company}`
        : `Proposal for ${step1.client_name}`,
      status: sendNow ? 'sent' : 'draft',
      client_name: step1.client_name,
      client_company: step1.client_company || null,
      client_email: step1.client_email || null,
      greeting: step1.greeting || null,
      services,
      client_logos: logos,
      deal_type: services.some(s => s.unit === 'month') ? 'retainer' : 'project',
      sent_at: sendNow ? new Date().toISOString() : null,
    }).select().single()

    setSaving(false)
    if (error || !data) { alert('Failed to save: ' + error?.message); return }
    router.push(`/offers/${data.id}`)
  }

  const steps = ['Client', 'Services', 'Logos & Send']

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((label, i) => {
          const num = i + 1
          const done = step > num
          const active = step === num
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  done ? 'bg-success text-white' : active ? 'bg-accent text-white' : 'bg-s3 text-tx-3'
                }`}>
                  {done ? '✓' : num}
                </div>
                <span className={`text-sm hidden sm:block ${active ? 'text-tx font-medium' : 'text-tx-3'}`}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${done ? 'bg-success' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Client info ────────────────────────────────── */}
      {step === 1 && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="font-heading text-xl font-bold text-tx">Who is this proposal for?</h2>
            <p className="text-tx-3 text-sm mt-1">Link to an existing lead or enter client details manually.</p>
          </div>

          {leads.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-tx-2 mb-1.5">Link to existing lead (optional)</label>
              <select value={step1.lead_id} onChange={e => handleLeadSelect(e.target.value)} className="text-sm">
                <option value="">— Select a lead —</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name}{l.company ? ` · ${l.company}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-tx-2 mb-1.5">Client name *</label>
              <input value={step1.client_name} onChange={e => setStep1(s => ({ ...s, client_name: e.target.value }))} placeholder="John Smith" className="text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-tx-2 mb-1.5">Company</label>
              <input value={step1.client_company} onChange={e => setStep1(s => ({ ...s, client_company: e.target.value }))} placeholder="Acme SRL" className="text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-tx-2 mb-1.5">Client email</label>
              <input type="email" value={step1.client_email} onChange={e => setStep1(s => ({ ...s, client_email: e.target.value }))} placeholder="client@company.com" className="text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-tx-2 mb-1.5">Personalized greeting</label>
              <textarea
                rows={4}
                value={step1.greeting}
                onChange={e => setStep1(s => ({ ...s, greeting: e.target.value }))}
                placeholder={`Dear ${step1.client_name || '[Client]'},\n\nThank you for your time. We have prepared this proposal specifically for your business...`}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!step1.client_name.trim()}
              className="btn-primary"
            >
              Next: Services →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Services ───────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-heading text-xl font-bold text-tx">What are you offering?</h2>
            <p className="text-tx-3 text-sm mt-1">Pick from templates or add custom services. Edit prices as needed.</p>
          </div>

          {/* Templates grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICE_TEMPLATES.map(tpl => {
              const selected = services.some(s => s.name === tpl.name)
              return (
                <button
                  key={tpl.name}
                  onClick={() => toggleTemplate(tpl)}
                  className={`card p-4 text-left transition-all ${
                    selected ? 'border-accent/60 bg-accent/5' : 'hover:border-border-2'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-tx">{tpl.name}</p>
                      <p className="text-xs text-tx-3 mt-0.5 line-clamp-2">{tpl.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-accent">€{tpl.price.toLocaleString()}</p>
                      <p className="text-xs text-tx-3">{tpl.unit === 'month' ? '/mo' : 'once'}</p>
                    </div>
                  </div>
                  {selected && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-accent font-medium">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Added
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Custom service */}
          {!addingCustom ? (
            <button onClick={() => setAddingCustom(true)} className="btn-ghost w-full justify-center">
              + Add custom service
            </button>
          ) : (
            <div className="card p-4 space-y-3">
              <p className="text-sm font-medium text-tx">Custom service</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={customService.name} onChange={e => setCustomService(s => ({ ...s, name: e.target.value }))} placeholder="Service name" className="text-sm" />
                <div className="flex gap-2">
                  <input type="number" value={customService.price || ''} onChange={e => setCustomService(s => ({ ...s, price: +e.target.value }))} placeholder="Price €" className="text-sm flex-1" />
                  <select value={customService.unit} onChange={e => setCustomService(s => ({ ...s, unit: e.target.value as 'month' | 'once' }))} className="text-sm w-28">
                    <option value="month">/month</option>
                    <option value="once">one-time</option>
                  </select>
                </div>
                <textarea rows={2} value={customService.description} onChange={e => setCustomService(s => ({ ...s, description: e.target.value }))} placeholder="Description..." className="text-sm sm:col-span-2 resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={addCustomService} className="btn-primary text-sm">Add</button>
                <button onClick={() => setAddingCustom(false)} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Selected services editable */}
          {services.length > 0 && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-tx mb-3">Selected services ({services.length})</p>
              <div className="space-y-3">
                {services.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-s2 rounded-lg">
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input value={s.name} onChange={e => updateService(i, 'name', e.target.value)} className="text-xs sm:col-span-2" />
                      <div className="flex gap-1">
                        <input type="number" value={s.price} onChange={e => updateService(i, 'price', +e.target.value)} className="text-xs flex-1" />
                        <select value={s.unit} onChange={e => updateService(i, 'unit', e.target.value)} className="text-xs w-20">
                          <option value="month">/mo</option>
                          <option value="once">once</option>
                        </select>
                      </div>
                      <textarea rows={2} value={s.description} onChange={e => updateService(i, 'description', e.target.value)} className="text-xs sm:col-span-3 resize-none" />
                    </div>
                    <button onClick={() => setServices(prev => prev.filter((_, idx) => idx !== i))} className="text-tx-3 hover:text-danger transition-colors p-1 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-end gap-6 text-sm">
                {total > 0 && <span className="text-tx-2">Monthly: <span className="font-bold text-accent">€{total.toLocaleString()}/mo</span></span>}
                {totalOnce > 0 && <span className="text-tx-2">One-time: <span className="font-bold text-success">€{totalOnce.toLocaleString()}</span></span>}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="btn-ghost">← Back</button>
            <button onClick={() => setStep(3)} disabled={services.length === 0} className="btn-primary">
              Next: Logos & Send →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Logos & Send ───────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-heading text-xl font-bold text-tx">Client logos & send</h2>
            <p className="text-tx-3 text-sm mt-1">These will appear in the "Our Clients" section of the proposal.</p>
          </div>

          {/* Logo list */}
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-tx">Client logos shown in proposal</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {logos.map((l, i) => (
                <div key={i} className="flex items-center gap-2 bg-s2 rounded-lg px-3 py-2">
                  {l.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.logo_url} alt={l.name} className="h-6 w-auto object-contain" />
                  ) : (
                    <span className="text-xs font-semibold text-tx-2 flex-1 truncate">{l.name}</span>
                  )}
                  <button onClick={() => setLogos(prev => prev.filter((_, idx) => idx !== i))} className="text-tx-3 hover:text-danger transition-colors shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input value={newLogoName} onChange={e => setNewLogoName(e.target.value)} placeholder="Client name" className="text-xs flex-1" />
              <input value={newLogoUrl} onChange={e => setNewLogoUrl(e.target.value)} placeholder="Logo URL (optional)" className="text-xs flex-1" />
              <button onClick={addLogo} className="btn-ghost text-xs px-3">Add</button>
            </div>
          </div>

          {/* Summary */}
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-tx">Proposal summary</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-tx-3">Client</p>
                <p className="font-medium text-tx">{step1.client_name}</p>
                {step1.client_company && <p className="text-xs text-tx-3">{step1.client_company}</p>}
              </div>
              <div>
                <p className="text-xs text-tx-3">Services</p>
                <p className="font-medium text-tx">{services.length} service{services.length !== 1 ? 's' : ''}</p>
              </div>
              {total > 0 && (
                <div>
                  <p className="text-xs text-tx-3">Monthly</p>
                  <p className="font-bold text-accent">€{total.toLocaleString()}/mo</p>
                </div>
              )}
              {totalOnce > 0 && (
                <div>
                  <p className="text-xs text-tx-3">One-time</p>
                  <p className="font-bold text-success">€{totalOnce.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2 gap-3">
            <button onClick={() => setStep(2)} className="btn-ghost">← Back</button>
            <div className="flex gap-3">
              <button onClick={() => handleSave(false)} disabled={saving} className="btn-ghost">
                {saving ? 'Saving...' : 'Save as draft'}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary">
                {saving ? 'Creating...' : '✓ Create & get link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
