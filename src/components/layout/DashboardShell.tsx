'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import RealtimeRefresher from './RealtimeRefresher'
import { Profile } from '@/types'

export default function DashboardShell({
  profile,
  children,
}: {
  profile: Profile | null
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar profile={profile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
      <RealtimeRefresher />
    </div>
  )
}
