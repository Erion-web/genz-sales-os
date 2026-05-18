'use client'

import { useState, useMemo } from 'react'
import { CalendarEvent, Lead, Profile, formatDate } from '@/types'
import { createClient } from '@/lib/supabase/client'

export type AnyEvent = {
  id: string
  title: string
  date: string
  time: string | null
  type: 'event' | 'lead_meeting'
  lead_id: string | null
  lead_name: string | null
  attendees: Profile[]
  created_by: string | null
  can_edit: boolean
}

type StoredEvent = CalendarEvent & { attendees: Profile[] }

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Monday = 0

  const days: { date: Date; inMonth: boolean }[] = []

  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), inMonth: false })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), inMonth: true })
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), inMonth: false })
  }
  return days
}

function EventCard({ event, compact }: { event: AnyEvent; compact?: boolean }) {
  return (
    <div className="flex gap-2.5 p-2.5 rounded-lg hover:bg-s2/50 transition-colors">
      <div className={`w-0.5 rounded-full shrink-0 self-stretch ${event.type === 'lead_meeting' ? 'bg-info' : 'bg-accent'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-tx truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {event.time && <span className="text-xs text-tx-3">{event.time.slice(0, 5)}</span>}
          {compact && <span className="text-xs text-tx-3">{formatDate(event.date)}</span>}
          {event.lead_name && !event.title.includes(event.lead_name) && (
            <span className="text-xs text-tx-3 truncate">{event.lead_name}</span>
          )}
        </div>
        {!compact && event.attendees.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            {event.attendees.slice(0, 4).map(a => (
              <div
                key={a.id}
                title={a.full_name || a.email || ''}
                className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[9px] font-bold ring-1 ring-border"
              >
                {a.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            ))}
            {event.attendees.length > 4 && (
              <span className="text-xs text-tx-3">+{event.attendees.length - 4}</span>
            )}
          </div>
        )}
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full h-fit shrink-0 font-medium mt-0.5 ${
        event.type === 'lead_meeting' ? 'bg-info/15 text-info' : 'bg-accent/15 text-accent'
      }`}>
        {event.type === 'lead_meeting' ? 'Lead' : 'Event'}
      </span>
    </div>
  )
}

function EventForm({
  initialDate,
  allLeads,
  allProfiles,
  currentUserId,
  onSave,
  onCancel,
}: {
  initialDate: string
  allLeads: Pick<Lead, 'id' | 'name' | 'company'>[]
  allProfiles: Profile[]
  currentUserId: string
  onSave: (data: {
    title: string; date: string; time: string; description: string
    lead_id: string; attendee_ids: string[]
  }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [leadId, setLeadId] = useState('')
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const otherProfiles = allProfiles.filter(p => p.id !== currentUserId)

  const toggleAttendee = (id: string) =>
    setAttendeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    setSaving(true)
    await onSave({ title: title.trim(), date, time, description, lead_id: leadId, attendee_ids: attendeeIds })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-md p-6 shadow-xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-lg text-tx">New Event</h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-tx-3 hover:text-tx hover:bg-s2 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Pitch call with Acme..."
              className="w-full"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1 block">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full" required />
            </div>
            <div>
              <label className="text-xs text-tx-3 font-medium mb-1 block">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full" />
            </div>
          </div>

          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Notes</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional agenda or notes..."
              rows={2}
              className="w-full resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-tx-3 font-medium mb-1 block">Link to Lead</label>
            <select value={leadId} onChange={e => setLeadId(e.target.value)} className="w-full">
              <option value="">No lead</option>
              {allLeads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}{l.company ? ` · ${l.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          {otherProfiles.length > 0 && (
            <div>
              <label className="text-xs text-tx-3 font-medium mb-2 block">
                Invite Teammates
                {attendeeIds.length > 0 && (
                  <span className="ml-1.5 text-accent">({attendeeIds.length} selected — will receive email)</span>
                )}
              </label>
              <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {otherProfiles.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-s2 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={attendeeIds.includes(p.id)}
                      onChange={() => toggleAttendee(p.id)}
                      className="w-4 h-4 shrink-0 cursor-pointer"
                    />
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold shrink-0">
                      {p.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-tx font-medium leading-tight truncate">
                        {p.full_name || p.email || 'Teammate'}
                      </p>
                      <p className="text-xs text-tx-3 leading-tight">
                        {p.role === 'admin' ? '👑 Admin' : 'Sales'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !date}
              className="btn-primary flex-1"
            >
              {saving
                ? 'Saving...'
                : attendeeIds.length > 0
                ? `Save & Notify ${attendeeIds.length}`
                : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CalendarClient({
  initialEvents,
  leadEvents,
  allLeads,
  allProfiles,
  currentUserId,
}: {
  initialEvents: StoredEvent[]
  leadEvents: AnyEvent[]
  allLeads: Pick<Lead, 'id' | 'name' | 'company'>[]
  allProfiles: Profile[]
  currentUserId: string
}) {
  const today = new Date()
  const todayStr = toDateStr(today)

  const [calendarEvents, setCalendarEvents] = useState<StoredEvent[]>(initialEvents)
  const [currentMonth, setCurrentMonth] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(todayStr)

  const supabase = createClient()

  const allEvents: AnyEvent[] = useMemo(() => {
    const events: AnyEvent[] = calendarEvents.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      type: 'event',
      lead_id: e.lead_id,
      lead_name: null,
      attendees: e.attendees,
      created_by: e.created_by,
      can_edit: e.created_by === currentUserId,
    }))
    return [...events, ...leadEvents].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.time || '').localeCompare(b.time || '')
    })
  }, [calendarEvents, leadEvents, currentUserId])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AnyEvent[]>()
    allEvents.forEach(e => {
      const list = map.get(e.date) || []
      list.push(e)
      map.set(e.date, list)
    })
    return map
  }, [allEvents])

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth.year, currentMonth.month),
    [currentMonth],
  )

  const selectedEvents = eventsByDate.get(selectedDate) || []

  const upcoming = useMemo(() => {
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 14)
    const endStr = toDateStr(endDate)
    return allEvents.filter(e => e.date >= todayStr && e.date <= endStr)
  }, [allEvents, todayStr])

  const prevMonth = () => setCurrentMonth(prev => {
    const d = new Date(prev.year, prev.month - 1, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const nextMonth = () => setCurrentMonth(prev => {
    const d = new Date(prev.year, prev.month + 1, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const goToday = () => {
    setCurrentMonth({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedDate(todayStr)
  }

  const openForm = (date?: string) => {
    setFormDate(date || todayStr)
    setShowForm(true)
  }

  const handleSave = async (data: {
    title: string; date: string; time: string; description: string
    lead_id: string; attendee_ids: string[]
  }) => {
    const { data: saved, error } = await supabase
      .from('calendar_events')
      .insert({
        title: data.title,
        date: data.date,
        time: data.time || null,
        description: data.description || null,
        lead_id: data.lead_id || null,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (error || !saved) return

    if (data.attendee_ids.length > 0) {
      await supabase.from('event_attendees').insert(
        data.attendee_ids.map(uid => ({ event_id: saved.id, user_id: uid }))
      )
      await fetch('/api/calendar/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: saved.id, attendee_ids: data.attendee_ids }),
      })
    }

    const attendees = allProfiles.filter(p => data.attendee_ids.includes(p.id))
    setCalendarEvents(prev => [...prev, { ...saved, attendees }])
    setShowForm(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-tx">Calendar</h1>
          <p className="text-tx-3 text-sm mt-0.5">
            {upcoming.length} event{upcoming.length !== 1 ? 's' : ''} in the next 14 days
          </p>
        </div>
        <button onClick={() => openForm()} className="btn-primary">+ New Event</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Calendar grid */}
        <div className="lg:col-span-2 card p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-s2 text-tx-3 hover:text-tx transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <h2 className="font-heading font-bold text-tx text-base w-44 text-center">
                {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
              </h2>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-s2 text-tx-3 hover:text-tx transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
            <button onClick={goToday} className="btn-ghost text-xs px-3 py-1.5">Today</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[11px] text-tx-3 font-medium uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {calendarDays.map(({ date, inMonth }) => {
              const dateStr = toDateStr(date)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const dayEvents = eventsByDate.get(dateStr) || []
              const visible = dayEvents.slice(0, 2)
              const overflow = dayEvents.length - 2

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    relative bg-surface min-h-[72px] p-1.5 flex flex-col gap-0.5 transition-colors text-left
                    hover:bg-s2/50
                    ${!inMonth ? 'opacity-25' : ''}
                    ${isSelected ? 'bg-accent/8 hover:bg-accent/12' : ''}
                  `}
                >
                  <span className={`
                    text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-colors
                    ${isToday ? 'bg-accent text-white' : isSelected ? 'text-accent' : 'text-tx-2'}
                  `}>
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col gap-px w-full overflow-hidden">
                    {visible.map(e => (
                      <div
                        key={e.id}
                        className={`text-[10px] leading-[1.3] truncate px-1 rounded font-medium ${
                          e.type === 'lead_meeting'
                            ? 'bg-info/15 text-info'
                            : 'bg-accent/15 text-accent'
                        }`}
                      >
                        {e.time ? `${e.time.slice(0, 5)} ` : ''}{e.title}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="text-[10px] text-tx-3 px-1">+{overflow} more</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-accent/30" />
              <span className="text-xs text-tx-3">Event</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-info/30" />
              <span className="text-xs text-tx-3">Lead Meeting</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* Selected day */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-heading font-semibold text-sm text-tx">
                {selectedDate === todayStr
                  ? 'Today'
                  : formatDate(selectedDate)}
              </h3>
              <button
                onClick={() => openForm(selectedDate)}
                className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="p-2">
              {selectedEvents.length === 0
                ? <p className="text-tx-3 text-xs text-center py-6">No events on this day</p>
                : selectedEvents.map(e => <EventCard key={e.id} event={e} />)
              }
            </div>
          </div>

          {/* Upcoming 14 days */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm text-tx">Upcoming · 14 days</h3>
              <span className="badge bg-accent/10 text-accent text-xs">{upcoming.length}</span>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              {upcoming.length === 0
                ? <p className="text-tx-3 text-xs text-center py-6">Nothing scheduled</p>
                : upcoming.map(e => <EventCard key={e.id} event={e} compact />)
              }
            </div>
          </div>

        </div>
      </div>

      {showForm && (
        <EventForm
          initialDate={formDate}
          allLeads={allLeads}
          allProfiles={allProfiles}
          currentUserId={currentUserId}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
