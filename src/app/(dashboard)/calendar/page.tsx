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
  ] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*, event_attendees(user_id, profiles(id, email, full_name, role, avatar_url, created_at))')
      .order('date', { ascending: true }),
    supabase
      .from('leads')
      .select('id, name, company, meetings, owner_id')
      .order('name'),
    supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, created_at')
      .order('full_name'),
  ])

  // Normalize attendees: flatten junction rows to Profile objects
  const calendarEvents = (eventsData || []).map((e: any) => ({
    ...e,
    attendees: (e.event_attendees || []).map((a: any) => a.profiles).filter(Boolean),
    event_attendees: undefined,
  }))

  // Extract lead meetings as unified events
  const slotLabel: Record<string, string> = {
    meeting1: 'Meeting 1',
    meeting2: 'Meeting 2',
    meeting3: 'Closing Meeting',
  }
  type LeadRow = Pick<Lead, 'id' | 'name' | 'company' | 'meetings' | 'owner_id'>
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
        attendees: [] as Profile[],
        created_by: null,
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
    />
  )
}
