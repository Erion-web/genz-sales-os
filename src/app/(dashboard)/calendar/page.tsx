import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Lead, Profile } from '@/types'
import CalendarClient, { AnyEvent } from './CalendarClient'

export default async function CalendarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: eventsData },
    { data: leadsData },
    { data: profilesData },
    { data: profileData },
  ] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*, creator:profiles!created_by(full_name), event_attendees(user_id, profiles(id, email, full_name, role, avatar_url, created_at))')
      .order('date', { ascending: true }),
    supabase
      .from('leads')
      .select('id, name, company, meetings, owner_id, owner_name')
      .order('name'),
    supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, created_at')
      .order('full_name'),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
  ])

  const isAdmin = profileData?.role === 'admin'

  // Normalize attendees + creator name
  const calendarEvents = (eventsData || []).map((e: any) => ({
    ...e,
    creator_name: e.creator?.full_name ?? null,
    attendees: (e.event_attendees || []).map((a: any) => a.profiles).filter(Boolean),
    creator: undefined,
    event_attendees: undefined,
  }))

  const slotLabel: Record<string, string> = {
    meeting1: 'Meeting 1',
    meeting2: 'Meeting 2',
    meeting3: 'Closing Meeting',
  }
  type LeadRow = Pick<Lead, 'id' | 'name' | 'company' | 'meetings' | 'owner_id'> & { owner_name: string | null }
  const leads = (leadsData || []) as LeadRow[]

  const leadEvents: AnyEvent[] = leads.flatMap(l =>
    (['meeting1', 'meeting2', 'meeting3'] as const).flatMap(slot => {
      const m = l.meetings?.[slot]
      if (!m?.date) return []
      return [{
        id: `${l.id}-${slot}`,
        title: `${slotLabel[slot]} · ${l.name}`,
        date: m.date,
        time: m.time,
        type: 'lead_meeting' as const,
        lead_id: l.id,
        lead_name: l.name,
        creator_name: l.owner_name,
        attendees: [] as Profile[],
        created_by: l.owner_id,
        can_edit: false,
      }]
    })
  )

  const allProfiles = (profilesData || []) as Profile[]
  const allLeads = leads.map(l => ({ id: l.id, name: l.name, company: l.company }))

  return (
    <CalendarClient
      initialEvents={calendarEvents}
      leadEvents={leadEvents}
      allLeads={allLeads}
      allProfiles={allProfiles}
      currentUserId={user.id}
      isAdmin={isAdmin}
    />
  )
}
