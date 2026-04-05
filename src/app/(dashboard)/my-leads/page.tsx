import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Lead, Activity, getDealValue, formatCurrency, formatDate, STAGE_COLORS, INTENT_COLORS } from '@/types'
import MyLeadsClient from './MyLeadsClient'

export default async function MyLeadsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: leads }, { data: activities }, { data: profile }] = await Promise.all([
    supabase.from('leads').select('*').eq('owner_id', user.id).order('next_followup', { ascending: true }),
    supabase.from('activities').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  return (
    <MyLeadsClient
      leads={(leads || []) as Lead[]}
      activities={(activities || []) as Activity[]}
      userName={profile?.full_name || user.email || 'You'}
    />
  )
}
