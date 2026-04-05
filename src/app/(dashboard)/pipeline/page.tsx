import { createClient } from '@/lib/supabase/server'
import { Lead, STAGES, Stage } from '@/types'
import PipelineBoard from './PipelineBoard'

export default async function PipelinePage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('next_followup', { ascending: true })

  const leads = (data || []) as Lead[]
  const grouped = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter(l => l.stage === stage)
    return acc
  }, {} as Record<Stage, Lead[]>)

  return <PipelineBoard grouped={grouped} />
}
