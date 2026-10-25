-- ============================================================================
-- MIGRATION: ADD PAYMENT REMAINING AUTHORIZED FLAG TO REPAIR JOBS
-- Allows tracking when a device was handed over with an outstanding balance.
-- Safe to execute: uses ADD COLUMN IF NOT EXISTS (zero downtime, non-breaking).
-- ============================================================================

ALTER TABLE repair_jobs 
ADD COLUMN IF NOT EXISTS payment_remaining_authorized BOOLEAN DEFAULT FALSE;
