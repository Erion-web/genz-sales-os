-- Allow admins to read all calendar events and their attendees.

-- ── calendar_events SELECT ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can see own and invited events" ON public.calendar_events;

CREATE POLICY "Users can see own and invited events"
  ON public.calendar_events FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.event_attendees WHERE event_id = id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── event_attendees SELECT ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read their attendee rows" ON public.event_attendees;

CREATE POLICY "Users can read their attendee rows"
  ON public.event_attendees FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_calendar_event_creator(event_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
