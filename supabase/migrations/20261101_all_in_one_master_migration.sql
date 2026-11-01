-- ============================================================================
-- ALL-IN-ONE MASTER SUPABASE SQL MIGRATION
-- MOBILE REPAIR MANAGEMENT SYSTEM (PRODUCTION CONSOLIDATED)
--
-- INSTRUCTIONS FOR SUPABASE:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Open the SQL Editor (left menu > "SQL Editor" or "New query")
-- 3. Paste this ENTIRE file into the editor
-- 4. Click the green "RUN" button (Ctrl+Enter or Cmd+Enter)
--
-- This script is 100% IDEMPOTENT and SAFE:
-- - Uses CREATE TABLE IF NOT EXISTS
-- - Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- - Uses CREATE INDEX IF NOT EXISTS
-- - Uses ON CONFLICT DO NOTHING
-- - Can be run multiple times safely without erasing or breaking any data!
-- ============================================================================

-- Enable pgcrypto for UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SHOPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT 'FixIt Mobile Repair Pro',
    tagline VARCHAR(255) DEFAULT 'Professional Smartphone & Tablet Repair Services',
    logo_url TEXT DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '+1 (555) 234-5678',
    email VARCHAR(255) NOT NULL DEFAULT 'support@fixitrepair.com',
    address TEXT NOT NULL DEFAULT '100 Tech Hub Boulevard, Suite 101',
    city VARCHAR(100) DEFAULT 'San Jose',
    state VARCHAR(100) DEFAULT 'CA',
    postal_code VARCHAR(20) DEFAULT '95113',
    country VARCHAR(100) DEFAULT 'USA',
    tax_number VARCHAR(100) DEFAULT 'US-TAX-987654321',
    website VARCHAR(255) DEFAULT 'https://fixitrepair.example.com',
    currency VARCHAR(10) DEFAULT 'INR',
    currency_symbol VARCHAR(10) DEFAULT '₹',
    warranty_terms TEXT DEFAULT 'All repairs are covered by our standard 90-day warranty against manufacturer defects on installed components. Physical or liquid damage after repair voids warranty.',
    terms_conditions TEXT DEFAULT 'Devices left unclaimed for more than 45 days after Ready for Pickup notification may be disposed of according to state salvage regulations.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (id, name, description) VALUES
('admin', 'Admin / Shop Owner', 'Full administrative access to shop management, financials, parts, and user accounts'),
('technician', 'Technician', 'Diagnose devices, request parts, execute repairs, and complete quality testing'),
('staff', 'Shop Staff / Receptionist', 'Customer check-in, create job sheets, process payments, and manage pickups')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id VARCHAR(50) NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT DEFAULT '',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- 4. CUSTOMERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    customer_code VARCHAR(50) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50),
    alternate_phone VARCHAR(50),
    alternate_whatsapp VARCHAR(50),
    gender VARCHAR(20) DEFAULT 'male',
    user_type VARCHAR(50) DEFAULT 'End User',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Patches for existing customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS alternate_whatsapp VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'male';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'End User';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(customer_code);

-- ============================================================================
-- 5. DEVICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    color VARCHAR(50),
    storage_capacity VARCHAR(50),
    imei VARCHAR(50),
    serial_number VARCHAR(100),
    passcode VARCHAR(50),
    operating_system VARCHAR(50) DEFAULT 'iOS',
    invoice_date DATE,
    invoice_number VARCHAR(100),
    expiry_date DATE,
    cosmetic_condition VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON public.devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON public.devices(customer_id);

-- ============================================================================
-- 6. REPAIR JOBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    assigned_technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    service_type VARCHAR(50) DEFAULT 'Pending',
    customer_complaint TEXT NOT NULL,
    
    device_condition JSONB DEFAULT '{"screen":"INTACT","body":"GOOD","camera_glass":"INTACT","charging_port":"FUNCTIONAL","speaker":"FUNCTIONAL","microphone":"FUNCTIONAL","buttons":"FUNCTIONAL","water_damage":false,"scratches":"MINOR","cracks":"NONE","notes":""}'::jsonb,
    accessories_received JSONB DEFAULT '[]'::jsonb,
    
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'amount',
    discount_value NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    balance_due NUMERIC(12, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'UNPAID',
    
    is_warranty_claim BOOLEAN DEFAULT FALSE,
    reopen_count INT DEFAULT 0,
    warranty_same_issue BOOLEAN DEFAULT FALSE,
    reopened_at TIMESTAMPTZ,
    reopened_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    warranty_claim_type VARCHAR(50),
    warranty_free_rework BOOLEAN DEFAULT FALSE,
    last_warranty_issue TEXT,
    reopen_notes TEXT,
    previous_delivered_at TIMESTAMPTZ,
    approval_notes TEXT,
    previous_total_amount NUMERIC(12, 2) DEFAULT 0.00,
    previous_balance_due NUMERIC(12, 2) DEFAULT 0.00,

    customer_tested_device BOOLEAN DEFAULT FALSE,
    customer_acceptance_confirmed BOOLEAN DEFAULT FALSE,
    customer_signature TEXT,
    delivery_notes TEXT,
    delivered_at TIMESTAMPTZ,
    delivered_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    payment_remaining_authorized BOOLEAN DEFAULT FALSE,
    
    approval_token VARCHAR(100) UNIQUE,
    approval_status VARCHAR(50) DEFAULT 'PENDING',
    approval_decision_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    warranty_days INT DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Patches for existing repair_jobs table
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS payment_remaining_authorized BOOLEAN DEFAULT FALSE;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS is_warranty_claim BOOLEAN DEFAULT FALSE;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS reopen_count INT DEFAULT 0;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_same_issue BOOLEAN DEFAULT FALSE;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS reopened_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_claim_type VARCHAR(50);
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_free_rework BOOLEAN DEFAULT FALSE;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS last_warranty_issue TEXT;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS reopen_notes TEXT;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS previous_delivered_at TIMESTAMPTZ;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS customer_tested_device BOOLEAN DEFAULT FALSE;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS customer_acceptance_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS customer_signature TEXT;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS delivered_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_repair_jobs_job_number ON public.repair_jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_status ON public.repair_jobs(status);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_customer_id ON public.repair_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_technician_id ON public.repair_jobs(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_created_at ON public.repair_jobs(created_at DESC);

-- ============================================================================
-- 7. JOB STATUS HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    action_title VARCHAR(150) NOT NULL,
    notes TEXT,
    performed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON public.job_status_history(job_id);

-- ============================================================================
-- 8. DIAGNOSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    diagnosed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reported_issue TEXT NOT NULL,
    technician_findings TEXT DEFAULT '',
    root_cause TEXT,
    recommended_solution TEXT NOT NULL,
    internal_technician_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.diagnoses ALTER COLUMN technician_findings SET DEFAULT '';
ALTER TABLE public.diagnoses ALTER COLUMN technician_findings DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diagnoses_job_id ON public.diagnoses(job_id);

-- ============================================================================
-- 9. PARTS & INVENTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    part_code VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    part_number VARCHAR(100),
    brand VARCHAR(100),
    category VARCHAR(100) DEFAULT 'Display',
    compatible_models TEXT,
    purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 3,
    supplier VARCHAR(150),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parts_category ON public.parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_name ON public.parts(name);

-- ============================================================================
-- 10. PART STOCK MOVEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.part_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_part_movements_part_id ON public.part_stock_movements(part_id);

-- ============================================================================
-- 11. REPAIR ESTIMATES & ESTIMATE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    labor_charge NUMERIC(12, 2) DEFAULT 0.00,
    parts_subtotal NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'amount',
    discount_value NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'SENT',
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.repair_estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES public.repair_estimates(id) ON DELETE CASCADE,
    part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    warranty VARCHAR(100) DEFAULT '90 Days',
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estimate_items_est_id ON public.repair_estimate_items(estimate_id);

-- ============================================================================
-- 12. REPAIR JOB PARTS & LABOR
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_job_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
    part_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    installed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.repair_job_labor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    labor_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hours_or_units NUMERIC(6, 2) DEFAULT 1.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. REPAIR TESTS (Quality Checklist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    test_key VARCHAR(100) NOT NULL,
    test_label VARCHAR(150) NOT NULL,
    result VARCHAR(30) NOT NULL DEFAULT 'NOT_TESTED',
    notes TEXT,
    tested_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repair_tests_job_id ON public.repair_tests(job_id);

-- ============================================================================
-- 14. PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    transaction_reference VARCHAR(150),
    received_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments(job_id);

-- ============================================================================
-- 15. INVOICES & INVOICE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    labor_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    parts_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'amount',
    discount_value NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'PAID',
    warranty_period VARCHAR(100) DEFAULT '90 Days Limited Hardware Warranty',
    notes TEXT,
    pdf_url TEXT,
    issued_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON public.invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    warranty VARCHAR(100) DEFAULT '90 Days',
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv_id ON public.invoice_items(invoice_id);

-- ============================================================================
-- 16. ATTACHMENTS, NOTIFICATIONS & NOTIFICATION LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_job_id ON public.attachments(job_id);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    notification_type VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    channel VARCHAR(30) NOT NULL,
    message_type VARCHAR(80) NOT NULL,
    recipient VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    provider VARCHAR(50),
    provider_response JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_job_id ON public.notification_logs(job_id);

-- ============================================================================
-- 17. SETTINGS & BACKUP LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    status VARCHAR(30) NOT NULL DEFAULT 'RUNNING',
    filename VARCHAR(255),
    drive_file_id VARCHAR(255),
    drive_folder_id VARCHAR(255),
    file_size_bytes BIGINT,
    checksum_md5 VARCHAR(64),
    duration_ms INT,
    error_message TEXT,
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at ON public.backup_logs(started_at DESC);

-- ============================================================================
-- 18. SALES (Direct Retail Billing & GST Invoices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_no_seq INT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    customer_address TEXT,
    place_of_supply VARCHAR(100) DEFAULT 'Gujarat',
    customer_gstin VARCHAR(50),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'amount',
    discount_value NUMERIC(12, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_enabled BOOLEAN DEFAULT FALSE,
    gst_type VARCHAR(20) DEFAULT 'cgst_sgst',
    gst_rate NUMERIC(5, 2) DEFAULT 18.00,
    igst_rate NUMERIC(5, 2) DEFAULT 0.00,
    igst_amount NUMERIC(12, 2) DEFAULT 0.00,
    cgst_rate NUMERIC(5, 2) DEFAULT 9.00,
    cgst_amount NUMERIC(12, 2) DEFAULT 0.00,
    sgst_rate NUMERIC(5, 2) DEFAULT 9.00,
    sgst_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_tax NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50) DEFAULT 'CASH',
    payment_status VARCHAR(50) DEFAULT 'PAID',
    bank_details JSONB DEFAULT '{}'::jsonb,
    terms_conditions JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    issued_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    issued_by_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Column Patches for existing sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100) DEFAULT 'Gujarat';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(50);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS issued_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS issued_by_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON public.sales(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON public.sales(invoice_date DESC);

-- ============================================================================
-- 19. VENDORS MASTER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    mobile VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    address TEXT,
    gst_number VARCHAR(50),
    opening_balance NUMERIC(12, 2) DEFAULT 0.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON public.vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_mobile ON public.vendors(mobile);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);

-- ============================================================================
-- 20. VENDOR TRANSACTIONS (Send / Receive / Inward / Return Chalans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txn_number VARCHAR(100) UNIQUE NOT NULL,
    parent_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    txn_type VARCHAR(50) NOT NULL,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
    txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    total_mobiles INT DEFAULT 0,
    total_estimated_cost NUMERIC(12, 2) DEFAULT 0.00,
    total_actual_cost NUMERIC(12, 2) DEFAULT 0.00,
    total_cost NUMERIC(12, 2) DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_mode VARCHAR(50),
    payment_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS parent_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS total_mobiles INT DEFAULT 0;
ALTER TABLE public.vendor_transactions ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_vendor_txns_vendor_id ON public.vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_type ON public.vendor_transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_date ON public.vendor_transactions(txn_date DESC);

-- ============================================================================
-- 21. VENDOR MOBILES (Handset unit tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_mobiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
    send_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    return_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    flow_type VARCHAR(50) NOT NULL DEFAULT 'OUTWARD',
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    imei VARCHAR(50),
    customer_name VARCHAR(255),
    repair_problem TEXT NOT NULL,
    condition TEXT,
    accessories TEXT,
    expected_return_date DATE,
    estimated_cost NUMERIC(12, 2) DEFAULT 0.00,
    actual_cost NUMERIC(12, 2) DEFAULT 0.00,
    repair_result VARCHAR(50) DEFAULT 'PENDING',
    current_status VARCHAR(50) NOT NULL DEFAULT 'AT_VENDOR',
    sent_date DATE,
    received_date DATE,
    returned_date DATE,
    warranty VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS warranty VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_vendor_id ON public.vendor_mobiles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_status ON public.vendor_mobiles(current_status);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_flow_type ON public.vendor_mobiles(flow_type);

-- ============================================================================
-- 22. VENDOR STATUS HISTORY & LEDGER
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

CREATE TABLE IF NOT EXISTS public.vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_no VARCHAR(100) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
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
-- 23. RECYCLE BIN (SOFT DELETE WITH 30-DAY RETENTION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recycle_bin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'job' | 'sale' | 'vendor' | 'vendor_mobile' | 'customer' | 'part'
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
-- 24. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_job_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_mobiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Allow all on shops" ON public.shops FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on roles" ON public.roles FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on devices" ON public.devices FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_jobs" ON public.repair_jobs FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on job_status_history" ON public.job_status_history FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on diagnoses" ON public.diagnoses FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on parts" ON public.parts FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on part_stock_movements" ON public.part_stock_movements FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_estimates" ON public.repair_estimates FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_estimate_items" ON public.repair_estimate_items FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_job_parts" ON public.repair_job_parts FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_job_labor" ON public.repair_job_labor FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_tests" ON public.repair_tests FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on attachments" ON public.attachments FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on notification_logs" ON public.notification_logs FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on backup_logs" ON public.backup_logs FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_transactions" ON public.vendor_transactions FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_mobiles" ON public.vendor_mobiles FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_status_history" ON public.vendor_status_history FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_ledger" ON public.vendor_ledger FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_payments" ON public.vendor_payments FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on recycle_bin" ON public.recycle_bin FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Migration completed successfully.

