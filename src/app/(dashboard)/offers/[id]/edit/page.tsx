import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Offer, Lead } from '@/types'
import OfferBuilder from '../../new/OfferBuilder'

export default async function EditOfferPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [{ data: offer }, { data: leads }] = await Promise.all([
    supabase.from('offers').select('*').eq('id', params.id).single(),
    supabase.from('leads').select('id, name, company, email').not('stage', 'in', '("Dead")').order('name'),
  ])

  if (!offer) notFound()

  return (
    <OfferBuilder
      existingOffer={offer as Offer}
      leads={(leads || []) as Pick<Lead, 'id' | 'name' | 'company' | 'email'>[]}
    />
  )
}
