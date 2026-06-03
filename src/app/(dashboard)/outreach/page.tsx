import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailOutreachLog, Profile } from '@/types'
import OutreachClient from './OutreachClient'

export default async function OutreachPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const wStart = (() => {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    d.setHours(0, 0, 0, 0)
    return d.toISOString().split('T')[0]
  })()

  const [{ data: myLogs }, { data: allProfiles }] = await Promise.all([
    supabase
      .from('email_outreach_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(30),
    isAdmin
      ? supabase.from('profiles').select('id, full_name, email').eq('role', 'sales_user')
      : Promise.resolve({ data: [] }),
  ])

  let adminWeekLogs: (EmailOutreachLog & { profile?: { full_name: string | null } })[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('email_outreach_logs')
      .select('*, profile:profiles(full_name)')
      .gte('log_date', wStart)
      .order('log_date', { ascending: false })
    adminWeekLogs = (data || []) as typeof adminWeekLogs
  }

  return (
    <OutreachClient
      userId={user.id}
      isAdmin={isAdmin}
      initialLogs={(myLogs || []) as EmailOutreachLog[]}
      adminWeekLogs={adminWeekLogs}
      salesProfiles={(allProfiles || []) as Profile[]}
      weekStart={wStart}
    />
  )
}
