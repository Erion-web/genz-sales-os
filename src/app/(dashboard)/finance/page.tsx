import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinanceClient from './FinanceClient'

export default async function FinancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  const [
    { data: clients },
    { data: invoices },
    { data: offers },
  ] = await Promise.all([
    supabase
      .from('finance_clients')
      .select('*')
      .order('name'),
    supabase
      .from('invoices')
      .select('*')
      .order('month', { ascending: false }),
    supabase
      .from('offers')
      .select('id, title, client_name, client_company, status, created_at, services, share_token, sent_at')
      .in('status', ['sent', 'viewed'])
      .order('sent_at', { ascending: false }),
  ])

  return (
    <FinanceClient
      initialClients={clients || []}
      initialInvoices={invoices || []}
      pipelineOffers={offers || []}
    />
  )
}
