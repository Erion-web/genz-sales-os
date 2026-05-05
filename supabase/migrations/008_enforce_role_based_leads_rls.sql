-- Idempotently enforce role-based SELECT access on leads and activities.
-- Drops any existing select policies (open or role-based) then recreates them.

-- ── leads ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read all leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can read all leads"               ON public.leads;
DROP POLICY IF EXISTS "Users can read own leads"                ON public.leads;

CREATE POLICY "Admins can read all leads"
  ON public.leads FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can read own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = owner_id);

-- ── activities ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read all activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can read all activities"              ON public.activities;
DROP POLICY IF EXISTS "Users can read own activities"               ON public.activities;

CREATE POLICY "Admins can read all activities"
  ON public.activities FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can read own activities"
  ON public.activities FOR SELECT
  USING (auth.uid() = owner_id);
