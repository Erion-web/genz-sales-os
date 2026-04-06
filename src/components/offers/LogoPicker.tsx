'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OfferClientLogo } from '@/types'

interface LibraryLogo {
  id: string
  name: string
  logo_url: string | null
}

interface Props {
  selected: OfferClientLogo[]
  onChange: (logos: OfferClientLogo[]) => void
}

export default function LogoPicker({ selected, onChange }: Props) {
  const [library, setLibrary] = useState<LibraryLogo[]>([])
  const [newName, setNewName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [adding, setAdding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('logo_library').select('*').order('name').then(({ data }) => {
      setLibrary((data || []) as LibraryLogo[])
    })
  }, [])

  const isSelected = (lib: LibraryLogo) =>
    selected.some(s => s.name === lib.name)

  const toggle = (lib: LibraryLogo) => {
    if (isSelected(lib)) {
      onChange(selected.filter(s => s.name !== lib.name))
    } else {
      onChange([...selected, { name: lib.name, logo_url: lib.logo_url || undefined }])
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, logoId?: string) => {
    const file = e.target.files?.[0]
    if (!file || !newName.trim()) { alert('Enter a client name first'); return }
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `logos/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('client-logos').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('client-logos').getPublicUrl(path)

    if (logoId) {
      // Update existing
      await supabase.from('logo_library').update({ logo_url: publicUrl }).eq('id', logoId)
      setLibrary(prev => prev.map(l => l.id === logoId ? { ...l, logo_url: publicUrl } : l))
      onChange(selected.map(s => s.name === library.find(l => l.id === logoId)?.name ? { ...s, logo_url: publicUrl } : s))
    } else {
      // Create new entry
      const { data } = await supabase.from('logo_library').insert({ name: newName.trim(), logo_url: publicUrl }).select().single()
      if (data) {
        const entry = data as LibraryLogo
        setLibrary(prev => [...prev, entry].sort((a, b) => a.name.localeCompare(b.name)))
        onChange([...selected, { name: entry.name, logo_url: entry.logo_url || undefined }])
        setNewName('')
        setAdding(false)
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  const addNameOnly = async () => {
    if (!newName.trim()) return
    const { data } = await supabase.from('logo_library').insert({ name: newName.trim() }).select().single()
    if (data) {
      const entry = data as LibraryLogo
      setLibrary(prev => [...prev, entry].sort((a, b) => a.name.localeCompare(b.name)))
      onChange([...selected, { name: entry.name }])
      setNewName('')
      setAdding(false)
    }
  }

  const deleteLogo = async (lib: LibraryLogo) => {
    await supabase.from('logo_library').delete().eq('id', lib.id)
    setLibrary(prev => prev.filter(l => l.id !== lib.id))
    onChange(selected.filter(s => s.name !== lib.name))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-tx">Client logo library</p>
        <button onClick={() => setAdding(a => !a)} className="btn-ghost text-xs px-3 py-1.5">
          {adding ? 'Cancel' : '+ Add client'}
        </button>
      </div>

      {/* Add new */}
      {adding && (
        <div className="card p-4 space-y-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Client name (e.g. Nike Albania)"
            className="text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!newName.trim() || uploading}
              className="btn-primary text-xs flex-1"
            >
              {uploading ? 'Uploading...' : '↑ Upload logo image'}
            </button>
            <button
              onClick={addNameOnly}
              disabled={!newName.trim()}
              className="btn-ghost text-xs"
            >
              Name only
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      )}

      {/* Library grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {library.map(lib => {
          const sel = isSelected(lib)
          return (
            <div
              key={lib.id}
              className={`relative group rounded-xl border-2 transition-all cursor-pointer ${
                sel ? 'border-accent bg-accent/5' : 'border-border hover:border-border-2 bg-s2'
              }`}
              onClick={() => toggle(lib)}
            >
              <div className="p-3 flex flex-col items-center gap-2 min-h-[72px] justify-center">
                {lib.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lib.logo_url} alt={lib.name} className="h-8 max-w-full object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-s3 flex items-center justify-center">
                    <svg width="14" height="14" className="text-tx-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                )}
                <p className="text-xs font-medium text-tx text-center leading-tight line-clamp-2">{lib.name}</p>
              </div>

              {/* Checkmark */}
              {sel && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}

              {/* Actions on hover */}
              <div className="absolute bottom-1 right-1 hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
                <label title="Upload logo" className="w-5 h-5 bg-surface border border-border rounded cursor-pointer flex items-center justify-center text-tx-3 hover:text-accent transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { setNewName(lib.name); handleUpload(e, lib.id) }} />
                </label>
                <button title="Remove from library" onClick={() => deleteLogo(lib)} className="w-5 h-5 bg-surface border border-border rounded flex items-center justify-center text-tx-3 hover:text-danger transition-colors">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {library.length === 0 && !adding && (
        <p className="text-xs text-tx-3 text-center py-4">No logos in library yet. Add your first client above.</p>
      )}

      <p className="text-xs text-tx-3">{selected.length} logo{selected.length !== 1 ? 's' : ''} selected for this proposal</p>
    </div>
  )
}
