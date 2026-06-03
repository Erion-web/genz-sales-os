-- Goals, Call Briefs, Email Outreach Logs, Notification Templates

-- ── closed_at on leads (for weekly-closed tracking) ───────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- ── goal_targets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goal_targets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  daily_companies  INT DEFAULT 12,
  daily_outreach   INT DEFAULT 10,
  daily_meetings   INT DEFAULT 1,
  weekly_companies INT DEFAULT 50,
  weekly_outreach  INT DEFAULT 40,
  weekly_meetings  INT DEFAULT 5,
  weekly_closed    INT DEFAULT 1,
  updated_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── email_outreach_logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_outreach_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  tool        TEXT DEFAULT 'Apollo',
  emails_sent INT NOT NULL DEFAULT 0,
  replies     INT DEFAULT 0,
  note        TEXT,
  proof_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── call_briefs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.call_briefs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id        UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_id    UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  contact_person TEXT,
  summary        TEXT,
  interest_level TEXT CHECK (interest_level IN ('cold','warm','hot','urgent')),
  objection      TEXT CHECK (objection IN ('price','has_other_agency','not_now','no_budget','no_need','other')),
  objection_note TEXT,
  next_step      TEXT,
  next_step_date DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── notification_templates ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier       TEXT NOT NULL UNIQUE CHECK (tier IN ('on_pace','behind','critical')),
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.notification_templates (tier, subject, body) VALUES
  ('on_pace',
   '[GENZ Sales] {{time}} check — {{summary}}',
   'You''re on pace. {{companies}} companies, {{outreach}} outreach, {{meetings}} meetings. Keep pushing — the day is not over yet.'),
  ('behind',
   '[GENZ Sales] ⚠️ {{time}} check — behind pace: {{summary}}',
   'You are behind on today''s numbers. Right now: {{companies}}/{{target_companies}} companies, {{outreach}}/{{target_outreach}} outreach, {{meetings}}/{{target_meetings}} meetings. This gap needs to close before end of day. Stay focused and keep dialing — catching up is still possible.'),
  ('critical',
   '[GENZ Sales] 🚨 16:00 — targets not hit: {{summary}}',
   'End of day and the targets are not met. {{companies}}/{{target_companies}} companies, {{outreach}}/{{target_outreach}} outreach, {{meetings}}/{{target_meetings}} meetings. The day is not done until these numbers are met. Do what is necessary to close the gap.')
ON CONFLICT (tier) DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.goal_targets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outreach_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_briefs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- goal_targets: user reads own row; admin reads+writes all
CREATE POLICY "goal_targets_read"
  ON public.goal_targets FOR SELECT
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "goal_targets_admin_write"
  ON public.goal_targets FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- email_outreach_logs: user manages own; admin reads all
CREATE POLICY "outreach_logs_read"
  ON public.email_outreach_logs FOR SELECT
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "outreach_logs_write"
  ON public.email_outreach_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "outreach_logs_update"
  ON public.email_outreach_logs FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "outreach_logs_delete"
  ON public.email_outreach_logs FOR DELETE
  USING (user_id = auth.uid());

-- call_briefs: user manages own; admin reads all
CREATE POLICY "call_briefs_read"
  ON public.call_briefs FOR SELECT
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "call_briefs_write"
  ON public.call_briefs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "call_briefs_update"
  ON public.call_briefs FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- notification_templates: all authenticated read; admin writes
CREATE POLICY "templates_read"
  ON public.notification_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_admin_write"
  ON public.notification_templates FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Auto-create goal_targets for every new profile ────────────────────────
CREATE OR REPLACE FUNCTION public.create_default_goal_targets()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.goal_targets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_profile_create_goals ON public.profiles;
CREATE TRIGGER on_new_profile_create_goals
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_goal_targets();

-- Back-fill goal_targets for all existing profiles
INSERT INTO public.goal_targets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ── Supabase Storage bucket: outreach-proofs (private, PDF only) ──────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('outreach-proofs', 'outreach-proofs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "outreach_proofs_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'outreach-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "outreach_proofs_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'outreach-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );
