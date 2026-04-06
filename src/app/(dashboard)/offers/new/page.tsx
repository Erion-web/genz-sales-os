import { createClient } from '@/lib/supabase/server'
import { Lead } from '@/types'
import OfferBuilder from './OfferBuilder'

export default async function NewOfferPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('leads')
    .select('id, name, company, email')
    .not('stage', 'in', '("Dead")')
    .order('name', { ascending: true })

  return <OfferBuilder leads={(data || []) as Pick<Lead, 'id' | 'name' | 'company' | 'email'>[]} />
}
