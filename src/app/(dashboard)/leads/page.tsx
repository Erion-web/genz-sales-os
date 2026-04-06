import { createClient } from '@/lib/supabase/server'
import { Lead } from '@/types'
import LeadsClient from './LeadsClient'
import { redirect } from 'next/navigation'

export default async function LeadsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: leadsData }, { data: profile }] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  const isAdmin = profile?.role === 'admin'

  return <LeadsClient initialLeads={(leadsData || []) as Lead[]} isAdmin={isAdmin} />
}
