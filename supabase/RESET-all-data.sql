-- ============================================================================
-- RESET: REMOVE ALL DATA (keep schema intact)
-- ============================================================================
-- Project : Mobotech Mobile Care
-- Target  : Supabase / PostgreSQL 13+
--
-- WHAT THIS DOES
--   Deletes EVERY row from EVERY application table and resets sequences.
--
-- WHAT THIS DOES NOT DO
--   * Does NOT drop tables, columns, indexes, constraints or policies.
--   * Does NOT touch Supabase Storage files or auth/internal schemas.
--
-- ⚠️  DESTRUCTIVE — CANNOT BE UNDONE. Take a backup first.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste → Run
--   ...or: psql "$DATABASE_URL" -f RESET-all-data.sql
--
-- NOTE ON SYNTAX
--   PostgreSQL has NO `TRUNCATE TABLE IF EXISTS`. This script therefore uses a
--   DO block with to_regclass() so tables created by later migrations can be
--   absent without aborting the run.
-- ============================================================================

DO $$
DECLARE
  t text;
  -- Order matters: deepest children first, parents last.
  tbls text[] := ARRAY[
    -- 1. Review assistant
    'public.review_requests',
    'public.review_settings',
    -- 2. Dashboard add-ons (migration 004)
    'public.dashboard_report_logs',
    'public.dashboard_widget_preferences',
    'public.dashboard_saved_views',
    -- 3. Vendor sub-ledger
    'public.vendor_status_history',
    'public.vendor_ledger',
    'public.vendor_payments',
    'public.vendor_mobiles',
    'public.vendor_transactions',
    'public.vendors',
    -- 4. Invoicing / payments / sales
    'public.invoice_items',
    'public.invoices',
    'public.payments',
    'public.sales',
    -- 5. Repair job children
    'public.repair_tests',
    'public.repair_job_labor',
    'public.repair_job_parts',
    'public.repair_estimate_items',
    'public.repair_estimates',
    'public.diagnoses',
    'public.job_status_history',
    'public.attachments',
    'public.notification_logs',
    'public.notifications',
    -- 6. Repair jobs
    'public.repair_jobs',
    -- 7. Devices / customers / parts
    'public.devices',
    'public.customers',
    'public.part_stock_movements',
    'public.parts',
    -- 8. System tables
    'public.recycle_bin',
    'public.backup_logs',
    'public.settings',
    -- 9. Users & shops
    'public.users',
    'public.shops'
    -- NOTE: public.roles is intentionally NOT truncated (reference data).
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE %s CASCADE', t);
      RAISE NOTICE 'Truncated %', t;
    ELSE
      RAISE NOTICE 'Skipped % (table does not exist)', t;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Reset every public sequence (voucher / transaction counters) back to 1
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE %I.%I RESTART WITH 1', seq.sequence_schema, seq.sequence_name);
  END LOOP;
END $$;

-- ============================================================================
-- DONE. All application data removed. Schema untouched. Roles preserved.
-- Next: run SEED-sample-data.sql
-- ============================================================================
