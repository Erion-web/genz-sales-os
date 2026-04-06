-- Offers / Proposals table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.offers (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID        REFERENCES public.leads(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL DEFAULT 'Proposal',
  status        TEXT        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','sent','viewed','accepted','declined')),
  client_name   TEXT        NOT NULL DEFAULT '',
  client_company TEXT,
  client_email  TEXT,
  greeting      TEXT,
  services      JSONB       NOT NULL DEFAULT '[]',
  client_logos  JSONB       NOT NULL DEFAULT '[]',
  deal_type     TEXT        CHECK (deal_type IN ('retainer','project')),
  created_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  share_token   TEXT        UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  sent_at       TIMESTAMPTZ
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write all offers
CREATE POLICY "offers_auth" ON public.offers
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION touch_offers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION touch_offers_updated_at();
