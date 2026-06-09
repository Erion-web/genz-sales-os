-- User activity log — tracks page visits and key actions per sales rep
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event       TEXT        NOT NULL,  -- 'page_view', 'lead_create', 'activity_log', etc.
  label       TEXT        NOT NULL,  -- human-readable description
  path        TEXT,                  -- URL path at time of action
  meta        JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ual_created_at_idx ON public.user_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS ual_user_id_idx    ON public.user_activity_log (user_id, created_at DESC);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own events
CREATE POLICY "Users insert own events"
  ON public.user_activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin reads all events
CREATE POLICY "Admin reads all events"
  ON public.user_activity_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
