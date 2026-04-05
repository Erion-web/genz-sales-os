import { createClient } from '@/lib/supabase/server'
import { Lead, Activity } from '@/types'
import StatsClient from './StatsClient'

export default async function StatsPage() {
  const supabase = createClient()

  const [{ data: leads }, { data: activities }, { data: profiles }] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('activities').select('*').order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, full_name'),
  ])

  return (
    <StatsClient
      leads={(leads || []) as Lead[]}
      activities={(activities || []) as Activity[]}
      profiles={(profiles || []) as { id: string; full_name: string | null }[]}
    />
  )
}
