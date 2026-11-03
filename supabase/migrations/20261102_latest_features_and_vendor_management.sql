-- ============================================================================
-- LATEST PRODUCTION MIGRATION (NOVEMBER 2, 2026)
-- Complete schema update for:
-- 1. Full Vendor Management Module (Vendors, Mobiles, Inward/Outward, Ledger, Payments)
-- 2. Warranty Claims & Technical Rework Audit Trail
-- 3. Parts Inventory Categories & Management
-- 4. Recycle Bin & Soft Deletes
-- 5. Safe Idempotent Execution (Run multiple times without breaking data)
--
-- HOW TO RUN IN SUPABASE:
-- 1. Open Supabase Dashboard -> SQL Editor (or New Query)
-- 2. Paste this entire file
-- 3. Click Run (Ctrl+Enter / Cmd+Enter)
-- ============================================================================

-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. VENDORS MASTER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    mobile VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    specialization TEXT,
    address TEXT,
    gst_number VARCHAR(50),
    opening_balance NUMERIC(12, 2) DEFAULT 0.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all new columns exist if table was already created
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_vendors_code ON public.vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_mobile ON public.vendors(mobile);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);

-- ============================================================================
-- 2. VENDOR TRANSACTIONS (Send / Receive / Inward / Return Chalans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txn_number VARCHAR(100) UNIQUE NOT NULL,
    parent_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    txn_type VARCHAR(50) NOT NULL,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    total_mobiles INT DEFAULT 0,
    total_estimated_cost NUMERIC(12, 2) DEFAULT 0.00,
    total_actual_cost NUMERIC(12, 2) DEFAULT 0.00,
    total_cost NUMERIC(12, 2) DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_mode VARCHAR(50) DEFAULT 'NONE',
    payment_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS parent_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS total_mobiles INT DEFAULT 0;
ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS total_estimated_cost NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS total_actual_cost NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_vendor_txns_vendor_id ON public.vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_type ON public.vendor_transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_date ON public.vendor_transactions(txn_date DESC);

-- ============================================================================
-- 3. VENDOR MOBILES (Units sent to vendor or received from vendor)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_mobiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.vendor_transactions(id) ON DELETE CASCADE,
    send_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    return_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
    direction VARCHAR(50) DEFAULT 'OUTWARD',
    flow_type VARCHAR(50) NOT NULL DEFAULT 'SENT_TO_VENDOR',
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    imei VARCHAR(50),
    customer_name VARCHAR(255),
    repair_problem TEXT NOT NULL,
    why_send TEXT,
    condition TEXT,
    accessories TEXT,
    expected_return_date DATE,
    estimated_cost NUMERIC(12, 2) DEFAULT 0.00,
    actual_cost NUMERIC(12, 2) DEFAULT 0.00,
    advance_paid NUMERIC(12, 2) DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) DEFAULT 0.00,
    repair_result VARCHAR(50) DEFAULT 'PENDING',
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    current_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    sent_date DATE,
    received_date DATE,
    returned_date DATE,
    completed_date DATE,
    warranty VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all new columns exist
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.vendor_transactions(id) ON DELETE CASCADE;
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS why_send TEXT;
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS direction VARCHAR(50) DEFAULT 'OUTWARD';
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS completed_date DATE;
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS warranty VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_vendor_id ON public.vendor_mobiles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_status ON public.vendor_mobiles(current_status);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_flow_type ON public.vendor_mobiles(flow_type);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_imei ON public.vendor_mobiles(imei);

-- ============================================================================
-- 4. VENDOR STATUS HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_mobile_id UUID NOT NULL REFERENCES public.vendor_mobiles(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vsh_mobile_id ON public.vendor_status_history(vendor_mobile_id);

-- ============================================================================
-- 5. VENDOR LEDGER (KHATA ACCOUNTING)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type VARCHAR(50) NOT NULL,
    txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    vendor_mobile_id UUID REFERENCES public.vendor_mobiles(id) ON DELETE SET NULL,
    debit NUMERIC(12, 2) DEFAULT 0.00,
    credit NUMERIC(12, 2) DEFAULT 0.00,
    amount NUMERIC(12, 2) DEFAULT 0.00,
    running_balance NUMERIC(12, 2) DEFAULT 0.00,
    payment_mode VARCHAR(50),
    reference_no VARCHAR(100),
    description TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendor_ledger_vendor_id ON public.vendor_ledger(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ledger_date ON public.vendor_ledger(date DESC);

-- ============================================================================
-- 6. VENDOR PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_no VARCHAR(100) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    payment_type VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'CASH',
    reference_no VARCHAR(100),
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON public.vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_voucher ON public.vendor_payments(voucher_no);

-- ============================================================================
-- 7. RECYCLE BIN (SOFT DELETE WITH 30-DAY RETENTION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recycle_bin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_by VARCHAR(100) DEFAULT 'Staff',
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    purge_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_entity_type ON public.recycle_bin(entity_type);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON public.recycle_bin(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_purge_at ON public.recycle_bin(purge_at ASC);

-- ============================================================================
-- 8. SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. REPAIR JOBS (WARRANTY & REWORK AUDIT TRAIL COLUMNS)
-- ============================================================================
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_rework_reason TEXT;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_parts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS remaining_authorized_balance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS payment_remaining_authorized BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 10. PARTS INVENTORY CATEGORY
-- ============================================================================
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Screen / Display';
CREATE INDEX IF NOT EXISTS idx_parts_category ON public.parts(category);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_mobiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Vendors
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'Allow all access to vendors') THEN
        CREATE POLICY "Allow all access to vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- Vendor Transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_transactions' AND policyname = 'Allow all access to vendor_transactions') THEN
        CREATE POLICY "Allow all access to vendor_transactions" ON public.vendor_transactions FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- Vendor Mobiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_mobiles' AND policyname = 'Allow all access to vendor_mobiles') THEN
        CREATE POLICY "Allow all access to vendor_mobiles" ON public.vendor_mobiles FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- Vendor Status History
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_status_history' AND policyname = 'Allow all access to vendor_status_history') THEN
        CREATE POLICY "Allow all access to vendor_status_history" ON public.vendor_status_history FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- Vendor Ledger
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_ledger' AND policyname = 'Allow all access to vendor_ledger') THEN
        CREATE POLICY "Allow all access to vendor_ledger" ON public.vendor_ledger FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- Vendor Payments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_payments' AND policyname = 'Allow all access to vendor_payments') THEN
        CREATE POLICY "Allow all access to vendor_payments" ON public.vendor_payments FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- Recycle Bin
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recycle_bin' AND policyname = 'Allow all access to recycle_bin') THEN
        CREATE POLICY "Allow all access to recycle_bin" ON public.recycle_bin FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- Settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Allow all access to settings') THEN
        CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

