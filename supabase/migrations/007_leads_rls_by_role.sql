-- Replace the open "read all leads" policy with role-based access
DROP POLICY IF EXISTS "Authenticated users can read all leads" ON public.leads;

-- Admins can read all leads
CREATE POLICY "Admins can read all leads"
  ON public.leads FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Regular users can only read their own leads
CREATE POLICY "Users can read own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = owner_id);

-- Same split for activities
DROP POLICY IF EXISTS "Authenticated users can read all activities" ON public.activities;

CREATE POLICY "Admins can read all activities"
  ON public.activities FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can read own activities"
  ON public.activities FOR SELECT
  USING (auth.uid() = owner_id);
