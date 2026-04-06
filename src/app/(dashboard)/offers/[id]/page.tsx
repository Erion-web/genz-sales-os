import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Offer } from '@/types'
import OfferDetail from './OfferDetail'

export default async function OfferDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data } = await supabase
    .from('offers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!data) notFound()
  return <OfferDetail offer={data as Offer} />
}
