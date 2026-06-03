import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Profile, GoalTarget } from '@/types'
import GoalsSettingsClient from './GoalsSettingsClient'

export default async function GoalsSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  const [{ data: salesUsers }, { data: targets }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'sales_user').order('full_name'),
    supabase.from('goal_targets').select('*'),
  ])

  const usersWithTargets = ((salesUsers || []) as Profile[]).map(u => ({
    profile: u,
    target: ((targets || []) as GoalTarget[]).find(t => t.user_id === u.id) ?? {
      id: '', user_id: u.id,
      daily_companies: 12, daily_outreach: 10, daily_meetings: 1,
      weekly_companies: 50, weekly_outreach: 40, weekly_meetings: 5, weekly_closed: 1,
      updated_by: null, updated_at: null,
    } as GoalTarget,
  }))

  return <GoalsSettingsClient adminId={user.id} rows={usersWithTargets} />
}
