-- Add tvsh_included flag to finance_clients
-- When true: the monthly_retainer price already contains TVSH (inclusive)
-- When false (default): TVSH is added on top of the base price

ALTER TABLE public.finance_clients
  ADD COLUMN IF NOT EXISTS tvsh_included BOOLEAN DEFAULT false;
