-- Fix infinite recursion: calendar_events SELECT checks event_attendees,
-- and event_attendees SELECT checked calendar_events → cycle.
-- Solution: security definer function reads calendar_events without RLS,
-- breaking the cycle.

DROP POLICY IF EXISTS "Users can read their attendee rows" ON public.event_attendees;
DROP POLICY IF EXISTS "Creators can manage attendees"      ON public.event_attendees;

-- Reads calendar_events as the table owner (bypasses RLS), so no cycle.
CREATE OR REPLACE FUNCTION public.is_calendar_event_creator(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events
    WHERE id = p_event_id AND created_by = auth.uid()
  )
$$;

-- Attendees: see own rows OR rows on events you created
CREATE POLICY "Users can read their attendee rows"
  ON public.event_attendees FOR SELECT
  USING (
    auth.uid() = user_id OR
    is_calendar_event_creator(event_id)
  );

-- Only creators can insert / update / delete attendee rows
CREATE POLICY "Creators can manage attendees"
  ON public.event_attendees FOR ALL
  USING (is_calendar_event_creator(event_id))
  WITH CHECK (is_calendar_event_creator(event_id));
