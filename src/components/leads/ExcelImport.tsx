'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Stage, Source, Intent, Service, STAGES, SOURCES, INTENTS, SERVICES } from '@/types'
import { useRouter } from 'next/navigation'

interface Row {
  name: string
  company: string
  phone: string
  email: string
  deal_type: string
  monthly: string
  months: string
  project: string
  source: string
  stage: string
  intent: string
  services: string
  next_followup: string
  last_contact: string
  owner_name: string
  _valid: boolean
  _errors: string[]
}

const TEMPLATE_HEADERS = [
  'Name', 'Company', 'Phone', 'Email',
  'Deal Type (retainer/project)', 'Monthly €', 'Months', 'Project €',
  'Source', 'Stage', 'Intent (cold/warm/hot/urgent)',
  'Services (comma-separated)', 'Next Follow-up (YYYY-MM-DD)',
  'Last Contact (YYYY-MM-DD)', 'Owner Name',
]

const EXAMPLE_ROW = [
  'John Smith', 'Acme Ltd', '+355 69 123 4567', 'john@acme.com',
  'retainer', '2000', '6', '',
  'Instagram', 'Contacted', 'warm',
  'Meta Ads, Social Media', '2024-04-10',
  '2024-04-01', 'Erion',
]

function downloadTemplate() {
  import('xlsx').then(XLSX => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, EXAMPLE_ROW])

    // Column widths
    ws['!cols'] = TEMPLATE_HEADERS.map(h => ({ wch: Math.max(h.length, 18) }))

    // Style header row (xlsx community edition doesn't support cell styles, but we mark it)
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Import')

    // Add a helper sheet with valid values
    const helpData = [
      ['Field', 'Valid values'],
      ['Deal Type', 'retainer, project'],
      ['Source', SOURCES.join(', ')],
      ['Stage', STAGES.join(', ')],
      ['Intent', INTENTS.join(', ')],
      ['Services', SERVICES.join(', ')],
      ['Date format', 'YYYY-MM-DD  (e.g. 2024-04-15)'],
    ]
    const wsHelp = XLSX.utils.aoa_to_sheet(helpData)
    wsHelp['!cols'] = [{ wch: 14 }, { wch: 80 }]
    XLSX.utils.book_append_sheet(wb, wsHelp, 'Valid Values')

    XLSX.writeFile(wb, 'genz-leads-import-template.xlsx')
  })
}

function validateRow(raw: Record<string, string>): Row {
  const errors: string[] = []

  const name = (raw['Name'] || raw['name'] || '').trim()
  if (!name) errors.push('Name required')

  const next_followup = (raw['Next Follow-up (YYYY-MM-DD)'] || raw['next_followup'] || '').trim()
  if (!next_followup) errors.push('Next Follow-up required')
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(next_followup)) errors.push('Next Follow-up must be YYYY-MM-DD')

  const deal_type = (raw['Deal Type (retainer/project)'] || raw['deal_type'] || 'retainer').trim().toLowerCase()
  if (deal_type && !['retainer', 'project'].includes(deal_type)) errors.push('Deal Type must be retainer or project')

  const stage = (raw['Stage'] || raw['stage'] || 'New').trim()
  if (stage && !(STAGES as string[]).includes(stage)) errors.push(`Stage must be one of: ${STAGES.join(', ')}`)

  const intent = (raw['Intent (cold/warm/hot/urgent)'] || raw['intent'] || 'cold').trim().toLowerCase()
  if (intent && !(INTENTS as string[]).includes(intent)) errors.push(`Intent must be one of: ${INTENTS.join(', ')}`)

  return {
    name,
    company: (raw['Company'] || raw['company'] || '').trim(),
    phone: (raw['Phone'] || raw['phone'] || '').trim(),
    email: (raw['Email'] || raw['email'] || '').trim(),
    deal_type,
    monthly: (raw['Monthly €'] || raw['monthly'] || '').toString().trim(),
    months: (raw['Months'] || raw['months'] || '6').toString().trim(),
    project: (raw['Project €'] || raw['project'] || '').toString().trim(),
    source: (raw['Source'] || raw['source'] || '').trim(),
    stage: stage || 'New',
    intent: intent || 'cold',
    services: (raw['Services (comma-separated)'] || raw['services'] || '').trim(),
    next_followup,
    last_contact: (raw['Last Contact (YYYY-MM-DD)'] || raw['last_contact'] || '').trim(),
    owner_name: (raw['Owner Name'] || raw['owner_name'] || '').trim(),
    _valid: errors.length === 0,
    _errors: errors,
  }
}

export default function ExcelImport({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
    setRows(raw.map(validateRow))
    setDone(false)
    setImportErrors([])
  }

  const handleImport = async () => {
    const valid = rows.filter(r => r._valid)
    if (valid.length === 0) return
    setImporting(true)

    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    const errs: string[] = []

    for (const row of valid) {
      const services = row.services
        ? row.services.split(',').map(s => s.trim()).filter(s => (SERVICES as string[]).includes(s))
        : null

      const { error } = await supabase.from('leads').insert({
        name: row.name,
        company: row.company || null,
        phone: row.phone || null,
        email: row.email || null,
        deal_type: (['retainer', 'project'].includes(row.deal_type) ? row.deal_type : 'retainer') as 'retainer' | 'project',
        monthly: row.deal_type === 'retainer' && row.monthly ? parseFloat(row.monthly) : null,
        months: row.deal_type === 'retainer' && row.months ? parseInt(row.months) : 6,
        project: row.deal_type === 'project' && row.project ? parseFloat(row.project) : null,
        source: (SOURCES as string[]).includes(row.source) ? row.source as Source : null,
        stage: (STAGES as string[]).includes(row.stage) ? row.stage as Stage : 'New',
        intent: (INTENTS as string[]).includes(row.intent) ? row.intent as Intent : 'cold',
        services: services && services.length > 0 ? services as Service[] : null,
        meetings: { meeting1: null, meeting2: null, meeting3: null },
        next_followup: row.next_followup,
        last_contact: row.last_contact || null,
        owner_name: row.owner_name || null,
        owner_id: userId,
      })
      if (error) errs.push(`${row.name}: ${error.message}`)
    }

    setImportErrors(errs)
    setImporting(false)
    setDone(true)
    if (errs.length === 0) {
      setTimeout(() => { router.refresh(); onDone() }, 1200)
    }
  }

  const validCount = rows.filter(r => r._valid).length
  const invalidCount = rows.filter(r => !r._valid).length

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl my-6 card">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-heading text-lg font-semibold text-tx">Import Leads from Excel</h2>
            <p className="text-xs text-tx-3 mt-0.5">Upload a .xlsx file to bulk-import leads</p>
          </div>
          <button onClick={onDone} className="text-tx-3 hover:text-tx transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Download template */}
          <div className="bg-s2 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center text-success text-xl shrink-0">
              📥
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-tx">Step 1 — Download the template</p>
              <p className="text-xs text-tx-3 mt-0.5">Fill it in with your existing leads, then upload below</p>
            </div>
            <button onClick={downloadTemplate} className="btn-ghost text-xs px-4 py-2 shrink-0">
              Download Template
            </button>
          </div>

          {/* Step 2: Upload */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-accent rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm text-tx group-hover:text-accent transition-colors">
              Click to upload your .xlsx file
            </p>
            <p className="text-xs text-tx-3 mt-1">Supports .xlsx and .xls</p>
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="badge bg-success/10 text-success">{validCount} valid</span>
                  {invalidCount > 0 && <span className="badge bg-danger/10 text-danger">{invalidCount} errors</span>}
                  <span className="text-xs text-tx-3">{rows.length} total rows</span>
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing || validCount === 0 || done}
                  className="btn-primary text-sm"
                >
                  {importing ? 'Importing...' : done ? '✓ Done' : `Import ${validCount} leads`}
                </button>
              </div>

              {done && importErrors.length === 0 && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
                  ✓ Successfully imported {validCount} leads
                </div>
              )}
              {importErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm space-y-1">
                  <p className="font-medium">Some rows failed:</p>
                  {importErrors.map((e, i) => <p key={i} className="text-xs">• {e}</p>)}
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-s2 border-b border-border">
                      <th className="text-left p-2 text-tx-3">Status</th>
                      <th className="text-left p-2 text-tx-3">Name</th>
                      <th className="text-left p-2 text-tx-3">Company</th>
                      <th className="text-left p-2 text-tx-3">Phone</th>
                      <th className="text-left p-2 text-tx-3">Deal</th>
                      <th className="text-left p-2 text-tx-3">Stage</th>
                      <th className="text-left p-2 text-tx-3">Intent</th>
                      <th className="text-left p-2 text-tx-3">Follow-up</th>
                      <th className="text-left p-2 text-tx-3">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={`border-b border-border last:border-0 ${row._valid ? '' : 'bg-danger/5'}`}>
                        <td className="p-2">
                          {row._valid
                            ? <span className="badge bg-success/10 text-success">✓</span>
                            : <span className="badge bg-danger/10 text-danger" title={row._errors.join(', ')}>
                                ✗ {row._errors[0]}
                              </span>
                          }
                        </td>
                        <td className="p-2 font-medium text-tx">{row.name || '—'}</td>
                        <td className="p-2 text-tx-3">{row.company || '—'}</td>
                        <td className="p-2 text-tx-3">{row.phone || '—'}</td>
                        <td className="p-2 text-tx-3">
                          {row.deal_type === 'retainer'
                            ? `€${row.monthly}/mo × ${row.months}mo`
                            : row.project ? `€${row.project}` : '—'}
                        </td>
                        <td className="p-2 text-tx-3">{row.stage}</td>
                        <td className="p-2 text-tx-3">{row.intent}</td>
                        <td className="p-2 text-tx-3">{row.next_followup || '—'}</td>
                        <td className="p-2 text-tx-3">{row.owner_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
