-- Run this in Supabase SQL Editor
-- Fixes DELETE and UPDATE being silently blocked by RLS

-- Drop and recreate all leads policies cleanly
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete any lead" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update any lead" ON public.leads;

-- DELETE: owner or admin
CREATE POLICY "Users can delete own leads"
  ON public.leads FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can delete any lead"
  ON public.leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: owner or admin, with WITH CHECK so the row still passes after update
CREATE POLICY "Users can update own leads"
  ON public.leads FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can update any lead"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (true);

-- Also allow activities to be deleted by their owner
-- (needed when cleaning up after a lead delete, even though CASCADE handles it at DB level)
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;
CREATE POLICY "Users can delete own activities"
  ON public.activities FOR DELETE
  USING (auth.uid() = owner_id);
