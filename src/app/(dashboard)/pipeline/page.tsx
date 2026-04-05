import { createClient } from '@/lib/supabase/server'
import { Lead, STAGES, Stage, getDealValue, formatCurrency, STAGE_COLORS, INTENT_COLORS } from '@/types'
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

  const stageTotals = STAGES.reduce((acc, stage) => {
    acc[stage] = grouped[stage].reduce((sum, l) => sum + getDealValue(l), 0)
    return acc
  }, {} as Record<Stage, number>)

  return <PipelineBoard grouped={grouped} stageTotals={stageTotals} />
}
