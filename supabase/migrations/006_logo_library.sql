-- Client logo library (reusable across proposals)
CREATE TABLE IF NOT EXISTS public.logo_library (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.logo_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logo_library_auth" ON public.logo_library
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default logos (no images, just names)
INSERT INTO public.logo_library (name) VALUES
  ('Nourish Albania'),
  ('Vitrina Store'),
  ('Sezoni'),
  ('ProSport'),
  ('Delta City'),
  ('Klan Media')
ON CONFLICT DO NOTHING;
