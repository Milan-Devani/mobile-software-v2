-- ============================================================================
-- MIGRATION 005: LINK REPAIR JOBS TO VENDORS  (Send-to-Vendor traceability)
-- ============================================================================
-- Project : Mobotech Mobile Care — Mobile Repair Management System
-- Target  : Supabase / PostgreSQL 13+
--
-- PURPOSE
--   Connects a customer repair job (repair_jobs) to the vendor device record
--   (vendor_mobiles) so the shop can prove: "this customer's phone is currently
--   with this specialist partner". Also adds a `specialty` label to vendors so
--   staff can pick the right partner (e.g. "Motherboard", "Water damage").
--
-- SAFETY / BACKWARD COMPATIBILITY  (READ THIS)
--   * 100% ADDITIVE. Every statement is guarded (IF NOT EXISTS).
--       - No table is dropped, renamed or re-created.
--       - No existing column is altered, retyped or removed.
--       - No existing row is updated or deleted.
--   * Existing vendor flows (send / receive / chalan / ledger) are untouched.
--     `vendor_mobiles.repair_job_id` is NULLABLE, so every historical row and
--     every row created by the old batch flow keeps working exactly as before.
--   * The application works WITHOUT this migration for reading (columns are
--     simply absent), but `POST /api/jobs/:id/send-to-vendor` requires it.
--   * Re-running this file is safe and idempotent.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste this file → Run
--   ...or:  psql "$DATABASE_URL" -f 005_link_jobs_to_vendors.sql
--
-- ROLLBACK (manual, only if ever required)
--   DROP INDEX IF EXISTS idx_vendor_mobiles_repair_job_id;
--   ALTER TABLE public.vendor_mobiles DROP COLUMN IF EXISTS repair_job_id;
--   ALTER TABLE public.repair_jobs    DROP COLUMN IF EXISTS vendor_sent_at;
--   ALTER TABLE public.repair_jobs    DROP COLUMN IF EXISTS vendor_expected_back_date;
--   ALTER TABLE public.vendors        DROP COLUMN IF EXISTS specialty;
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. vendor_mobiles.repair_job_id
--    Links a vendor device record back to the customer's job sheet.
--    ON DELETE SET NULL: deleting a job never destroys vendor history.
-- ----------------------------------------------------------------------------
ALTER TABLE public.vendor_mobiles
    ADD COLUMN IF NOT EXISTS repair_job_id UUID
    REFERENCES public.repair_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_repair_job_id
    ON public.vendor_mobiles (repair_job_id);

-- ----------------------------------------------------------------------------
-- 2. repair_jobs vendor snapshot columns
--    Quick, denormalised indicators on the job itself (so list/detail views can
--    show "at vendor" without joining). Nullable → existing rows unaffected.
-- ----------------------------------------------------------------------------
ALTER TABLE public.repair_jobs
    ADD COLUMN IF NOT EXISTS vendor_sent_at TIMESTAMPTZ;

ALTER TABLE public.repair_jobs
    ADD COLUMN IF NOT EXISTS vendor_expected_back_date DATE;

CREATE INDEX IF NOT EXISTS idx_repair_jobs_vendor_sent_at
    ON public.repair_jobs (vendor_sent_at);

-- ----------------------------------------------------------------------------
-- 3. vendors.specialty
--    Free-text label used by the "Send to Specialist Partner" picker.
-- ----------------------------------------------------------------------------
ALTER TABLE public.vendors
    ADD COLUMN IF NOT EXISTS specialty VARCHAR(120);

-- ============================================================================
-- END OF MIGRATION 005
-- ============================================================================
