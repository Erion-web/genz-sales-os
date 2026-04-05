import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Lead } from '@/types'
import MyLeadsClient from './MyLeadsClient'

export default async function MyLeadsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: leads }, { data: profile }] = await Promise.all([
    supabase.from('leads').select('*').eq('owner_id', user.id).order('next_followup', { ascending: true }),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  return (
    <MyLeadsClient
      leads={(leads || []) as Lead[]}
      userName={profile?.full_name || user.email || 'You'}
    />
  )
}
