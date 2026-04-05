import { createClient } from '@/lib/supabase/server'
import { Lead } from '@/types'
import LeadsClient from './LeadsClient'

export default async function LeadsPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return <LeadsClient initialLeads={(data || []) as Lead[]} />
}
