import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Lead, Activity } from '@/types'
import LeadDetail from './LeadDetail'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: lead }, { data: activities }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', params.id).single(),
    supabase.from('activities').select('*').eq('lead_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!lead) notFound()

  return <LeadDetail lead={lead as Lead} activities={(activities || []) as Activity[]} />
}
