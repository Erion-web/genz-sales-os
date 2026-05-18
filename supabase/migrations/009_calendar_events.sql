CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  time        TEXT,
  description TEXT,
  lead_id     UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_attendees (
  event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees  ENABLE ROW LEVEL SECURITY;

-- calendar_events: creator or invited attendee can read
CREATE POLICY "Users can see own and invited events"
  ON public.calendar_events FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM public.event_attendees WHERE event_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can delete events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = created_by);

-- event_attendees: attendee sees their own rows; creator manages all rows
CREATE POLICY "Users can read their attendee rows"
  ON public.event_attendees FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.calendar_events WHERE id = event_id AND created_by = auth.uid())
  );

CREATE POLICY "Creators can manage attendees"
  ON public.event_attendees FOR ALL
  USING (EXISTS (SELECT 1 FROM public.calendar_events WHERE id = event_id AND created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calendar_events WHERE id = event_id AND created_by = auth.uid()));
