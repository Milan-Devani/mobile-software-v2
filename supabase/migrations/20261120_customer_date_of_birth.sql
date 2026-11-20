-- ============================================================================
-- MIGRATION: CUSTOMER DATE OF BIRTH (for automatic birthday wishes)
-- Safe & idempotent: only ADDs a nullable column + index. No existing data
-- is changed; existing customers simply have date_of_birth = NULL.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Speeds up the daily "whose birthday is today?" lookup (month + day match)
CREATE INDEX IF NOT EXISTS idx_customers_dob_month_day
  ON public.customers ((EXTRACT(MONTH FROM date_of_birth)), (EXTRACT(DAY FROM date_of_birth)))
  WHERE date_of_birth IS NOT NULL;

-- Refresh PostgREST schema cache so the API sees the new column immediately
NOTIFY pgrst, 'reload schema';
