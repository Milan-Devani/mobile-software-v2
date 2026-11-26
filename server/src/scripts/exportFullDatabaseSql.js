/**
 * Full Production Database SQL Exporter (Schema + Live Data)
 *
 * Connects (READ-ONLY) to the live Supabase production database, introspects
 * the live PostgREST OpenAPI schema and storage buckets, fetches 100% of live
 * rows (with pagination), and writes a single standalone, 100% idempotent
 * PostgreSQL/Supabase SQL file suitable for creating a separate local/staging
 * database without touching or breaking the existing production database.
 *
 * Usage:
 *   node src/scripts/exportFullDatabaseSql.js
 *   node src/scripts/exportFullDatabaseSql.js --out ../supabase/complete_database_clone.sql
 *   node src/scripts/exportFullDatabaseSql.js --include-secrets   (opt-in for OAuth tokens in settings)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const INCLUDE_SECRETS = args.includes('--include-secrets');
const outArgIdx = args.indexOf('--out');
const OUTPUT_PATH = outArgIdx !== -1 && args[outArgIdx + 1]
  ? path.resolve(process.cwd(), args[outArgIdx + 1])
  : path.resolve(__dirname, '../../../supabase/complete_database_clone.sql');

// OAuth secret keys in `public.settings` that should NOT be copied into a
// separate local/dev database by default (prevents leaking credentials and
// prevents local backups from writing to production Google Drive folders).
const EXCLUDED_SETTING_KEYS = new Set([
  'google_drive_refresh_token',
  'google_drive_refresh_token_2',
]);

/**
 * Exact live production DDL definitions in strict topological FK order
 * (parents always created and populated before children — zero superuser
 * session_replication_role hacks required).
 */
const TABLE_SPECS = [
  {
    name: 'shops',
    createSql: `CREATE TABLE IF NOT EXISTS public.shops (
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
    currency VARCHAR(10) DEFAULT 'USD',
    currency_symbol VARCHAR(10) DEFAULT '$',
    warranty_terms TEXT DEFAULT 'All repairs are covered by our standard 90-day warranty against manufacturer defects on installed components. Physical or liquid damage after repair voids warranty.',
    terms_conditions TEXT DEFAULT 'Devices left unclaimed for more than 45 days after Ready for Pickup notification may be disposed of according to state salvage regulations.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [],
  },
  {
    name: 'roles',
    createSql: `CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [],
  },
  {
    name: 'settings',
    createSql: `CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [],
  },
  {
    name: 'recycle_bin',
    createSql: `CREATE TABLE IF NOT EXISTS public.recycle_bin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_by VARCHAR(100) DEFAULT 'Staff',
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    purge_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_recycle_bin_entity_type ON public.recycle_bin(entity_type);',
      'CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON public.recycle_bin(deleted_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_recycle_bin_purge_at ON public.recycle_bin(purge_at ASC);',
    ],
  },
  {
    name: '_app_backup_assets',
    createSql: `CREATE TABLE IF NOT EXISTS public._app_backup_assets (
    file_name TEXT PRIMARY KEY,
    mime_type TEXT,
    asset_type TEXT,
    public_url TEXT,
    size_bytes BIGINT,
    data_base64 TEXT,
    created_at TEXT
);`,
    indexes: [],
  },
  {
    name: 'users',
    createSql: `CREATE TABLE IF NOT EXISTS public.users (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);',
    ],
  },
  {
    name: 'customers',
    createSql: `CREATE TABLE IF NOT EXISTS public.customers (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);',
      'CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);',
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);',
      'CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(customer_code);',
      'CREATE INDEX IF NOT EXISTS idx_customers_dob ON public.customers(date_of_birth);',
    ],
  },
  {
    name: 'parts',
    createSql: `CREATE TABLE IF NOT EXISTS public.parts (
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
    warranty TEXT DEFAULT '90 Days',
    serial_number TEXT DEFAULT '',
    imei TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_parts_category ON public.parts(category);',
      'CREATE INDEX IF NOT EXISTS idx_parts_name ON public.parts(name);',
      'CREATE INDEX IF NOT EXISTS idx_parts_status ON public.parts(status);',
    ],
  },
  {
    name: 'vendors',
    createSql: `CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    mobile VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    specialization TEXT,
    specialty VARCHAR(120),
    address TEXT,
    gst_number VARCHAR(50),
    opening_balance NUMERIC(12, 2) DEFAULT 0.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_vendors_code ON public.vendors(vendor_code);',
      'CREATE INDEX IF NOT EXISTS idx_vendors_mobile ON public.vendors(mobile);',
      'CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);',
    ],
  },
  {
    name: 'review_settings',
    createSql: `CREATE TABLE IF NOT EXISTS public.review_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    google_review_url TEXT DEFAULT 'https://share.google/PA9yRD74h2EQR4cgO',
    is_enabled BOOLEAN DEFAULT TRUE,
    invitation_channel VARCHAR(20) DEFAULT 'WHATSAPP',
    invitation_message TEXT DEFAULT 'Thank you for choosing {shop_name}! We hope your repair experience was good. We would appreciate your honest feedback. Please share your experience here: {review_link}',
    ai_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [],
  },
  {
    name: 'devices',
    createSql: `CREATE TABLE IF NOT EXISTS public.devices (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_devices_imei ON public.devices(imei);',
      'CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON public.devices(customer_id);',
    ],
  },
  {
    name: 'backup_logs',
    createSql: `CREATE TABLE IF NOT EXISTS public.backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    status VARCHAR(30) NOT NULL DEFAULT 'RUNNING',
    filename VARCHAR(255),
    drive_file_id VARCHAR(255),
    drive_folder_id VARCHAR(255),
    drive_file_id_2 VARCHAR(255),
    drive_folder_id_2 VARCHAR(255),
    file_size_bytes BIGINT,
    checksum_md5 VARCHAR(64),
    duration_ms INT,
    error_message TEXT,
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at ON public.backup_logs(started_at DESC);',
    ],
  },
  {
    name: 'sales',
    createSql: `CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_no_seq INT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    customer_address TEXT,
    place_of_supply VARCHAR(100) DEFAULT 'Gujarat ( 24 )',
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);',
      'CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON public.sales(customer_phone);',
      'CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON public.sales(invoice_date DESC);',
    ],
  },
  {
    name: 'vendor_transactions',
    selfRefColumn: 'parent_txn_id',
    createSql: `CREATE TABLE IF NOT EXISTS public.vendor_transactions (
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
    payment_mode VARCHAR(50),
    payment_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_vendor_txns_vendor_id ON public.vendor_transactions(vendor_id);',
      'CREATE INDEX IF NOT EXISTS idx_vendor_txns_type ON public.vendor_transactions(txn_type);',
      'CREATE INDEX IF NOT EXISTS idx_vendor_txns_date ON public.vendor_transactions(txn_date DESC);',
    ],
  },
  {
    name: 'vendor_payments',
    createSql: `CREATE TABLE IF NOT EXISTS public.vendor_payments (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON public.vendor_payments(vendor_id);',
      'CREATE INDEX IF NOT EXISTS idx_vendor_payments_voucher ON public.vendor_payments(voucher_no);',
    ],
  },
  {
    name: 'repair_jobs',
    createSql: `CREATE TABLE IF NOT EXISTS public.repair_jobs (
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
    tax_rate NUMERIC(5, 2) DEFAULT 8.25,
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
    warranty_parts JSONB DEFAULT '[]'::jsonb,
    advance_amount NUMERIC(12, 2) DEFAULT 0.00,
    remaining_authorized_balance NUMERIC(12, 2) DEFAULT 0.00,
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
    vendor_sent_at TIMESTAMPTZ,
    vendor_expected_back_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_repair_jobs_job_number ON public.repair_jobs(job_number);',
      'CREATE INDEX IF NOT EXISTS idx_repair_jobs_status ON public.repair_jobs(status);',
      'CREATE INDEX IF NOT EXISTS idx_repair_jobs_customer_id ON public.repair_jobs(customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_repair_jobs_technician_id ON public.repair_jobs(assigned_technician_id);',
      'CREATE INDEX IF NOT EXISTS idx_repair_jobs_created_at ON public.repair_jobs(created_at DESC);',
    ],
  },
  {
    name: 'job_status_history',
    createSql: `CREATE TABLE IF NOT EXISTS public.job_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    action_title VARCHAR(150) NOT NULL,
    notes TEXT,
    performed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON public.job_status_history(job_id);',
    ],
  },
  {
    name: 'diagnoses',
    createSql: `CREATE TABLE IF NOT EXISTS public.diagnoses (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_diagnoses_job_id ON public.diagnoses(job_id);',
    ],
  },
  {
    name: 'part_stock_movements',
    createSql: `CREATE TABLE IF NOT EXISTS public.part_stock_movements (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_part_movements_part_id ON public.part_stock_movements(part_id);',
    ],
  },
  {
    name: 'repair_estimates',
    createSql: `CREATE TABLE IF NOT EXISTS public.repair_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    labor_charge NUMERIC(12, 2) DEFAULT 0.00,
    parts_subtotal NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'amount',
    discount_value NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 8.25,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'SENT',
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_repair_estimates_job_id ON public.repair_estimates(job_id);',
    ],
  },
  {
    name: 'repair_job_parts',
    createSql: `CREATE TABLE IF NOT EXISTS public.repair_job_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
    part_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    installed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_repair_job_parts_job_id ON public.repair_job_parts(job_id);',
    ],
  },
  {
    name: 'repair_job_labor',
    createSql: `CREATE TABLE IF NOT EXISTS public.repair_job_labor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    labor_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hours_or_units NUMERIC(6, 2) DEFAULT 1.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_repair_job_labor_job_id ON public.repair_job_labor(job_id);',
    ],
  },
  {
    name: 'repair_tests',
    createSql: `CREATE TABLE IF NOT EXISTS public.repair_tests (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_repair_tests_job_id ON public.repair_tests(job_id);',
    ],
  },
  {
    name: 'payments',
    createSql: `CREATE TABLE IF NOT EXISTS public.payments (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments(job_id);',
    ],
  },
  {
    name: 'invoices',
    createSql: `CREATE TABLE IF NOT EXISTS public.invoices (
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
    tax_rate NUMERIC(5, 2) DEFAULT 8.25,
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON public.invoices(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);',
    ],
  },
  {
    name: 'attachments',
    createSql: `CREATE TABLE IF NOT EXISTS public.attachments (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_attachments_job_id ON public.attachments(job_id);',
    ],
  },
  {
    name: 'notifications',
    createSql: `CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    notification_type VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_notifications_job_id ON public.notifications(job_id);',
    ],
  },
  {
    name: 'vendor_mobiles',
    createSql: `CREATE TABLE IF NOT EXISTS public.vendor_mobiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.vendor_transactions(id) ON DELETE CASCADE,
    send_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    return_txn_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
    repair_job_id UUID REFERENCES public.repair_jobs(id) ON DELETE SET NULL,
    direction VARCHAR(50) DEFAULT 'OUTWARD',
    flow_type VARCHAR(50) NOT NULL DEFAULT 'OUTWARD',
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
    current_status VARCHAR(50) NOT NULL DEFAULT 'AT_VENDOR',
    sent_date DATE,
    received_date DATE,
    returned_date DATE,
    completed_date DATE,
    warranty VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_vendor_id ON public.vendor_mobiles(vendor_id);',
      'CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_status ON public.vendor_mobiles(current_status);',
      'CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_flow_type ON public.vendor_mobiles(flow_type);',
      'CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_imei ON public.vendor_mobiles(imei);',
      'CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_repair_job_id ON public.vendor_mobiles(repair_job_id) WHERE repair_job_id IS NOT NULL;',
    ],
  },
  {
    name: 'repair_estimate_items',
    createSql: `CREATE TABLE IF NOT EXISTS public.repair_estimate_items (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_estimate_items_est_id ON public.repair_estimate_items(estimate_id);',
    ],
  },
  {
    name: 'invoice_items',
    createSql: `CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    warranty VARCHAR(100) DEFAULT '90 Days',
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_inv_id ON public.invoice_items(invoice_id);',
    ],
  },
  {
    name: 'notification_logs',
    createSql: `CREATE TABLE IF NOT EXISTS public.notification_logs (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_notification_logs_job_id ON public.notification_logs(job_id);',
    ],
  },
  {
    name: 'review_requests',
    createSql: `CREATE TABLE IF NOT EXISTS public.review_requests (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_review_requests_token_hash ON public.review_requests(unique_token_hash);',
      'CREATE INDEX IF NOT EXISTS idx_review_requests_job_id ON public.review_requests(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_review_requests_customer_id ON public.review_requests(customer_id);',
    ],
  },
  {
    name: 'vendor_status_history',
    createSql: `CREATE TABLE IF NOT EXISTS public.vendor_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_mobile_id UUID NOT NULL REFERENCES public.vendor_mobiles(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_vsh_mobile_id ON public.vendor_status_history(vendor_mobile_id);',
    ],
  },
  {
    name: 'vendor_ledger',
    createSql: `CREATE TABLE IF NOT EXISTS public.vendor_ledger (
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
);`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_vendor_ledger_vendor_id ON public.vendor_ledger(vendor_id);',
      'CREATE INDEX IF NOT EXISTS idx_vendor_ledger_date ON public.vendor_ledger(date DESC);',
    ],
  },
];

/**
 * Maps an OpenAPI property metadata entry to a valid PostgreSQL column type
 * (used both for safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements
 * and for auto-discovering any new live columns).
 */
function openApiToPgType(meta) {
  const fmt = (meta.format || meta.type || 'text').toLowerCase();
  if (fmt === 'uuid') return 'UUID';
  if (fmt === 'character varying') return meta.maxLength ? `VARCHAR(${meta.maxLength})` : 'VARCHAR(255)';
  if (fmt === 'text' || fmt === 'string') return 'TEXT';
  if (fmt === 'jsonb' || fmt === 'json') return 'JSONB';
  if (fmt === 'boolean') return 'BOOLEAN';
  if (fmt === 'int32' || fmt === 'integer') return 'INT';
  if (fmt === 'int64' || fmt === 'bigint') return 'BIGINT';
  if (fmt === 'numeric' || fmt === 'number') return 'NUMERIC(12, 2)';
  if (fmt === 'date') return 'DATE';
  if (fmt === 'timestamp with time zone') return 'TIMESTAMPTZ';
  if (fmt === 'timestamp without time zone') return 'TIMESTAMP';
  return 'TEXT';
}

/**
 * Escapes a JavaScript string safely for PostgreSQL.
 * Uses standard SQL string literal for single-line ASCII/UTF-8 text and
 * PostgreSQL E'...' escape syntax whenever newlines/carriage returns/tabs exist
 * so every INSERT stays clean, single-line, and preserves exact whitespace.
 */
function quotePgString(str) {
  const s = String(str);
  const CR = String.fromCharCode(13);
  const LF = String.fromCharCode(10);
  const TAB = String.fromCharCode(9);
  const BS = String.fromCharCode(92);
  if (s.includes(CR) || s.includes(LF) || s.includes(TAB)) {
    const escaped = s
      .split(BS).join(BS + BS)
      .split("'").join("''")
      .split(CR).join(BS + 'r')
      .split(LF).join(BS + 'n')
      .split(TAB).join(BS + 't');
    return `E'${escaped}'`;
  }
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * Formats a row value into an exact PostgreSQL literal based on the live
 * column's actual OpenAPI/PostgreSQL type (never guessing by column name).
 */
function formatSqlValue(val, colMeta) {
  if (val === null || val === undefined) return 'NULL';

  const fmt = (colMeta?.format || colMeta?.type || '').toLowerCase();

  if (fmt === 'jsonb' || fmt === 'json') {
    const serialized = typeof val === 'string' ? val : JSON.stringify(val);
    // Validate JSON so malformed raw strings are JSON-encoded safely
    let jsonText = serialized;
    if (typeof val === 'string') {
      try {
        JSON.parse(val);
      } catch (_) {
        jsonText = JSON.stringify(val);
      }
    }
    return `${quotePgString(jsonText)}::jsonb`;
  }

  if (fmt === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }

  if (fmt === 'int32' || fmt === 'int64' || fmt === 'integer' || fmt === 'bigint' || fmt === 'numeric' || fmt === 'number') {
    const num = Number(val);
    if (!Number.isFinite(num)) return 'NULL';
    return String(num);
  }

  if (fmt === 'uuid') {
    return `${quotePgString(val)}::uuid`;
  }

  if (fmt === 'date') {
    return `${quotePgString(val)}::date`;
  }

  if (fmt === 'timestamp with time zone') {
    return `${quotePgString(val)}::timestamptz`;
  }

  if (fmt === 'timestamp without time zone') {
    return `${quotePgString(val)}::timestamp`;
  }

  // Fallback for TEXT / VARCHAR (or object accidentally in text column)
  if (typeof val === 'object') {
    return quotePgString(JSON.stringify(val));
  }
  return quotePgString(val);
}

/**
 * Topologically sorts rows for self-referencing tables (e.g. vendor_transactions.parent_txn_id)
 * so parent rows are always inserted before child rows.
 */
function sortSelfReferencingRows(rows, selfRefCol) {
  if (!selfRefCol || rows.length <= 1) return rows;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const visited = new Set();
  const sorted = [];

  function visit(row) {
    if (!row || visited.has(row.id)) return;
    visited.add(row.id);
    const parentId = row[selfRefCol];
    if (parentId && byId.has(parentId)) {
      visit(byId.get(parentId));
    }
    sorted.push(row);
  }

  for (const row of rows) visit(row);
  return sorted;
}

/**
 * Fetches 100% of rows from a Supabase table using paginated range queries.
 */
async function fetchAllRows(supabase, tableName) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1);
    if (error) {
      throw new Error(`Failed to fetch table "${tableName}": ${error.message}`);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

/**
 * Extracts column names declared inside a CREATE TABLE statement so we can
 * verify 100% coverage against the live PostgREST OpenAPI schema.
 */
const NL = String.fromCharCode(10);

function extractDeclaredColumns(createSql) {
  const declared = new Set();
  const lines = createSql.split(NL);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('CREATE ') || trimmed.startsWith(')') || trimmed.startsWith('CONSTRAINT ') || trimmed.startsWith('--')) {
      continue;
    }
    const match = trimmed.match(/^"?([a-zA-Z0-9_]+)"?\s+/);
    if (match) declared.add(match[1]);
  }
  return declared;
}

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('ERROR: Live Supabase credentials are not configured in server/.env.');
    process.exit(1);
  }

  const supabase = getSupabase();
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  // 1. Introspect live OpenAPI schema from PostgREST
  const openApiRes = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/openapi+json',
    },
  });
  if (!openApiRes.ok) {
    throw new Error(`OpenAPI introspection failed with HTTP ${openApiRes.status}`);
  }
  const openApi = await openApiRes.json();
  const liveDefs = openApi.definitions || {};
  const liveTableNames = Object.keys(liveDefs);

  // Check if live has any tables not yet in TABLE_SPECS and append them dynamically
  const specNames = new Set(TABLE_SPECS.map((t) => t.name));
  const extraLiveTables = liveTableNames.filter((t) => !specNames.has(t)).sort();
  for (const extraTable of extraLiveTables) {
    const props = liveDefs[extraTable]?.properties || {};
    const required = new Set(liveDefs[extraTable]?.required || []);
    const colLines = Object.entries(props).map(([col, meta]) => {
      const isPk = (meta.description || '').includes('<pk/>');
      const pgType = openApiToPgType(meta);
      const nn = required.has(col) && !isPk ? ' NOT NULL' : '';
      const pk = isPk ? ' PRIMARY KEY' : '';
      return `    "${col}" ${pgType}${pk}${nn}`;
    });
    TABLE_SPECS.push({
      name: extraTable,
      createSql: `CREATE TABLE IF NOT EXISTS public."${extraTable}" (${NL}${colLines.join(',' + NL)}${NL});`,
      indexes: [],
    });
  }

  // 2. Introspect live Storage buckets
  let storageBuckets = [{ id: 'repair-assets', name: 'repair-assets', public: true }];
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (Array.isArray(buckets) && buckets.length > 0) {
      storageBuckets = buckets.map((b) => ({
        id: b.id,
        name: b.name || b.id,
        public: Boolean(b.public),
      }));
    }
  } catch (_) {}

  // 3. Build SQL output
  const out = [];
  const generatedAt = new Date().toISOString();

  out.push('-- ============================================================================');
  out.push('-- COMPLETE PRODUCTION DATABASE CLONE (SCHEMA + LIVE DATA)');
  out.push('-- Project     : Mobotech Mobile Care — Mobile Repair Management System');
  out.push(`-- Generated   : ${generatedAt}`);
  out.push(`-- Tables      : ${TABLE_SPECS.length} tables (100% live production schema parity)`);
  out.push('--');
  out.push('-- HOW TO USE (SEPARATE LOCAL / STAGING SUPABASE PROJECT):');
  out.push('--   1. Create a NEW Supabase project (leave your live production DB untouched).');
  out.push('--   2. Open Supabase Dashboard -> SQL Editor -> New Query.');
  out.push('--   3. Paste this ENTIRE SQL file and click RUN.');
  out.push('--   4. Update your LOCAL server/.env SUPABASE_URL, SUPABASE_ANON_KEY, and');
  out.push('--      SUPABASE_SERVICE_ROLE_KEY to point to the NEW local Supabase project.');
  out.push('--');
  out.push('-- SAFETY GUARANTEES ("OLD WILL NOT BREAK"):');
  out.push('--   * 100% IDEMPOTENT: Safe on a brand-new blank database OR an existing DB.');
  out.push('--   * ZERO DROP / TRUNCATE / DELETE statements — existing data is never lost.');
  out.push('--   * Every table uses CREATE TABLE IF NOT EXISTS.');
  out.push('--   * Every column has ALTER TABLE ... ADD COLUMN IF NOT EXISTS guards.');
  out.push('--   * Every index uses CREATE INDEX IF NOT EXISTS.');
  out.push('--   * Every RLS policy is duplicate-safe.');
  out.push('--   * Every INSERT is in strict parent-before-child FK order (no superuser');
  out.push('--     session_replication_role required) and uses ON CONFLICT DO NOTHING.');
  out.push('-- ============================================================================');
  out.push('');
  out.push('BEGIN;');
  out.push('');
  out.push('-- Enable pgcrypto if available (gen_random_uuid() is built-in on PostgreSQL 13+)');
  out.push('DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "pgcrypto"; EXCEPTION WHEN OTHERS THEN NULL; END $$;');
  out.push('');
  out.push('-- ============================================================================');
  out.push('-- PART 1: TABLES & IDEMPOTENT COLUMN PATCHES (34 TABLES IN FK ORDER)');
  out.push('-- ============================================================================');

  for (let i = 0; i < TABLE_SPECS.length; i++) {
    const spec = TABLE_SPECS[i];
    const liveDef = liveDefs[spec.name];
    const declaredCols = extractDeclaredColumns(spec.createSql);

    out.push('');
    out.push(`-- ${i + 1}. public.${spec.name}`);
    out.push(spec.createSql);

    // Ensure every live column exists even if running against an older existing DB
    if (liveDef?.properties) {
      for (const [col, meta] of Object.entries(liveDef.properties)) {
        const isPk = (meta.description || '').includes('<pk/>');
        if (isPk) continue;
        const pgType = openApiToPgType(meta);
        if (!declaredCols.has(col)) {
          out.push(`-- Auto-detected live column not in base DDL:`);
        }
        out.push(`ALTER TABLE public."${spec.name}" ADD COLUMN IF NOT EXISTS "${col}" ${pgType};`);
      }
    }

    // Ensure known safe defaults/nullability patches on older schemas
    if (spec.name === 'diagnoses') {
      out.push(`ALTER TABLE public.diagnoses ALTER COLUMN technician_findings SET DEFAULT '';`);
      out.push(`ALTER TABLE public.diagnoses ALTER COLUMN technician_findings DROP NOT NULL;`);
    }
    if (spec.name === 'customers') {
      out.push(`ALTER TABLE public.customers ALTER COLUMN gender SET DEFAULT 'male';`);
      out.push(`ALTER TABLE public.customers ALTER COLUMN gender DROP NOT NULL;`);
    }
  }

  out.push('');
  out.push('-- ============================================================================');
  out.push('-- PART 2: INDEXES (IF NOT EXISTS)');
  out.push('-- ============================================================================');
  for (const spec of TABLE_SPECS) {
    for (const idxSql of spec.indexes) {
      out.push(idxSql);
    }
  }

  out.push('');
  out.push('-- ============================================================================');
  out.push('-- PART 3: ROW LEVEL SECURITY (RLS) & IDEMPOTENT POLICIES');
  out.push('-- ============================================================================');
  for (const spec of TABLE_SPECS) {
    out.push(`ALTER TABLE public."${spec.name}" ENABLE ROW LEVEL SECURITY;`);
  }
  out.push('');
  for (const spec of TABLE_SPECS) {
    out.push(
      `DO $$ BEGIN CREATE POLICY "Allow all on ${spec.name}" ON public."${spec.name}" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
    );
  }

  out.push('');
  out.push('-- ============================================================================');
  out.push('-- PART 4: SUPABASE STORAGE BUCKETS (SAFE NO-OP ON PLAIN POSTGRESQL)');
  out.push('-- ============================================================================');
  out.push('DO $$');
  out.push('BEGIN');
  out.push(`  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN`);
  for (const b of storageBuckets) {
    out.push(
      `    INSERT INTO storage.buckets (id, name, public) VALUES (${quotePgString(b.id)}, ${quotePgString(b.name)}, ${b.public ? 'TRUE' : 'FALSE'}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  out.push('  END IF;');
  out.push('EXCEPTION WHEN OTHERS THEN');
  out.push('  NULL;');
  out.push('END $$;');

  out.push('');
  out.push('-- ============================================================================');
  out.push('-- PART 5: LIVE PRODUCTION DATA (STRICT PARENT-TO-CHILD FK ORDER)');
  out.push('-- ============================================================================');

  let totalRowsExported = 0;
  let skippedSecretRows = 0;
  const tableStats = [];

  for (const spec of TABLE_SPECS) {
    const liveDef = liveDefs[spec.name];
    if (!liveDef) {
      tableStats.push({ table: spec.name, rows: 0, note: 'not in live OpenAPI' });
      continue;
    }

    let rows = await fetchAllRows(supabase, spec.name);
    if (spec.selfRefColumn) {
      rows = sortSelfReferencingRows(rows, spec.selfRefColumn);
    }

    // Stable deterministic ordering (by created_at / id / key)
    if (!spec.selfRefColumn && rows.length > 1) {
      rows.sort((a, b) => {
        const ka = String(a.created_at || a.id || a.key || a.file_name || '');
        const kb = String(b.created_at || b.id || b.key || b.file_name || '');
        return ka.localeCompare(kb);
      });
    }

    if (spec.name === 'settings' && !INCLUDE_SECRETS) {
      const before = rows.length;
      rows = rows.filter((r) => !EXCLUDED_SETTING_KEYS.has(r.key));
      skippedSecretRows = before - rows.length;
    }

    tableStats.push({ table: spec.name, rows: rows.length });

    if (rows.length === 0) {
      out.push('');
      out.push(`-- Table: public."${spec.name}" (0 rows on live production)`);
      continue;
    }

    const columns = Object.keys(rows[0]).filter((c) => liveDef.properties && c in liveDef.properties);
    const colList = columns.map((c) => `"${c}"`).join(', ');

    out.push('');
    out.push(`-- Table: public."${spec.name}" (${rows.length} row${rows.length === 1 ? '' : 's'})`);
    if (spec.name === 'settings' && skippedSecretRows > 0) {
      out.push(`-- Note: ${skippedSecretRows} production Google Drive OAuth refresh token row(s) intentionally omitted`);
      out.push('--       so your local/staging DB never overwrites production Google Drive backups.');
    }

    for (const row of rows) {
      const vals = columns.map((col) => formatSqlValue(row[col], liveDef.properties[col])).join(', ');
      out.push(`INSERT INTO public."${spec.name}" (${colList}) VALUES (${vals}) ON CONFLICT DO NOTHING;`);
      totalRowsExported++;
    }
  }

  out.push('');
  out.push('COMMIT;');
  out.push('');
  out.push('-- ============================================================================');
  out.push(`-- END OF COMPLETE PRODUCTION CLONE (${TABLE_SPECS.length} tables, ${totalRowsExported} rows)`);
  out.push('-- ============================================================================');
  out.push('');

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, out.join(NL), 'utf8');

  const fileSizeBytes = fs.statSync(OUTPUT_PATH).size;
  console.log('EXPORT_SUCCESS');
  console.log(`Output file : ${OUTPUT_PATH}`);
  console.log(`File size   : ${(fileSizeBytes / 1024).toFixed(2)} KB (${out.length} lines)`);
  console.log(`Tables      : ${TABLE_SPECS.length}`);
  console.log(`Rows copied : ${totalRowsExported}`);
  if (skippedSecretRows > 0) {
    console.log(`OAuth tokens omitted for safety: ${skippedSecretRows} (google_drive_refresh_token*)`);
  }
  console.log('Non-empty tables:');
  for (const s of tableStats.filter((t) => t.rows > 0)) {
    console.log(`  - ${s.table}: ${s.rows}`);
  }
}

main().catch((err) => {
  console.error('EXPORT_FAILED:', err.message);
  process.exit(1);
});
