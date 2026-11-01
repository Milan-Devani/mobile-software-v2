-- ============================================================================
-- MIGRATION: CUSTOMER, REPAIR JOB, DIAGNOSIS & SALES SCHEMA UPDATES
-- Safe & idempotent: uses ADD COLUMN IF NOT EXISTS / ALTER COLUMN defaults
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- 1. CUSTOMERS: Ensure all customer modal fields exist with safe defaults
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_whatsapp VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'male';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'End User';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE customers ALTER COLUMN gender SET DEFAULT 'male';
ALTER TABLE customers ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN user_type SET DEFAULT 'End User';

-- 2. REPAIR JOBS: Ensure priority and service_type have safe defaults when omitted in UI
ALTER TABLE repair_jobs ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE repair_jobs ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE repair_jobs ALTER COLUMN priority SET DEFAULT 'NORMAL';
ALTER TABLE repair_jobs ALTER COLUMN service_type SET DEFAULT 'Pending';

-- 3. DIAGNOSES: Allow saving diagnosis without requiring technician_findings
ALTER TABLE diagnoses ALTER COLUMN technician_findings SET DEFAULT '';
ALTER TABLE diagnoses ALTER COLUMN technician_findings DROP NOT NULL;

-- 4. SALES: Ensure customer link and billing columns exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100) DEFAULT 'Gujarat';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(50);
