export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Always sync Google name/avatar from auth metadata so the sidebar stays fresh
  const meta = user.user_metadata ?? {}
  const full_name =
    meta.full_name ||
    meta.name ||
    (meta.given_name ? `${meta.given_name}${meta.family_name ? ' ' + meta.family_name : ''}` : null) ||
    existingProfile?.full_name ||
    user.email?.split('@')[0] ||
    'User'
  const avatar_url = meta.avatar_url || meta.picture || existingProfile?.avatar_url || null

  // Upsert so every page load keeps the profile in sync with Google
  const { data: profile } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, email: user.email, full_name, avatar_url },
      { onConflict: 'id' }
    )
    .select()
    .single()

  const merged: Profile = {
    ...(existingProfile ?? {}),
    ...(profile ?? {}),
    full_name,
    avatar_url,
  } as Profile

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar profile={merged} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
