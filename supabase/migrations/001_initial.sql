-- ============================================================
-- GENZ Sales OS — Initial Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'sales_user' CHECK (role IN ('admin', 'sales_user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  deal_type TEXT CHECK (deal_type IN ('retainer', 'project')),
  monthly NUMERIC,
  months INT DEFAULT 6,
  project NUMERIC,
  source TEXT CHECK (source IN ('Referral', 'Cold outreach', 'Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'Website', 'Other')),
  stage TEXT DEFAULT 'New' CHECK (stage IN ('New', 'Contacted', 'Follow-up 1', 'Follow-up 2', 'Negotiation', 'Closed', 'Dead')),
  owner_id UUID REFERENCES auth.users(id),
  owner_name TEXT,
  intent TEXT DEFAULT 'cold' CHECK (intent IN ('cold', 'warm', 'hot', 'urgent')),
  services TEXT[],
  meetings JSONB DEFAULT '{"meeting1": null, "meeting2": null, "meeting3": null}'::jsonb,
  next_followup DATE NOT NULL,
  last_contact DATE,
  follow_up_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('Called', 'Messaged', 'No answer', 'Note')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID REFERENCES auth.users(id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone authenticated can read profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Leads policies
CREATE POLICY "Authenticated users can read all leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own leads"
  ON public.leads FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own leads"
  ON public.leads FOR DELETE
  USING (auth.uid() = owner_id);

-- Admin override: admins can update/delete any lead
-- (Set role = 'admin' in profiles table for admin users)
CREATE POLICY "Admins can update any lead"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any lead"
  ON public.leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Activities policies
CREATE POLICY "Authenticated users can read all activities"
  ON public.activities FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS leads_owner_id_idx ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON public.leads(stage);
CREATE INDEX IF NOT EXISTS leads_next_followup_idx ON public.leads(next_followup);
CREATE INDEX IF NOT EXISTS activities_lead_id_idx ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON public.activities(created_at);
