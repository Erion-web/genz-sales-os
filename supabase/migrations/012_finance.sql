-- Finance module: client retainers + monthly invoice tracking

-- ── finance_clients ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_clients (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  service          TEXT,
  monthly_retainer NUMERIC(10,2) DEFAULT 0,
  currency         TEXT DEFAULT 'EUR',
  has_tvsh         BOOLEAN DEFAULT false,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  notes            TEXT,
  lead_id          UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── invoices ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID REFERENCES public.finance_clients(id) ON DELETE CASCADE NOT NULL,
  month        DATE NOT NULL,             -- always first day of month, e.g. 2025-05-01
  amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  tvsh_rate    NUMERIC(5,2)  DEFAULT 0,   -- 0 or 20 (%)
  type         TEXT DEFAULT 'retainer'    CHECK (type IN ('retainer','project','other')),
  status       TEXT DEFAULT 'pending'     CHECK (status IN ('pending','half_paid','paid')),
  paid_amount  NUMERIC(10,2) DEFAULT 0,
  notes        TEXT,
  due_date     DATE,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, month, type)
);

ALTER TABLE public.finance_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices         ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins manage finance clients"
  ON public.finance_clients FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK(EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage invoices"
  ON public.invoices FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK(EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
