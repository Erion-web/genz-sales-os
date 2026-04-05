'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Profile } from '@/types'
import SearchModal from './SearchModal'
import NotificationsPanel from './NotificationsPanel'

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/':          { title: 'War Room',    sub: 'Your real-time sales command center' },
  '/pipeline':  { title: 'Pipeline',    sub: 'Manage your deals across all stages' },
  '/leads':     { title: 'All Leads',   sub: 'Every lead across the team' },
  '/my-leads':  { title: 'My Leads',    sub: 'Your personal pipeline & commission' },
  '/stats':     { title: 'Statistics',  sub: 'Performance analytics & leaderboard' },
  '/team':      { title: 'Team',        sub: 'Team overview & management' },
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatDateStable(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function Header({ profile, onMenuClick }: { profile: Profile | null; onMenuClick?: () => void }) {
  const pathname = usePathname()
  const meta = PAGE_META[pathname] ?? { title: 'GENZ Sales OS', sub: '' }
  const today = formatDateStable(new Date())

  const [searchOpen, setSearchOpen] = useState(false)

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-border px-4 md:px-6 h-14 md:h-16 flex items-center gap-3 md:gap-4">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-1 rounded-lg text-tx-3 hover:text-tx hover:bg-s2 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <h1 className="font-heading font-bold text-base md:text-lg text-tx leading-none">{meta.title}</h1>
            <span className="text-tx-3 text-xs hidden sm:block">{today}</span>
          </div>
        </div>

        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 bg-s2 border border-border rounded-xl px-3 py-2 w-56 hover:border-accent/40 transition-colors group"
        >
          <svg width="14" height="14" className="text-tx-3 group-hover:text-tx-2 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="text-tx-3 text-xs flex-1 text-left">Search leads...</span>
          <kbd className="text-tx-3 text-xs bg-s3 border border-border px-1.5 py-0.5 rounded-md font-mono">⌘K</kbd>
        </button>

        {/* Mobile search icon */}
        <button
          onClick={() => setSearchOpen(true)}
          className="md:hidden p-2 rounded-xl border border-border bg-s2 text-tx-3 hover:text-tx hover:border-accent/40 transition-all"
          aria-label="Search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        {/* Notification bell */}
        <NotificationsPanel />

        {/* Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name || 'User'}
              width={32}
              height={32}
              className="rounded-full ring-2 ring-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold ring-2 ring-border">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-tx leading-tight">
              {profile?.full_name?.split(' ')[0] || 'User'}
            </p>
            <p className="text-xs text-tx-3 leading-tight">{profile?.role === 'admin' ? 'Admin' : 'Sales'}</p>
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
