-- ============================================================================
-- ALL-IN-ONE MASTER SUPABASE SQL SCHEMA (COMPLETE & IDEMPOTENT)
-- MOBILE REPAIR MANAGEMENT SYSTEM — PRODUCTION CONSOLIDATED
-- SHOP: Mobotech Mobile Care
-- DATE: 2026-11-21
--
-- INSTRUCTIONS FOR SUPABASE:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Open the SQL Editor (left menu > "SQL Editor" or "New query")
-- 3. Paste this ENTIRE file into the editor
-- 4. Click the green "RUN" button (Ctrl+Enter or Cmd+Enter)
--
-- GUARANTEES ("MAKE SURE OLD NOT BREAK"):
-- - 100% IDEMPOTENT: Safe to run on blank databases OR existing databases.
-- - No data loss: Every column and table is guarded with IF NOT EXISTS.
-- - Contains all 34 system tables.
-- - Seeds Mobotech Mobile Care shop profile and default admin/developer accounts.
-- - Sets up Row Level Security (RLS) policies for all 34 tables.
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SHOPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT 'Mobotech mobile care',
    tagline VARCHAR(255) DEFAULT 'Professional Smartphone & Tablet Repair Services',
    logo_url TEXT DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '080000 24439',
    email VARCHAR(255) NOT NULL DEFAULT 'support@mobotech.com',
    address TEXT NOT NULL DEFAULT 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar',
    city VARCHAR(100) DEFAULT 'Surat',
    state VARCHAR(100) DEFAULT 'Gujarat',
    postal_code VARCHAR(20) DEFAULT '395006',
    country VARCHAR(100) DEFAULT 'India',
    tax_number VARCHAR(100) DEFAULT '24ABCDE1234F1Z5',
    website VARCHAR(255) DEFAULT 'https://mobotechcare.com',
    currency VARCHAR(10) DEFAULT 'INR',
    currency_symbol VARCHAR(10) DEFAULT '₹',
    warranty_terms TEXT DEFAULT 'All repairs are covered by our standard 90-day warranty against manufacturer defects on installed components. Physical or liquid damage after repair voids warranty.',
    terms_conditions TEXT DEFAULT 'Devices left unclaimed for more than 45 days after Ready for Pickup notification may be disposed of according to state salvage regulations.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '080000 24439';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS warranty_terms TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

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
('developer', 'Developer', 'Full system access for software development, debugging, and maintenance'),
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
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);

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
    date_of_birth DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS alternate_whatsapp VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'male';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'End User';
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON public.customers(full_name);

-- ============================================================================
-- 5. DEVICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    device_type VARCHAR(50) DEFAULT 'Mobile',
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    color VARCHAR(50),
    imei VARCHAR(50),
    serial_number VARCHAR(100),
    screen_lock_type VARCHAR(30) DEFAULT 'NONE',
    screen_lock_code VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS imei VARCHAR(50);
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS screen_lock_type VARCHAR(30) DEFAULT 'NONE';
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS screen_lock_code VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON public.devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON public.devices(imei);

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
    warranty_rework_reason TEXT,
    warranty_history JSONB DEFAULT '[]'::jsonb,
    reopen_notes TEXT,
    previous_delivered_at TIMESTAMPTZ,
    approval_notes TEXT,

    customer_tested_device BOOLEAN DEFAULT FALSE,
    customer_acceptance_confirmed BOOLEAN DEFAULT FALSE,
    customer_signature TEXT,
    delivery_notes TEXT,
    delivered_at TIMESTAMPTZ,
    delivered_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    payment_remaining_authorized BOOLEAN DEFAULT FALSE,

    vendor_sent_at TIMESTAMPTZ,
    vendor_expected_back_date DATE,

    approval_token VARCHAR(100) UNIQUE,
    approval_status VARCHAR(50) DEFAULT 'PENDING',
    approval_decision_at TIMESTAMPTZ,
    rejection_reason TEXT,

    warranty_days INT DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS payment_remaining_authorized BOOLEAN DEFAULT FALSE;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS vendor_sent_at TIMESTAMPTZ;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS vendor_expected_back_date DATE;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS reopen_count INT DEFAULT 0;

-- Merge legacy status safely
UPDATE public.repair_jobs SET status = 'CANCELLED' WHERE status = 'RETURNED_UNREPAIRED';

CREATE INDEX IF NOT EXISTS idx_repair_jobs_job_number ON public.repair_jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_status ON public.repair_jobs(status);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_customer_id ON public.repair_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_technician_id ON public.repair_jobs(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_vendor_sent_at ON public.repair_jobs(vendor_sent_at);
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
    technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    technician_notes TEXT NOT NULL,
    estimated_cost NUMERIC(12, 2) DEFAULT 0.00,
    estimated_completion_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
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
    warranty TEXT DEFAULT '90 Days',
    serial_number TEXT DEFAULT '',
    imei TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS warranty TEXT DEFAULT '90 Days';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS serial_number TEXT DEFAULT '';
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS imei TEXT DEFAULT '';
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
    cost_per_unit NUMERIC(12, 2),
    notes TEXT,
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_part_id ON public.part_stock_movements(part_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_job_id ON public.part_stock_movements(job_id);

-- ============================================================================
-- 11. REPAIR ESTIMATES & ESTIMATE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    estimate_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'PENDING',
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON public.repair_estimates(job_id);

CREATE TABLE IF NOT EXISTS public.repair_estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES public.repair_estimates(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON public.repair_estimate_items(estimate_id);

-- ============================================================================
-- 12. REPAIR JOB PARTS & LABOR
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_job_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    warranty_months INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repair_job_parts_job ON public.repair_job_parts(job_id);

CREATE TABLE IF NOT EXISTS public.repair_job_labor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    labor_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hours NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repair_job_labor_job ON public.repair_job_labor(job_id);

-- ============================================================================
-- 13. REPAIR TESTS (QUALITY CONTROL / QC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    notes TEXT,
    tested_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tested_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repair_tests_job_id ON public.repair_tests(job_id);

-- ============================================================================
-- 14. PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    payment_status VARCHAR(50) DEFAULT 'PAID',
    transaction_reference VARCHAR(150),
    notes TEXT,
    received_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);

-- ============================================================================
-- 15. INVOICES & INVOICE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    balance_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'UNPAID',
    payment_method VARCHAR(50),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON public.invoices(job_id);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    warranty_info VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ============================================================================
-- 16. ATTACHMENTS & NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes INT,
    uploaded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_job_id ON public.attachments(job_id);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    title VARCHAR(200) NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'SYSTEM';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

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
    provider_response JSONB DEFAULT NULL,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.notification_logs ALTER COLUMN provider_response DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_logs_job_id ON public.notification_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_customer_id ON public.notification_logs(customer_id);

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
    filename VARCHAR(255) NOT NULL,
    drive_file_id VARCHAR(150),
    drive_folder_id VARCHAR(150),
    file_size_bytes BIGINT,
    checksum_md5 VARCHAR(100),
    duration_ms INT,
    error_message TEXT,
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON public.backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at ON public.backup_logs(started_at DESC);

-- ============================================================================
-- 18. SALES (DIRECT POS / INVENTORY SALES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'amount',
    discount_value NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'CASH',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    terms_conditions TEXT,
    bank_details JSONB,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    created_by VARCHAR(100) DEFAULT 'Staff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON public.sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON public.sales(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);

-- ============================================================================
-- 19. VENDORS & VENDOR TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    gst_number VARCHAR(100),
    upi_id VARCHAR(150),
    bank_name VARCHAR(150),
    bank_account_no VARCHAR(100),
    bank_ifsc VARCHAR(50),
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    specialty VARCHAR(120),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS specialty VARCHAR(120);
UPDATE public.vendors SET phone = mobile WHERE phone IS NULL AND mobile IS NOT NULL;
UPDATE public.vendors SET mobile = phone WHERE mobile IS NULL AND phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_phone ON public.vendors(phone);
CREATE INDEX IF NOT EXISTS idx_vendors_mobile ON public.vendors(mobile);

CREATE TABLE IF NOT EXISTS public.vendor_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
    txn_type VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    running_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50),
    reference_no VARCHAR(100),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_vendor_id ON public.vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_date ON public.vendor_transactions(date DESC);

-- ============================================================================
-- 20. VENDOR MOBILES (OUTSOURCED REPAIRS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_mobiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
    chalan_no VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    imei VARCHAR(100),
    fault_description TEXT NOT NULL,
    sent_cost NUMERIC(12, 2) DEFAULT 0.00,
    expected_cost NUMERIC(12, 2) DEFAULT 0.00,
    final_cost NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'SENT',
    sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    return_date DATE,
    notes TEXT,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    repair_job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS repair_job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_mobiles ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_vendor_id ON public.vendor_mobiles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_chalan_no ON public.vendor_mobiles(chalan_no);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_repair_job ON public.vendor_mobiles(repair_job_id);

CREATE TABLE IF NOT EXISTS public.vendor_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_mobile_id UUID NOT NULL REFERENCES public.vendor_mobiles(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendor_history_mobile_id ON public.vendor_status_history(vendor_mobile_id);

-- ============================================================================
-- 21. VENDOR LEDGER & PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
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
-- 22. RECYCLE BIN (SOFT DELETE WITH 30-DAY RETENTION)
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
-- 23. GOOGLE REVIEW ASSISTANT (SETTINGS & INVITATION REQUESTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.review_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    google_review_url TEXT DEFAULT 'https://g.page/r/CROHWMY3TX9dEBM/review',
    review_dialog_url TEXT DEFAULT 'https://g.page/r/CROHWMY3TX9dEBM/review',
    is_enabled BOOLEAN DEFAULT TRUE,
    invitation_channel VARCHAR(20) DEFAULT 'WHATSAPP',
    invitation_message TEXT DEFAULT 'Thank you for choosing {shop_name}! We hope your repair experience was good. We would appreciate your honest feedback. Please share your experience here: {review_link}',
    ai_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_settings_shop ON public.review_settings(shop_id);

CREATE TABLE IF NOT EXISTS public.review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    unique_token VARCHAR(128) NOT NULL UNIQUE,
    unique_token_hash VARCHAR(128) NOT NULL UNIQUE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    customer_feedback TEXT,
    generated_review TEXT,
    edited_review TEXT,
    ai_provider VARCHAR(50),
    invitation_status VARCHAR(30) DEFAULT 'PENDING',
    invitation_sent_at TIMESTAMPTZ,
    review_page_opened_at TIMESTAMPTZ,
    google_redirected_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_review_requests_job_id UNIQUE (job_id)
);
ALTER TABLE public.review_requests ADD COLUMN IF NOT EXISTS unique_token VARCHAR(128);
ALTER TABLE public.review_requests ADD COLUMN IF NOT EXISTS unique_token_hash VARCHAR(128);
ALTER TABLE public.review_requests ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE;
ALTER TABLE public.review_requests ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;
ALTER TABLE public.review_requests ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(30) DEFAULT 'PENDING';
CREATE INDEX IF NOT EXISTS idx_review_requests_token_hash ON public.review_requests(unique_token_hash);
CREATE INDEX IF NOT EXISTS idx_review_requests_token ON public.review_requests(unique_token);
CREATE INDEX IF NOT EXISTS idx_review_requests_job ON public.review_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON public.review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON public.review_requests(invitation_status);

-- ============================================================================
-- 24. ASSET BACKUP STORAGE (APP LOGOS & MEDIA ASSETS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public._app_backup_assets (
    file_name TEXT PRIMARY KEY,
    mime_type TEXT,
    asset_type TEXT,
    public_url TEXT,
    size_bytes BIGINT,
    data_base64 TEXT,
    created_at TEXT
);

-- ============================================================================
-- 25. SEED INITIAL CORE DATA (MOBOTECH MOBILE CARE & USERS)
-- ============================================================================
INSERT INTO public.shops (
    id, name, tagline, phone, email, address, city, state, postal_code, country, tax_number, website, currency, currency_symbol
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Mobotech mobile care',
    'Professional Smartphone & Tablet Repair Services',
    '080000 24439',
    'support@mobotech.com',
    'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar',
    'Surat',
    'Gujarat',
    '395006',
    'India',
    '24ABCDE1234F1Z5',
    'https://mobotechcare.com',
    'INR',
    '₹'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (
    id, role_id, full_name, email, password_hash, phone, is_active
) VALUES 
(
    '10000000-0000-0000-0000-000000000001',
    'admin',
    'Shop Owner',
    'admin@mobotech.com',
    '$2b$10$FAOQJQo5YAUVcBEWAG6Nk.bWO3fhPfmNuNV5k8raCEtNmYjtjo8UO',
    '080000 24439',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000007',
    'developer',
    'Developer',
    'developer@mobotech.com',
    '$2b$10$FAOQJQo5YAUVcBEWAG6Nk.bWO3fhPfmNuNV5k8raCEtNmYjtjo8UO',
    '080000 24439',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000002',
    'technician',
    'Lead Technician',
    'tech@mobotech.com',
    '$2b$10$FAOQJQo5YAUVcBEWAG6Nk.bWO3fhPfmNuNV5k8raCEtNmYjtjo8UO',
    '080000 24439',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000003',
    'staff',
    'Front Desk Staff',
    'staff@mobotech.com',
    '$2b$10$FAOQJQo5YAUVcBEWAG6Nk.bWO3fhPfmNuNV5k8raCEtNmYjtjo8UO',
    '080000 24439',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.review_settings (
    id, shop_id, google_review_url, review_dialog_url, is_enabled, invitation_channel, ai_enabled
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'https://g.page/r/CROHWMY3TX9dEBM/review',
    'https://g.page/r/CROHWMY3TX9dEBM/review',
    TRUE,
    'WHATSAPP',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 26. ROW LEVEL SECURITY (RLS) POLICIES
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
ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._app_backup_assets ENABLE ROW LEVEL SECURITY;

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
DO $$ BEGIN CREATE POLICY "Allow all on review_settings" ON public.review_settings FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on review_requests" ON public.review_requests FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on app_backup_assets" ON public._app_backup_assets FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
