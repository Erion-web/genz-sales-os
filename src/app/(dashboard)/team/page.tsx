import { createClient } from '@/lib/supabase/server'
import { Lead, Activity, Profile, getDealValue } from '@/types'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profiles }, { data: leads }, { data: activities }, { data: currentProfile }] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('leads').select('*'),
    supabase.from('activities').select('id, owner_id, type, created_at'),
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
  ])

  const allLeads = (leads || []) as Lead[]
  const allActivities = (activities || []) as Activity[]
  const isAdmin = currentProfile?.role === 'admin'
  const currentUserId = user!.id

  const teamStats = (profiles || []).map(profile => {
    const pLeads = allLeads.filter(l => l.owner_id === profile.id)
    const closed = pLeads.filter(l => l.stage === 'Closed')
    const active = pLeads.filter(l => !['Closed', 'Dead'].includes(l.stage))
    const closedValue = closed.reduce((sum, l) => sum + getDealValue(l), 0)
    const pipelineValue = active.reduce((sum, l) => sum + getDealValue(l), 0)
    const closedMRR = closed.filter(l => l.deal_type === 'retainer').reduce((sum, l) => sum + (l.monthly || 0), 0)
    const pActivities = allActivities.filter(a => a.owner_id === profile.id)
    const closingRate = pLeads.length > 0 ? Math.round((closed.length / pLeads.length) * 100) : 0
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const activitiesThisMonth = pActivities.filter(a => new Date(a.created_at) >= monthStart).length

    return {
      profile: profile as Profile,
      totalLeads: pLeads.length,
      activeLeads: active.length,
      closedCount: closed.length,
      closedValue,
      pipelineValue,
      closedMRR,
      totalActivities: pActivities.length,
      activitiesThisMonth,
      closingRate,
      commission: closedValue * 0.2,
    }
  }).sort((a, b) => b.closedValue - a.closedValue)

  return (
    <TeamClient
      teamStats={teamStats}
      isAdmin={isAdmin}
      currentUserId={currentUserId}
    />
  )
}
