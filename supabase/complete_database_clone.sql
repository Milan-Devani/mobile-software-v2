-- ============================================================================
-- COMPLETE PRODUCTION DATABASE CLONE (SCHEMA + LIVE DATA)
-- Project     : Mobotech Mobile Care — Mobile Repair Management System
-- Generated   : 2026-11-25T09:56:53.570Z
-- Tables      : 34 tables (100% live production schema parity)
--
-- HOW TO USE (SEPARATE LOCAL / STAGING SUPABASE PROJECT):
--   1. Create a NEW Supabase project (leave your live production DB untouched).
--   2. Open Supabase Dashboard -> SQL Editor -> New Query.
--   3. Paste this ENTIRE SQL file and click RUN.
--   4. Update your LOCAL server/.env SUPABASE_URL, SUPABASE_ANON_KEY, and
--      SUPABASE_SERVICE_ROLE_KEY to point to the NEW local Supabase project.
--
-- SAFETY GUARANTEES ("OLD WILL NOT BREAK"):
--   * 100% IDEMPOTENT: Safe on a brand-new blank database OR an existing DB.
--   * ZERO DROP / TRUNCATE / DELETE statements — existing data is never lost.
--   * Every table uses CREATE TABLE IF NOT EXISTS.
--   * Every column has ALTER TABLE ... ADD COLUMN IF NOT EXISTS guards.
--   * Every index uses CREATE INDEX IF NOT EXISTS.
--   * Every RLS policy is duplicate-safe.
--   * Every INSERT is in strict parent-before-child FK order (no superuser
--     session_replication_role required) and uses ON CONFLICT DO NOTHING.
-- ============================================================================

BEGIN;

-- Enable pgcrypto if available (gen_random_uuid() is built-in on PostgreSQL 13+)
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "pgcrypto"; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================================
-- PART 1: TABLES & IDEMPOTENT COLUMN PATCHES (34 TABLES IN FK ORDER)
-- ============================================================================

-- 1. public.shops
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
    currency VARCHAR(10) DEFAULT 'USD',
    currency_symbol VARCHAR(10) DEFAULT '$',
    warranty_terms TEXT DEFAULT 'All repairs are covered by our standard 90-day warranty against manufacturer defects on installed components. Physical or liquid damage after repair voids warranty.',
    terms_conditions TEXT DEFAULT 'Devices left unclaimed for more than 45 days after Ready for Pickup notification may be disposed of according to state salvage regulations.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "tagline" VARCHAR(255);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "city" VARCHAR(100);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "state" VARCHAR(100);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "postal_code" VARCHAR(20);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "country" VARCHAR(100);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "tax_number" VARCHAR(100);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "website" VARCHAR(255);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "currency_symbol" VARCHAR(10);
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "warranty_terms" TEXT;
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "terms_conditions" TEXT;
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."shops" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- 2. public.roles
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."roles" ADD COLUMN IF NOT EXISTS "name" VARCHAR(100);
ALTER TABLE public."roles" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."roles" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 3. public.settings
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."settings" ADD COLUMN IF NOT EXISTS "value" JSONB;
ALTER TABLE public."settings" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."settings" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- 4. public.recycle_bin
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
ALTER TABLE public."recycle_bin" ADD COLUMN IF NOT EXISTS "entity_type" VARCHAR(50);
ALTER TABLE public."recycle_bin" ADD COLUMN IF NOT EXISTS "original_id" VARCHAR(100);
ALTER TABLE public."recycle_bin" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);
ALTER TABLE public."recycle_bin" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE public."recycle_bin" ADD COLUMN IF NOT EXISTS "data" JSONB;
ALTER TABLE public."recycle_bin" ADD COLUMN IF NOT EXISTS "deleted_by" VARCHAR(100);
ALTER TABLE public."recycle_bin" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE public."recycle_bin" ADD COLUMN IF NOT EXISTS "purge_at" TIMESTAMPTZ;

-- 5. public._app_backup_assets
CREATE TABLE IF NOT EXISTS public._app_backup_assets (
    file_name TEXT PRIMARY KEY,
    mime_type TEXT,
    asset_type TEXT,
    public_url TEXT,
    size_bytes BIGINT,
    data_base64 TEXT,
    created_at TEXT
);
ALTER TABLE public."_app_backup_assets" ADD COLUMN IF NOT EXISTS "mime_type" TEXT;
ALTER TABLE public."_app_backup_assets" ADD COLUMN IF NOT EXISTS "asset_type" TEXT;
ALTER TABLE public."_app_backup_assets" ADD COLUMN IF NOT EXISTS "public_url" TEXT;
ALTER TABLE public."_app_backup_assets" ADD COLUMN IF NOT EXISTS "size_bytes" BIGINT;
ALTER TABLE public."_app_backup_assets" ADD COLUMN IF NOT EXISTS "data_base64" TEXT;
ALTER TABLE public."_app_backup_assets" ADD COLUMN IF NOT EXISTS "created_at" TEXT;

-- 6. public.users
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
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "role_id" VARCHAR(50);
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(255);
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50);
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN;
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ;
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- 7. public.customers
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
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "shop_id" UUID;
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "customer_code" VARCHAR(50);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(255);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "whatsapp_number" VARCHAR(50);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "alternate_phone" VARCHAR(50);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "alternate_whatsapp" VARCHAR(50);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(20);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "user_type" VARCHAR(50);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "city" VARCHAR(100);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "state" VARCHAR(100);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "postal_code" VARCHAR(20);
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE public."customers" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE public.customers ALTER COLUMN gender SET DEFAULT 'male';
ALTER TABLE public.customers ALTER COLUMN gender DROP NOT NULL;

-- 8. public.parts
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
    warranty TEXT DEFAULT '90 Days',
    serial_number TEXT DEFAULT '',
    imei TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "shop_id" UUID;
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "part_code" VARCHAR(50);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "name" VARCHAR(200);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "part_number" VARCHAR(100);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "brand" VARCHAR(100);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "category" VARCHAR(100);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "compatible_models" TEXT;
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "purchase_cost" NUMERIC(12, 2);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "selling_price" NUMERIC(12, 2);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "stock_quantity" INT;
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "minimum_stock" INT;
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "supplier" VARCHAR(150);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "warranty" TEXT;
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "serial_number" TEXT;
ALTER TABLE public."parts" ADD COLUMN IF NOT EXISTS "imei" TEXT;

-- 9. public.vendors
CREATE TABLE IF NOT EXISTS public.vendors (
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
);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "vendor_code" VARCHAR(50);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "shop_name" VARCHAR(255);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "mobile" VARCHAR(50);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "whatsapp" VARCHAR(50);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "gst_number" VARCHAR(50);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "opening_balance" NUMERIC(12, 2);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "current_balance" NUMERIC(12, 2);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "specialization" TEXT;
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "shop_id" UUID;
ALTER TABLE public."vendors" ADD COLUMN IF NOT EXISTS "specialty" VARCHAR(120);

-- 10. public.review_settings
CREATE TABLE IF NOT EXISTS public.review_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    google_review_url TEXT DEFAULT 'https://share.google/PA9yRD74h2EQR4cgO',
    is_enabled BOOLEAN DEFAULT TRUE,
    invitation_channel VARCHAR(20) DEFAULT 'WHATSAPP',
    invitation_message TEXT DEFAULT 'Thank you for choosing {shop_name}! We hope your repair experience was good. We would appreciate your honest feedback. Please share your experience here: {review_link}',
    ai_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."review_settings" ADD COLUMN IF NOT EXISTS "shop_id" UUID;
ALTER TABLE public."review_settings" ADD COLUMN IF NOT EXISTS "google_review_url" TEXT;
ALTER TABLE public."review_settings" ADD COLUMN IF NOT EXISTS "is_enabled" BOOLEAN;
ALTER TABLE public."review_settings" ADD COLUMN IF NOT EXISTS "invitation_channel" VARCHAR(20);
ALTER TABLE public."review_settings" ADD COLUMN IF NOT EXISTS "invitation_message" TEXT;
ALTER TABLE public."review_settings" ADD COLUMN IF NOT EXISTS "ai_enabled" BOOLEAN;
ALTER TABLE public."review_settings" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."review_settings" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- 11. public.devices
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
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "brand" VARCHAR(100);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "model" VARCHAR(150);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "color" VARCHAR(50);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "storage_capacity" VARCHAR(50);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "imei" VARCHAR(50);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "serial_number" VARCHAR(100);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "passcode" VARCHAR(50);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "operating_system" VARCHAR(50);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "invoice_date" DATE;
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "invoice_number" VARCHAR(100);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "expiry_date" DATE;
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "cosmetic_condition" VARCHAR(100);
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."devices" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- 12. public.backup_logs
CREATE TABLE IF NOT EXISTS public.backup_logs (
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
);
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "backup_type" VARCHAR(20);
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "status" VARCHAR(30);
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "filename" VARCHAR(255);
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "drive_file_id" VARCHAR(255);
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "drive_folder_id" VARCHAR(255);
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "file_size_bytes" BIGINT;
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "checksum_md5" VARCHAR(64);
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "duration_ms" INT;
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID;
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMPTZ;
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ;
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "drive_file_id_2" VARCHAR(255);
ALTER TABLE public."backup_logs" ADD COLUMN IF NOT EXISTS "drive_folder_id_2" VARCHAR(255);

-- 13. public.sales
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
);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "invoice_number" VARCHAR(100);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "invoice_no_seq" INT;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "invoice_date" DATE;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "customer_name" VARCHAR(255);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "customer_phone" VARCHAR(50);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "customer_email" VARCHAR(255);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "customer_address" TEXT;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "place_of_supply" VARCHAR(100);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "customer_gstin" VARCHAR(50);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "items" JSONB;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "discount_type" VARCHAR(20);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "discount_value" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "taxable_amount" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "gst_enabled" BOOLEAN;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "gst_type" VARCHAR(20);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "gst_rate" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "igst_rate" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "igst_amount" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "cgst_rate" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "cgst_amount" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "sgst_rate" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "sgst_amount" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "total_tax" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "total_amount" NUMERIC(12, 2);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "payment_mode" VARCHAR(50);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(50);
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "bank_details" JSONB;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "terms_conditions" JSONB;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "issued_by_user_id" UUID;
ALTER TABLE public."sales" ADD COLUMN IF NOT EXISTS "issued_by_name" VARCHAR(100);

-- 14. public.vendor_transactions
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
    payment_mode VARCHAR(50),
    payment_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "txn_number" VARCHAR(100);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "txn_type" VARCHAR(50);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "vendor_id" UUID;
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "txn_date" DATE;
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "total_estimated_cost" NUMERIC(12, 2);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "total_actual_cost" NUMERIC(12, 2);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "paid_amount" NUMERIC(12, 2);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "payment_mode" VARCHAR(50);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "payment_ref" VARCHAR(100);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(100);
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "parent_txn_id" UUID;
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "total_mobiles" INT;
ALTER TABLE public."vendor_transactions" ADD COLUMN IF NOT EXISTS "total_cost" NUMERIC(12, 2);

-- 15. public.vendor_payments
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
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "voucher_no" VARCHAR(100);
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "vendor_id" UUID;
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "payment_type" VARCHAR(50);
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "amount" NUMERIC(12, 2);
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "payment_mode" VARCHAR(50);
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "reference_no" VARCHAR(100);
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "date" DATE;
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(100);
ALTER TABLE public."vendor_payments" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 16. public.repair_jobs
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
);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "job_number" VARCHAR(50);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "shop_id" UUID;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "device_id" UUID;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "assigned_technician_id" UUID;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "priority" VARCHAR(20);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "service_type" VARCHAR(50);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "customer_complaint" TEXT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "device_condition" JSONB;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "accessories_received" JSONB;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "discount" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "discount_type" VARCHAR(20);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "discount_value" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "tax_rate" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "tax_amount" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "total_amount" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "paid_amount" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "balance_due" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(50);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "is_warranty_claim" BOOLEAN;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "reopen_count" INT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "warranty_same_issue" BOOLEAN;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "reopened_at" TIMESTAMPTZ;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "reopened_by_user_id" UUID;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "warranty_claim_type" VARCHAR(50);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "warranty_free_rework" BOOLEAN;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "last_warranty_issue" TEXT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "reopen_notes" TEXT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "previous_delivered_at" TIMESTAMPTZ;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "approval_notes" TEXT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "previous_total_amount" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "previous_balance_due" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "customer_tested_device" BOOLEAN;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "customer_acceptance_confirmed" BOOLEAN;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "customer_signature" TEXT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "delivery_notes" TEXT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMPTZ;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "delivered_by_user_id" UUID;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "approval_token" VARCHAR(100);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "approval_status" VARCHAR(50);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "approval_decision_at" TIMESTAMPTZ;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "warranty_days" INT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "payment_remaining_authorized" BOOLEAN;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "warranty_rework_reason" TEXT;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "warranty_history" JSONB;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "warranty_parts" JSONB;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "advance_amount" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "remaining_authorized_balance" NUMERIC(12, 2);
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "vendor_sent_at" TIMESTAMPTZ;
ALTER TABLE public."repair_jobs" ADD COLUMN IF NOT EXISTS "vendor_expected_back_date" DATE;

-- 17. public.job_status_history
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
ALTER TABLE public."job_status_history" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."job_status_history" ADD COLUMN IF NOT EXISTS "from_status" VARCHAR(50);
ALTER TABLE public."job_status_history" ADD COLUMN IF NOT EXISTS "to_status" VARCHAR(50);
ALTER TABLE public."job_status_history" ADD COLUMN IF NOT EXISTS "action_title" VARCHAR(150);
ALTER TABLE public."job_status_history" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."job_status_history" ADD COLUMN IF NOT EXISTS "performed_by_user_id" UUID;
ALTER TABLE public."job_status_history" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 18. public.diagnoses
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
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "diagnosed_by_user_id" UUID;
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "reported_issue" TEXT;
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "technician_findings" TEXT;
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "root_cause" TEXT;
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "recommended_solution" TEXT;
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "internal_technician_notes" TEXT;
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."diagnoses" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE public.diagnoses ALTER COLUMN technician_findings SET DEFAULT '';
ALTER TABLE public.diagnoses ALTER COLUMN technician_findings DROP NOT NULL;

-- 19. public.part_stock_movements
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
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "part_id" UUID;
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "movement_type" VARCHAR(50);
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "quantity" INT;
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "previous_stock" INT;
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "new_stock" INT;
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "reference_number" VARCHAR(100);
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID;
ALTER TABLE public."part_stock_movements" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 20. public.repair_estimates
CREATE TABLE IF NOT EXISTS public.repair_estimates (
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
);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "labor_charge" NUMERIC(12, 2);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "parts_subtotal" NUMERIC(12, 2);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "discount" NUMERIC(12, 2);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "discount_type" VARCHAR(20);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "discount_value" NUMERIC(12, 2);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "tax_rate" NUMERIC(12, 2);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "tax_amount" NUMERIC(12, 2);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "total_amount" NUMERIC(12, 2);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "valid_until" DATE;
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID;
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."repair_estimates" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- 21. public.repair_job_parts
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
ALTER TABLE public."repair_job_parts" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."repair_job_parts" ADD COLUMN IF NOT EXISTS "part_id" UUID;
ALTER TABLE public."repair_job_parts" ADD COLUMN IF NOT EXISTS "part_name" VARCHAR(200);
ALTER TABLE public."repair_job_parts" ADD COLUMN IF NOT EXISTS "quantity" INT;
ALTER TABLE public."repair_job_parts" ADD COLUMN IF NOT EXISTS "unit_price" NUMERIC(12, 2);
ALTER TABLE public."repair_job_parts" ADD COLUMN IF NOT EXISTS "total_price" NUMERIC(12, 2);
ALTER TABLE public."repair_job_parts" ADD COLUMN IF NOT EXISTS "installed_by_user_id" UUID;
ALTER TABLE public."repair_job_parts" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 22. public.repair_job_labor
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
ALTER TABLE public."repair_job_labor" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."repair_job_labor" ADD COLUMN IF NOT EXISTS "description" VARCHAR(255);
ALTER TABLE public."repair_job_labor" ADD COLUMN IF NOT EXISTS "labor_rate" NUMERIC(12, 2);
ALTER TABLE public."repair_job_labor" ADD COLUMN IF NOT EXISTS "hours_or_units" NUMERIC(12, 2);
ALTER TABLE public."repair_job_labor" ADD COLUMN IF NOT EXISTS "total_amount" NUMERIC(12, 2);
ALTER TABLE public."repair_job_labor" ADD COLUMN IF NOT EXISTS "technician_id" UUID;
ALTER TABLE public."repair_job_labor" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 23. public.repair_tests
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
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "test_key" VARCHAR(100);
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "test_label" VARCHAR(150);
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "result" VARCHAR(30);
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "tested_by_user_id" UUID;
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "tested_at" TIMESTAMPTZ;
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."repair_tests" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- 24. public.payments
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
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "payment_number" VARCHAR(50);
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "amount" NUMERIC(12, 2);
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50);
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(50);
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "transaction_reference" VARCHAR(150);
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "received_by_user_id" UUID;
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ;
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 25. public.invoices
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
);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "invoice_number" VARCHAR(50);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "shop_id" UUID;
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "labor_amount" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "parts_amount" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "discount" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "discount_type" VARCHAR(20);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "discount_value" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "tax_rate" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "tax_amount" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "total_amount" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "paid_amount" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "balance_due" NUMERIC(12, 2);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(50);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "warranty_period" VARCHAR(100);
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "pdf_url" TEXT;
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "issued_by_user_id" UUID;
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "issued_at" TIMESTAMPTZ;
ALTER TABLE public."invoices" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 26. public.attachments
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
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "file_type" VARCHAR(50);
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "file_name" VARCHAR(255);
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "file_path" TEXT;
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "file_url" TEXT;
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "file_size_bytes" BIGINT;
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100);
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "uploaded_by_user_id" UUID;
ALTER TABLE public."attachments" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 27. public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    notification_type VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."notifications" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."notifications" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE public."notifications" ADD COLUMN IF NOT EXISTS "notification_type" VARCHAR(80);
ALTER TABLE public."notifications" ADD COLUMN IF NOT EXISTS "title" VARCHAR(200);
ALTER TABLE public."notifications" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE public."notifications" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 28. public.vendor_mobiles
CREATE TABLE IF NOT EXISTS public.vendor_mobiles (
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
);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "vendor_id" UUID;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "send_txn_id" UUID;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "return_txn_id" UUID;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "flow_type" VARCHAR(50);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "brand" VARCHAR(100);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "model" VARCHAR(150);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "imei" VARCHAR(50);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "customer_name" VARCHAR(255);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "repair_problem" TEXT;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "condition" TEXT;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "accessories" TEXT;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "expected_return_date" DATE;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "estimated_cost" NUMERIC(12, 2);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "actual_cost" NUMERIC(12, 2);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "repair_result" VARCHAR(50);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "current_status" VARCHAR(50);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "sent_date" DATE;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "received_date" DATE;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "returned_date" DATE;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "warranty" VARCHAR(100);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "transaction_id" UUID;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "why_send" TEXT;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(50);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "direction" VARCHAR(50);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "advance_paid" NUMERIC(12, 2);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "remaining_balance" NUMERIC(12, 2);
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "completed_date" DATE;
ALTER TABLE public."vendor_mobiles" ADD COLUMN IF NOT EXISTS "repair_job_id" UUID;

-- 29. public.repair_estimate_items
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
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "estimate_id" UUID;
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "part_id" UUID;
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "item_name" VARCHAR(200);
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "warranty" VARCHAR(100);
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "quantity" INT;
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "unit_price" NUMERIC(12, 2);
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "discount" NUMERIC(12, 2);
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "total_price" NUMERIC(12, 2);
ALTER TABLE public."repair_estimate_items" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 30. public.invoice_items
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
ALTER TABLE public."invoice_items" ADD COLUMN IF NOT EXISTS "invoice_id" UUID;
ALTER TABLE public."invoice_items" ADD COLUMN IF NOT EXISTS "item_type" VARCHAR(50);
ALTER TABLE public."invoice_items" ADD COLUMN IF NOT EXISTS "item_name" VARCHAR(200);
ALTER TABLE public."invoice_items" ADD COLUMN IF NOT EXISTS "warranty" VARCHAR(100);
ALTER TABLE public."invoice_items" ADD COLUMN IF NOT EXISTS "quantity" INT;
ALTER TABLE public."invoice_items" ADD COLUMN IF NOT EXISTS "unit_price" NUMERIC(12, 2);
ALTER TABLE public."invoice_items" ADD COLUMN IF NOT EXISTS "total_price" NUMERIC(12, 2);
ALTER TABLE public."invoice_items" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 31. public.notification_logs
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
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "notification_id" UUID;
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "channel" VARCHAR(30);
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "message_type" VARCHAR(80);
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "recipient" VARCHAR(150);
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "status" VARCHAR(30);
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "provider" VARCHAR(50);
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "provider_response" JSONB;
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "retry_count" INT;
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMPTZ;
ALTER TABLE public."notification_logs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 32. public.review_requests
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
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "shop_id" UUID;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "job_id" UUID;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "invoice_id" UUID;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "unique_token" VARCHAR(128);
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "unique_token_hash" VARCHAR(128);
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "rating" INT;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "customer_feedback" TEXT;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "generated_review" TEXT;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "edited_review" TEXT;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "ai_provider" VARCHAR(50);
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "invitation_status" VARCHAR(30);
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "invitation_sent_at" TIMESTAMPTZ;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "review_page_opened_at" TIMESTAMPTZ;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "google_redirected_at" TIMESTAMPTZ;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."review_requests" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- 33. public.vendor_status_history
CREATE TABLE IF NOT EXISTS public.vendor_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_mobile_id UUID NOT NULL REFERENCES public.vendor_mobiles(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."vendor_status_history" ADD COLUMN IF NOT EXISTS "vendor_mobile_id" UUID;
ALTER TABLE public."vendor_status_history" ADD COLUMN IF NOT EXISTS "previous_status" VARCHAR(50);
ALTER TABLE public."vendor_status_history" ADD COLUMN IF NOT EXISTS "new_status" VARCHAR(50);
ALTER TABLE public."vendor_status_history" ADD COLUMN IF NOT EXISTS "changed_by" VARCHAR(100);
ALTER TABLE public."vendor_status_history" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
ALTER TABLE public."vendor_status_history" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- 34. public.vendor_ledger
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
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "vendor_id" UUID;
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "date" DATE;
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "entry_type" VARCHAR(50);
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "txn_id" UUID;
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "vendor_mobile_id" UUID;
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "debit" NUMERIC(12, 2);
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "credit" NUMERIC(12, 2);
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "amount" NUMERIC(12, 2);
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "running_balance" NUMERIC(12, 2);
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "payment_mode" VARCHAR(50);
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "reference_no" VARCHAR(100);
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(100);
ALTER TABLE public."vendor_ledger" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;

-- ============================================================================
-- PART 2: INDEXES (IF NOT EXISTS)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recycle_bin_entity_type ON public.recycle_bin(entity_type);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON public.recycle_bin(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_purge_at ON public.recycle_bin(purge_at ASC);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_dob ON public.customers(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_parts_category ON public.parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_name ON public.parts(name);
CREATE INDEX IF NOT EXISTS idx_parts_status ON public.parts(status);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON public.vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_mobile ON public.vendors(mobile);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON public.devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON public.devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at ON public.backup_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON public.sales(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON public.sales(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_vendor_id ON public.vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_type ON public.vendor_transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_vendor_txns_date ON public.vendor_transactions(txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON public.vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_voucher ON public.vendor_payments(voucher_no);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_job_number ON public.repair_jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_status ON public.repair_jobs(status);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_customer_id ON public.repair_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_technician_id ON public.repair_jobs(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_created_at ON public.repair_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON public.job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_job_id ON public.diagnoses(job_id);
CREATE INDEX IF NOT EXISTS idx_part_movements_part_id ON public.part_stock_movements(part_id);
CREATE INDEX IF NOT EXISTS idx_repair_estimates_job_id ON public.repair_estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_repair_job_parts_job_id ON public.repair_job_parts(job_id);
CREATE INDEX IF NOT EXISTS idx_repair_job_labor_job_id ON public.repair_job_labor(job_id);
CREATE INDEX IF NOT EXISTS idx_repair_tests_job_id ON public.repair_tests(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON public.invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_attachments_job_id ON public.attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_job_id ON public.notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_vendor_id ON public.vendor_mobiles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_status ON public.vendor_mobiles(current_status);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_flow_type ON public.vendor_mobiles(flow_type);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_imei ON public.vendor_mobiles(imei);
CREATE INDEX IF NOT EXISTS idx_vendor_mobiles_repair_job_id ON public.vendor_mobiles(repair_job_id) WHERE repair_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_estimate_items_est_id ON public.repair_estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_job_id ON public.notification_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_token_hash ON public.review_requests(unique_token_hash);
CREATE INDEX IF NOT EXISTS idx_review_requests_job_id ON public.review_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer_id ON public.review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_vsh_mobile_id ON public.vendor_status_history(vendor_mobile_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ledger_vendor_id ON public.vendor_ledger(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ledger_date ON public.vendor_ledger(date DESC);

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY (RLS) & IDEMPOTENT POLICIES
-- ============================================================================
ALTER TABLE public."shops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."recycle_bin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_app_backup_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."review_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."backup_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vendor_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vendor_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."repair_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."job_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."diagnoses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."part_stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."repair_estimates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."repair_job_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."repair_job_labor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."repair_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vendor_mobiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."repair_estimate_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notification_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."review_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vendor_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vendor_ledger" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Allow all on shops" ON public."shops" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on roles" ON public."roles" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on settings" ON public."settings" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on recycle_bin" ON public."recycle_bin" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on _app_backup_assets" ON public."_app_backup_assets" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on users" ON public."users" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on customers" ON public."customers" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on parts" ON public."parts" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendors" ON public."vendors" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on review_settings" ON public."review_settings" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on devices" ON public."devices" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on backup_logs" ON public."backup_logs" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on sales" ON public."sales" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_transactions" ON public."vendor_transactions" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_payments" ON public."vendor_payments" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_jobs" ON public."repair_jobs" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on job_status_history" ON public."job_status_history" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on diagnoses" ON public."diagnoses" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on part_stock_movements" ON public."part_stock_movements" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_estimates" ON public."repair_estimates" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_job_parts" ON public."repair_job_parts" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_job_labor" ON public."repair_job_labor" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_tests" ON public."repair_tests" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on payments" ON public."payments" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on invoices" ON public."invoices" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on attachments" ON public."attachments" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on notifications" ON public."notifications" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_mobiles" ON public."vendor_mobiles" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on repair_estimate_items" ON public."repair_estimate_items" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on invoice_items" ON public."invoice_items" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on notification_logs" ON public."notification_logs" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on review_requests" ON public."review_requests" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_status_history" ON public."vendor_status_history" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all on vendor_ledger" ON public."vendor_ledger" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PART 4: SUPABASE STORAGE BUCKETS (SAFE NO-OP ON PLAIN POSTGRESQL)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('repair-assets', 'repair-assets', TRUE) ON CONFLICT (id) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- PART 5: LIVE PRODUCTION DATA (STRICT PARENT-TO-CHILD FK ORDER)
-- ============================================================================

-- Table: public."shops" (1 row)
INSERT INTO public."shops" ("id", "name", "tagline", "logo_url", "phone", "email", "address", "city", "state", "postal_code", "country", "tax_number", "website", "currency", "currency_symbol", "warranty_terms", "terms_conditions", "created_at", "updated_at") VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 'Mobotech mobile care', 'Professional Smartphone & Tablet Repair Services', 'https://npenaofpdmigajamlmww.supabase.co/storage/v1/object/public/repair-assets/1794914389321-4036c55a-9235-4254-9f47-4fd467dbf505.png', '80000 24439', 'mobotechmobilecare.support@gmail.com', 'Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar', 'Surat', 'Gujarat', '395006', 'India', '24ABCDE1234F1Z5', 'https://mobotechcare.com', 'INR', '₹', E'All repairs are covered by our standard 15-day warranty against manufacturer defects on installed components. Physical or liquid damage after repair voids warranty.\nStandard Warranty Policy (Printed on Invoices & Job Sheets)\n\nStandard Warranty Policy (Printed on Invoices & Job Sheets)\n\nStandard Warranty Policy (Printed on Invoices & Job Sheets)\nStandard Warranty Policy (Printed on Invoices & Job Sheets)\nStandard Warranty Policy (Printed on Invoices & Job Sheets)\nStandard Warranty Policy (Printed on Invoices & Job Sheets)\nStandard Warranty Policy (Printed on Invoices & Job Sheets)\nStandard Warranty Policy (Printed on Invoices & Job Sheets)\n', E'1. No warranty on physical damage, water damage, or accidental damage after repair.\n2. Warranty is applicable only to the specific part replaced or repaired.\n3. Any unauthorized repair or tampering will void the warranty.\n4. Please check your device before leaving the shop; complaints must be reported immediately.\n5. The shop is not responsible for data loss or software issues during repair.', '2026-11-17T11:04:55.268061+00:00'::timestamptz, '2026-11-21T03:56:16.786+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."roles" (4 rows)
INSERT INTO public."roles" ("id", "name", "description", "created_at") VALUES ('admin', 'Admin / Shop Owner', 'Full access to all system features and settings', '2026-10-21T14:33:43.440415+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."roles" ("id", "name", "description", "created_at") VALUES ('technician', 'Technician', 'Diagnose devices, request parts, execute repairs, QC tests', '2026-10-21T14:33:43.440415+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."roles" ("id", "name", "description", "created_at") VALUES ('staff', 'Shop Staff', 'Check-in, job sheets, customer pickup, payments', '2026-10-21T14:33:43.440415+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."roles" ("id", "name", "description", "created_at") VALUES ('developer', 'Developer', 'Full system access for software development and maintenance', '2026-11-20T09:13:43.534503+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."settings" (6 rows)
-- Note: 2 production Google Drive OAuth refresh token row(s) intentionally omitted
--       so your local/staging DB never overwrites production Google Drive backups.
INSERT INTO public."settings" ("key", "value", "description", "updated_at") VALUES ('cached_review_requests', '[{"id":"80356b28-3f9f-4259-8414-e6af8af13931","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","rating":5,"shop_id":"a0000000-0000-0000-0000-000000000001","created_at":"2026-11-21T13:22:09.269+00:00","invoice_id":"cc274ded-78ba-43b8-836b-a4433ea151b8","updated_at":"2026-11-21T13:23:05.314Z","ai_provider":"gemini","customer_id":"1c3c0414-e0fb-4499-bb1f-9dad640775f0","unique_token":"247a24f9adb267442f829d34ad2dc8a91524800462568477","edited_review":"My phone had a \"dihhh\" problem, and I''m so relieved it''s fixed! Mobotech Mobile Care did a great repair service. My phone is working perfectly now. Thank you!","error_message":null,"generated_review":"My phone had a \"dihhh\" problem, and I''m so relieved it''s fixed! Mobotech Mobile Care did a great repair service. My phone is working perfectly now. Thank you!","customer_feedback":null,"invitation_status":"SENT","unique_token_hash":"d46e6bf10de35a06fa37e1985047da9be4d06ccbbbbe495ea402276c7b53a68f","invitation_sent_at":"2026-11-21T13:22:09.486+00:00","google_redirected_at":"2026-11-21T13:23:05.314Z","review_page_opened_at":"2026-11-21T13:22:26.725+00:00"}]'::jsonb, '', '2026-11-21T13:23:05.399+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."settings" ("key", "value", "description", "updated_at") VALUES ('google_review_settings', '{"ai_enabled":true,"is_enabled":true,"google_review_url":"https://g.page/r/CROHWMY3TX9dEBM/review","invitation_channel":"WHATSAPP"}'::jsonb, 'Google Review Assistant', '2026-11-17T11:04:55.268061+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."settings" ("key", "value", "description", "updated_at") VALUES ('notification_config', '{"sms_enabled":false,"sender_email":"MoboTech Mobile Care <mobotechmobilecare.support@gmail.com>","email_enabled":true,"whatsapp_enabled":true}'::jsonb, 'Notification channels', '2026-11-19T07:16:09.844+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."settings" ("key", "value", "description", "updated_at") VALUES ('part_categories', '["Phone","MacBook"]'::jsonb, 'Custom part categories', '2026-11-18T05:53:29.42+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."settings" ("key", "value", "description", "updated_at") VALUES ('shop_profile', '{"city":"Surat","email":"support@mobotech.com","phone":"080000 24439","state":"Gujarat","address":"Central Bazar, G-119, Varachha Main Rd, Mini Bazar, Kodiyar Nagar, Surat, Gujarat 395006","country":"India","currency":"INR","shop_name":"Mobotech mobile care","tax_number":"24ABCDE1234F1Z5","postal_code":"395006","currency_symbol":"₹","default_tax_rate":18,"default_warranty_days":90}'::jsonb, 'Shop profile and preferences', '2026-11-17T11:04:55.268061+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."settings" ("key", "value", "description", "updated_at") VALUES ('shop_profile_extra', '{"logo_url_dark":"https://npenaofpdmigajamlmww.supabase.co/storage/v1/object/public/repair-assets/1795083077636-9a5b64c1-6891-4e0c-be9a-e60882615069.png","instagram_qr_url":"https://www.instagram.com/mobotech_mobile_care/?hl=en"}'::jsonb, 'Shop profile extra fields (Instagram QR, dark theme logo)', '2026-11-21T03:56:16.671+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."recycle_bin" (1 row)
INSERT INTO public."recycle_bin" ("id", "entity_type", "original_id", "title", "subtitle", "data", "deleted_by", "deleted_at", "purge_at") VALUES ('d97069d2-d237-4b3c-a7cb-7a0d95946660'::uuid, 'job', '20377a28-191f-4860-b6a6-d6ce5a09f543', 'Job #mobo-2026-0001 — Apple Iphone 12 pro', 'Customer: mobotech mobilecare • Problem: General Repair • Amount: ₹997', '{"job":{"id":"20377a28-191f-4860-b6a6-d6ce5a09f543","status":"DELIVERED","shop_id":"a0000000-0000-0000-0000-000000000001","discount":0,"priority":"NORMAL","subtotal":997,"tax_rate":0,"device_id":"c06d4ffa-60d7-4894-be57-338d533c3dce","created_at":"2026-11-21T13:20:45.863+00:00","job_number":"mobo-2026-0001","tax_amount":0,"updated_at":"2026-11-21T13:22:07.776+00:00","balance_due":0,"customer_id":"1c3c0414-e0fb-4499-bb1f-9dad640775f0","paid_amount":997,"reopened_at":null,"delivered_at":"2026-11-21T13:22:07.679+00:00","reopen_count":0,"reopen_notes":null,"service_type":"Pending","total_amount":997,"discount_type":"AMOUNT","warranty_days":40,"advance_amount":0,"approval_notes":"Approved directly by shop owner (walk-in / over-the-counter).","approval_token":"387d9a9f-790b-4aac-a618-b7f7eaec3848","delivery_notes":"","discount_value":0,"payment_status":"PAID","vendor_sent_at":null,"warranty_parts":[],"approval_status":"APPROVED","device_condition":{"dents":false,"notes":"","touch":"Working","camera":"Yes","screen":"Working","speaker":"Working","checklist":{"dents":"No","touch":"Yes","camera":"Yes","screen":"Yes","speaker":"Yes","powers_on":"Yes","back_glass":"No","power_button":"Yes","charging_port":"Yes","screw_missing":"Yes","headphone_jack":"Yes","volume_buttons":"Yes","sim_tray_missing":"No","face_id_fingerprint":"Yes"},"powers_on":true,"back_glass":"Intact","power_button":"Working","water_damage":true,"charging_port":"Working","screw_missing":true,"headphone_jack":"Working","volume_buttons":"Working","sim_tray_missing":false,"face_id_fingerprint":"Yes"},"rejection_reason":null,"warranty_history":[],"is_warranty_claim":false,"created_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9","customer_complaint":"dihhhh","customer_signature":null,"last_warranty_issue":null,"reopened_by_user_id":null,"warranty_claim_type":null,"warranty_same_issue":false,"accessories_received":["SIM Card"],"approval_decision_at":"2026-11-21T13:21:20.435+00:00","delivered_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9","previous_balance_due":0,"warranty_free_rework":false,"previous_delivered_at":null,"previous_total_amount":0,"assigned_technician_id":null,"customer_tested_device":true,"warranty_rework_reason":null,"vendor_expected_back_date":null,"payment_remaining_authorized":false,"remaining_authorized_balance":0,"customer_acceptance_confirmed":true},"tests":[{"id":"d9bdbd69-5d6b-4c9f-a6c2-3b5f3aed8a24","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"power_on","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Device Powers On","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"78b30a7a-6aaf-44d9-9b30-6d31ea834e96","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"display","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Display & Color Quality","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"1070502e-4e54-4ff0-8d13-649f76b69a72","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"touch","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Touchscreen Responsiveness","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"0dd06ada-0139-4d1a-9abd-95be7e24e116","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"charging","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Charging Port & Current Draw","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"c7e888f1-7cf4-449f-9dce-6c2d0bf7b2d4","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"camera_rear","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Rear Main Camera & Focus","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"1bbdb14e-40fc-4b33-9ccb-2694e56ce812","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"camera_front","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Front Camera","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"e1932470-2bfc-4ced-8cea-d48df611df1a","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"speaker_loud","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Loudspeaker / Media Audio","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"815df01a-1bd4-4072-9a5b-dcfd90d7922f","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"speaker_ear","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Earpiece Speaker","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"e4eb6086-620d-416f-aa4e-9a01f41353a4","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"microphone","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Microphone & Noise Cancelling","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"11fa5e3a-16fd-4e4c-b0e8-92d77b5343da","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"wifi","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Wi-Fi Connection & Signal","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"b03eb140-ea5d-44a5-9300-adaa1060f3b4","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"bluetooth","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Bluetooth Pairing","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"ff8845c5-d0fb-46a9-98f6-b820ae2a03d7","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"sim_network","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"SIM Card & Cellular Network","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"60d6be79-22d9-498d-8bd2-d33f079f8417","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"biometrics","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Fingerprint / Face ID","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"c130c36c-bd9b-4835-8678-78e87290b404","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"buttons","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Physical Buttons (Power/Volume)","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"8a981e8d-ce14-4c83-a8dd-1526d98fabe0","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"battery_health","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Battery Health & Charge Hold","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"25fd322d-80e1-41e3-b107-5651b61e893c","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","result":"PASS","test_key":"sensors","tested_at":"2026-11-21T13:21:33.803+00:00","created_at":"2026-11-21T13:20:45.863+00:00","test_label":"Proximity Sensor & Accelerometer","updated_at":"2026-11-21T13:21:33.803+00:00","tested_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"}],"device":{"id":"c06d4ffa-60d7-4894-be57-338d533c3dce","imei":"555666666666666","brand":"Apple","color":"blue","model":"Iphone 12 pro","passcode":"000000","created_at":"2026-11-21T13:20:45.619+00:00","updated_at":"2026-11-21T13:20:45.619+00:00","customer_id":"1c3c0414-e0fb-4499-bb1f-9dad640775f0","expiry_date":null,"invoice_date":null,"serial_number":"gggb66","invoice_number":"","operating_system":"iOS","storage_capacity":"32GB","cosmetic_condition":"Wear And Tear"},"invoices":[{"id":"cc274ded-78ba-43b8-836b-a4433ea151b8","notes":"Thank you for choosing Mobotech mobile care for your mobile device repair!","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","pdf_url":null,"shop_id":"a0000000-0000-0000-0000-000000000001","discount":0,"subtotal":997,"tax_rate":0,"issued_at":"2026-11-21T13:22:00.038+00:00","created_at":"2026-11-21T13:22:00.038+00:00","tax_amount":0,"balance_due":0,"customer_id":"1c3c0414-e0fb-4499-bb1f-9dad640775f0","paid_amount":997,"labor_amount":0,"parts_amount":997,"total_amount":997,"discount_type":"AMOUNT","discount_value":0,"invoice_number":"INV-2026-000001","payment_status":"PAID","warranty_period":"90 Days Hardware Warranty","issued_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"}],"payments":[{"id":"715bc439-5980-4ca0-9c19-d459011d88fb","notes":"","amount":997,"job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","paid_at":"2026-11-21T13:21:58.524+00:00","created_at":"2026-11-21T13:21:58.524+00:00","customer_id":"1c3c0414-e0fb-4499-bb1f-9dad640775f0","payment_method":"CASH","payment_number":"PAY-2026-00001","payment_status":"COMPLETED","received_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9","transaction_reference":null}],"diagnoses":[],"estimates":[{"id":"763f5c10-3915-44b4-ae1f-e9e1120a1a51","notes":"","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","status":"SENT","discount":0,"tax_rate":0,"created_at":"2026-11-21T13:21:20.043+00:00","tax_amount":0,"updated_at":"2026-11-21T13:21:20.043+00:00","valid_until":null,"labor_charge":0,"total_amount":997,"discount_type":"AMOUNT","discount_value":0,"parts_subtotal":997,"created_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"}],"invoiceItems":[{"id":"1a8ad2bc-a968-4d19-a00e-95199b35c66f","quantity":1,"warranty":"40 Days","item_name":"ygygygy","item_type":"PART","created_at":"2026-11-21T13:22:07.976+00:00","invoice_id":"cc274ded-78ba-43b8-836b-a4433ea151b8","unit_price":997,"total_price":997}],"estimateItems":[{"id":"fd947674-d816-4798-bc68-370015d35086","part_id":null,"discount":0,"quantity":1,"warranty":"40 Days","item_name":"ygygygy","created_at":"2026-11-21T13:21:20.043+00:00","unit_price":997,"estimate_id":"763f5c10-3915-44b4-ae1f-e9e1120a1a51","total_price":997}],"statusHistory":[{"id":"7b7b20e4-e925-48ba-b434-0ead684f0dab","notes":"Device accepted into shop service. Assigned Job #mobo-2026-0001. Customer complaint: \"dihhhh\".","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","to_status":"RECEIVED","created_at":"2026-11-21T13:20:45.863+00:00","from_status":null,"action_title":"Device Received & Job Sheet Created","performed_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"4b2e6cd2-ac86-4b12-b869-3f99d016f21e","notes":"Technician mobotech mobilecare has begun device bench testing and inspection.","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","to_status":"DIAGNOSING","created_at":"2026-11-21T13:20:53.608+00:00","from_status":"RECEIVED","action_title":"Diagnostic Assessment Started","performed_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"16cbc011-2838-4bd6-af2a-374e05384dc7","notes":"Final repair cost ₹997.00 confirmed directly by shop owner.","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","to_status":"IN_PROGRESS","created_at":"2026-11-21T13:21:20.517+00:00","from_status":"DIAGNOSING","action_title":"Repair Started (Direct Approval)","performed_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"e78b9c15-27e0-4249-9f88-bb4552bc1852","notes":"Physical repair work completed by mobotech mobilecare. Device sent to Quality Check testing bench.","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","to_status":"TESTING","created_at":"2026-11-21T13:21:31.788+00:00","from_status":"IN_PROGRESS","action_title":"Hardware Repair Finished - Testing Required","performed_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"6ad8582c-8460-45aa-b522-31b13a024ed5","notes":"Quality inspection updated: 16 PASS, 0 FAIL, 0 NOT TESTED.","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","to_status":"TESTING","created_at":"2026-11-21T13:21:34.025+00:00","from_status":"TESTING","action_title":"Quality Testing Checklist Updated","performed_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"a6c68034-ace6-461f-8b50-b4e482b3b6c6","notes":"All quality checks verified. Device cleaned and packaged for pickup.","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","to_status":"READY_FOR_PICKUP","created_at":"2026-11-21T13:21:34.922+00:00","from_status":"TESTING","action_title":"Device Marked Ready for Customer Pickup","performed_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"dc8db732-5fa3-467e-9c74-3eabefef9d20","notes":"Recorded by staff. Total cost: ₹997.00, Total paid: ₹997.00, Remaining balance: ₹0.00. Ref: N/A","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","to_status":"READY_FOR_PICKUP","created_at":"2026-11-21T13:21:58.524+00:00","from_status":"READY_FOR_PICKUP","action_title":"Payment Received: ₹997.00 (CASH)","performed_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"},{"id":"5624787d-c9de-47d0-852f-f8dac6389f6b","notes":"Customer tested phone and signed confirmation: \"Device received and working properly.\" Handled by staff mobotech mobilecare.","job_id":"20377a28-191f-4860-b6a6-d6ce5a09f543","to_status":"DELIVERED","created_at":"2026-11-21T13:22:07.776+00:00","from_status":"DELIVERED","action_title":"Device Delivered to Customer","performed_by_user_id":"adcae8d1-2594-4d46-a684-1cbef989e5f9"}]}'::jsonb, 'mobotech mobilecare', '2026-11-21T13:25:40.568+00:00'::timestamptz, '2026-12-21T13:25:40.568+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."_app_backup_assets" (0 rows on live production)

-- Table: public."users" (8 rows)
INSERT INTO public."users" ("id", "role_id", "full_name", "email", "password_hash", "phone", "is_active", "avatar_url", "last_login_at", "created_at", "updated_at") VALUES ('10000000-0000-0000-0000-000000000001'::uuid, 'admin', 'Milan Devani', 'admin@mobotech.com', '$2b$10$FAOQJQo5YAUVcBEWAG6Nk.bWO3fhPfmNuNV5k8raCEtNmYjtjo8UO', '080000 24439', TRUE, '', NULL, '2026-11-17T11:04:55.268061+00:00'::timestamptz, '2026-11-17T11:04:55.268061+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."users" ("id", "role_id", "full_name", "email", "password_hash", "phone", "is_active", "avatar_url", "last_login_at", "created_at", "updated_at") VALUES ('10000000-0000-0000-0000-000000000002'::uuid, 'technician', 'Rahul Patel', 'tech@mobotech.com', '$2b$10$6l8WpKdtQMWEmUJcBTO5Y.LkHlrlh.n6f8EbmjtyT3TeTzWIsrirW', '9876500001', TRUE, '', NULL, '2026-11-17T11:04:55.268061+00:00'::timestamptz, '2026-11-17T11:04:55.268061+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."users" ("id", "role_id", "full_name", "email", "password_hash", "phone", "is_active", "avatar_url", "last_login_at", "created_at", "updated_at") VALUES ('10000000-0000-0000-0000-000000000003'::uuid, 'staff', 'Priya Shah', 'staff@mobotech.com', '$2b$10$nd.w13kHvhcFn0fkcB54dujgQna32CxiXo0TkQVX/LZ6sOVTmE6G.', '9876500002', TRUE, '', NULL, '2026-11-17T11:04:55.268061+00:00'::timestamptz, '2026-11-17T11:04:55.268061+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."users" ("id", "role_id", "full_name", "email", "password_hash", "phone", "is_active", "avatar_url", "last_login_at", "created_at", "updated_at") VALUES ('10000000-0000-0000-0000-000000000004'::uuid, 'technician', 'Amit Desai', 'tech2@mobotech.com', '$2b$10$6l8WpKdtQMWEmUJcBTO5Y.LkHlrlh.n6f8EbmjtyT3TeTzWIsrirW', '9876500003', TRUE, '', NULL, '2026-11-17T11:04:55.268061+00:00'::timestamptz, '2026-11-17T11:04:55.268061+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."users" ("id", "role_id", "full_name", "email", "password_hash", "phone", "is_active", "avatar_url", "last_login_at", "created_at", "updated_at") VALUES ('10000000-0000-0000-0000-000000000005'::uuid, 'admin', 'Nisha Mehta', 'manager@mobotech.com', '$2b$10$FAOQJQo5YAUVcBEWAG6Nk.bWO3fhPfmNuNV5k8raCEtNmYjtjo8UO', '9876500004', TRUE, '', NULL, '2026-11-17T11:04:55.268061+00:00'::timestamptz, '2026-11-17T11:04:55.268061+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."users" ("id", "role_id", "full_name", "email", "password_hash", "phone", "is_active", "avatar_url", "last_login_at", "created_at", "updated_at") VALUES ('01f58719-18f5-4de3-b0d9-e12bc3778e4c'::uuid, 'developer', 'Developer', 'developer@mobotech.com', '$2b$10$iyrTc44Zdw.ZzQ9BD6KN0.WkiWuYfKZxnvjtJCA1.igi1riQz3d5S', '080000 24439', TRUE, '', NULL, '2026-11-20T09:13:42.025+00:00'::timestamptz, '2026-11-20T09:13:42.037+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."users" ("id", "role_id", "full_name", "email", "password_hash", "phone", "is_active", "avatar_url", "last_login_at", "created_at", "updated_at") VALUES ('72648439-0714-4c34-99ef-b67b4a55b209'::uuid, 'admin', 'Mobotech', 'mobotech@gmail.com', '$2b$10$FucxEULZ.bdNtwkyooSgVOMhD9cGgZkNTxvGsAbtfsrFFWmBPb5HO', '80000 24439', TRUE, '', NULL, '2026-11-21T09:39:54.74+00:00'::timestamptz, '2026-11-21T09:39:54.74+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."users" ("id", "role_id", "full_name", "email", "password_hash", "phone", "is_active", "avatar_url", "last_login_at", "created_at", "updated_at") VALUES ('adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, 'admin', 'mobotech mobilecare', 'mobotechmobilecare.support@gmail.com', '$2b$10$4j4MmBJSxrzbKErIjODFDOpMna/Uaj1mJeUnpvHPntWI4eEU3r/3q', '80000 24439', TRUE, '', NULL, '2026-11-21T11:55:35.433+00:00'::timestamptz, '2026-11-21T11:55:35.433+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."customers" (4 rows)
INSERT INTO public."customers" ("id", "shop_id", "customer_code", "full_name", "email", "phone", "whatsapp_number", "alternate_phone", "alternate_whatsapp", "gender", "user_type", "address", "city", "state", "postal_code", "notes", "created_at", "updated_at", "date_of_birth") VALUES ('1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, NULL, 'CUST-0001', 'mobotech mobilecare', 'milandevani994@gmail.com', '8000024439', '8000024439', '', '', 'male', 'End User', '', '', '', '', '', '2026-11-21T11:57:11.951+00:00'::timestamptz, '2026-11-21T11:57:11.951+00:00'::timestamptz, '1996-05-08'::date) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "shop_id", "customer_code", "full_name", "email", "phone", "whatsapp_number", "alternate_phone", "alternate_whatsapp", "gender", "user_type", "address", "city", "state", "postal_code", "notes", "created_at", "updated_at", "date_of_birth") VALUES ('20435e28-65f9-407b-9633-dc7d8fd10990'::uuid, NULL, 'CUST-0002', 'sailesh bhai savani', 'saileshsavani20486@gmail.com', '9723183737', '9723183737', '', '', 'male', 'End User', 'katargam ', 'surat', 'gujrat ', '', '', '2026-11-21T13:35:17.502+00:00'::timestamptz, '2026-11-21T13:35:17.502+00:00'::timestamptz, '1986-04-20'::date) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "shop_id", "customer_code", "full_name", "email", "phone", "whatsapp_number", "alternate_phone", "alternate_whatsapp", "gender", "user_type", "address", "city", "state", "postal_code", "notes", "created_at", "updated_at", "date_of_birth") VALUES ('1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, NULL, 'CUST-0003', 'kamlesh bhai vegad', 'kamleshveg@gmail.com', '7203802903', '7203802903', '', '', 'male', 'End User', 'surat', 'surat', 'gujrat', '', '', '2026-11-22T07:37:17.51+00:00'::timestamptz, '2026-11-22T07:37:17.51+00:00'::timestamptz, '1996-10-31'::date) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "shop_id", "customer_code", "full_name", "email", "phone", "whatsapp_number", "alternate_phone", "alternate_whatsapp", "gender", "user_type", "address", "city", "state", "postal_code", "notes", "created_at", "updated_at", "date_of_birth") VALUES ('67d28bba-b993-4c67-95bd-3c53cc7abba1'::uuid, NULL, 'CUST-0004', 'jay sutariya', 'sutariyajay8286@gmail.com', '8128326657', '8128326657', '', '', 'male', 'End User', 'surat', '', '', '', '', '2026-11-23T04:46:00.812+00:00'::timestamptz, '2026-11-23T04:46:00.812+00:00'::timestamptz, '2004-11-18'::date) ON CONFLICT DO NOTHING;

-- Table: public."parts" (1 row)
INSERT INTO public."parts" ("id", "shop_id", "part_code", "name", "part_number", "brand", "category", "compatible_models", "purchase_cost", "selling_price", "stock_quantity", "minimum_stock", "supplier", "status", "created_at", "updated_at", "warranty", "serial_number", "imei") VALUES ('66846b10-17da-4bcf-883e-a709337931c9'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'PART-001', 'IPhone 18 pro', NULL, 'Apple', 'Phone', '', 120000, 130000, 9, 2, '', 'ACTIVE', '2026-11-21T12:03:20.672+00:00'::timestamptz, '2026-11-21T12:04:23.229+00:00'::timestamptz, '30 Days', 'nnjknvkenv83', '678678678687687687') ON CONFLICT DO NOTHING;

-- Table: public."vendors" (0 rows on live production)

-- Table: public."review_settings" (0 rows on live production)

-- Table: public."devices" (5 rows)
INSERT INTO public."devices" ("id", "customer_id", "brand", "model", "color", "storage_capacity", "imei", "serial_number", "passcode", "operating_system", "invoice_date", "invoice_number", "expiry_date", "cosmetic_condition", "created_at", "updated_at") VALUES ('303d4a96-cb03-47f8-a14d-08789371bac9'::uuid, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'Apple', 'Iphone 12 pro', 'blue', '256GB', '656757576575757', 'csdcdcs8866cs', '101010', 'iOS', NULL, '', NULL, 'Wear And Tear', '2026-11-21T11:58:22.023+00:00'::timestamptz, '2026-11-21T11:58:22.023+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."devices" ("id", "customer_id", "brand", "model", "color", "storage_capacity", "imei", "serial_number", "passcode", "operating_system", "invoice_date", "invoice_number", "expiry_date", "cosmetic_condition", "created_at", "updated_at") VALUES ('a5049662-7cd3-48d1-b453-9ed29d7b4d2e'::uuid, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'Apple', 'Iphone 12 pro', 'blue', '64GB', '644647557575757', 'ffg7676', '111111', 'iOS', NULL, '', NULL, 'Wear And Tear', '2026-11-21T12:17:51.258+00:00'::timestamptz, '2026-11-21T12:17:51.258+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."devices" ("id", "customer_id", "brand", "model", "color", "storage_capacity", "imei", "serial_number", "passcode", "operating_system", "invoice_date", "invoice_number", "expiry_date", "cosmetic_condition", "created_at", "updated_at") VALUES ('dbb0593a-3b50-45a7-826f-6c5fa14683fe'::uuid, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'Apple', '14 pro', 'blue', '64GB', '123455756786872', 'whyuwfyuwguygw', 'iioiuyoiy3', 'iOS', NULL, '', NULL, 'Deep Scratches / Dents', '2026-11-21T12:24:24.727+00:00'::timestamptz, '2026-11-21T12:24:24.727+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."devices" ("id", "customer_id", "brand", "model", "color", "storage_capacity", "imei", "serial_number", "passcode", "operating_system", "invoice_date", "invoice_number", "expiry_date", "cosmetic_condition", "created_at", "updated_at") VALUES ('c06d4ffa-60d7-4894-be57-338d533c3dce'::uuid, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'Apple', 'Iphone 12 pro', 'blue', '32GB', '555666666666666', 'gggb66', '000000', 'iOS', NULL, '', NULL, 'Wear And Tear', '2026-11-21T13:20:45.619+00:00'::timestamptz, '2026-11-21T13:20:45.619+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."devices" ("id", "customer_id", "brand", "model", "color", "storage_capacity", "imei", "serial_number", "passcode", "operating_system", "invoice_date", "invoice_number", "expiry_date", "cosmetic_condition", "created_at", "updated_at") VALUES ('1d124680-ac06-430b-b2b6-4115e1a43985'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'Apple', '16 plus', 'white', '128GB', '352973358242941', 'MXVV3HN/A', '3110', 'iOS', NULL, '', NULL, 'Minor Scratches on Glass/Frame', '2026-11-22T07:40:29.887+00:00'::timestamptz, '2026-11-22T07:40:29.887+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."backup_logs" (10 rows)
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('151290e8-abdd-48fb-87f6-0222f247b8c7'::uuid, 'MANUAL', 'COMPLETED', 'backup-20-11-2026-21-05-09.enc', '1lFoUNbGodtc-Laum0vgbtMu4hvKcvqfR', '1cOYpXpbWwHsKPIonBNFTWCGSIsZU_kH-', 8894805, 'f6b10ebcdc4972a7e5c3ea22c831d635', 14201, NULL, '10000000-0000-0000-0000-000000000001'::uuid, '2026-11-20T20:05:09.524+00:00'::timestamptz, '2026-11-20T20:05:23.626+00:00'::timestamptz, '1q-W_qDwqLzLh-_RiAU0Ok5KlZVYSdJp1', '1Q_to54OE4NsTdLdafCJOizrM68ziUjQm') ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('23ac26d5-4d9a-4423-8357-300c231bc3f5'::uuid, 'MANUAL', 'COMPLETED', 'backup-20-11-2026-10-53-33.enc', '1u8DP3TcvkPqwd-ywNelA4fBJjNG200pk', '1nuPgqqJEgmoxJJ-9cSXWud1FxNkecSk1', 8846743, '76d2d349bd723ffe1ccf33208ed5f86a', 18420, NULL, '10000000-0000-0000-0000-000000000001'::uuid, '2026-11-20T10:53:33.345+00:00'::timestamptz, '2026-11-20T10:53:51.67+00:00'::timestamptz, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('5a5ee5c8-3d5b-4f61-a57b-7efc81c54e3b'::uuid, 'MANUAL', 'COMPLETED', 'backup-20-11-2026-10-51-41.enc', '1rWDUHVs9uc4iY8Tj96SFHQaWKxIRfTQj', '1nuPgqqJEgmoxJJ-9cSXWud1FxNkecSk1', 8890406, '5154459705b79d752142d2c22fbe15a9', 16987, NULL, '10000000-0000-0000-0000-000000000001'::uuid, '2026-11-20T10:51:41.911+00:00'::timestamptz, '2026-11-20T10:51:58.694+00:00'::timestamptz, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('693ffd9f-03ea-459b-862a-4484e3dc8fba'::uuid, 'MANUAL', 'COMPLETED', 'backup-20-11-2026-10-50-37.enc', '1mRE3ZeG5SYqnZ8gDagBdoG0FFws5UgHs', '1nuPgqqJEgmoxJJ-9cSXWud1FxNkecSk1', 8890236, '207df6ba2c9a806d997f57844b1f23e4', 27434, NULL, '10000000-0000-0000-0000-000000000001'::uuid, '2026-11-20T10:50:37.725+00:00'::timestamptz, '2026-11-20T10:51:05.025+00:00'::timestamptz, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('7aef7ee7-73bc-4735-87d1-0bce56bfe9ce'::uuid, 'MANUAL', 'COMPLETED', 'backup-21-11-2026-11-51-25.sql', '1SqDE8K5-UGB1K9vvLGoQ6mUn4x4D7Cmz', '1Q_to54OE4NsTdLdafCJOizrM68ziUjQm', 12768671, '5f38cb2df611027c2c1f02520dc58907', 18819, NULL, '01f58719-18f5-4de3-b0d9-e12bc3778e4c'::uuid, '2026-11-21T11:51:25.03+00:00'::timestamptz, '2026-11-21T11:51:43.751+00:00'::timestamptz, '1Tm775BksBoEWYGu6F9qwNshv_Qt8kPJ2', '1Q_to54OE4NsTdLdafCJOizrM68ziUjQm') ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('8ebba610-6ae3-41fa-85be-8f228252cb1d'::uuid, 'MANUAL', 'COMPLETED', 'backup-20-11-2026-20-46-44.enc', '1hBNObET8q28Q-BgX2BMkfDz4vNq4sErg', '1cOYpXpbWwHsKPIonBNFTWCGSIsZU_kH-', 8894755, '71fefe384dd09f8964f9da923e843688', 17946, NULL, '10000000-0000-0000-0000-000000000001'::uuid, '2026-11-20T19:46:44.319+00:00'::timestamptz, '2026-11-20T19:47:02.156+00:00'::timestamptz, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('bf102e13-73d1-4afc-83c9-5d6cb9a787d8'::uuid, 'MANUAL', 'COMPLETED', 'backup-21-11-2026-11-18-44.sql', '1SUjasHWbfukdlHY4JRSwznnv6JdYnwZM', '1cOYpXpbWwHsKPIonBNFTWCGSIsZU_kH-', 13376032, '36e871bd57e512525e767d2cd383ee6e', 16067, NULL, '01f58719-18f5-4de3-b0d9-e12bc3778e4c'::uuid, '2026-11-21T10:18:44.206+00:00'::timestamptz, '2026-11-21T10:19:00.212+00:00'::timestamptz, '1pnddLHRdYqflbYg796Bi-2P8TtwEuKkp', '1Q_to54OE4NsTdLdafCJOizrM68ziUjQm') ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('ccec7f2e-c7c1-46e0-b2b0-240c22c701f6'::uuid, 'MANUAL', 'COMPLETED', 'backup-21-11-2026-04-06-53.sql', '1FwQX0aK5-Cy83uqdjROvvlZ_6lsq7Eu2', '1cOYpXpbWwHsKPIonBNFTWCGSIsZU_kH-', 13285823, '1d20fc283fb677ba50849e967daebcc0', 16273, NULL, '01f58719-18f5-4de3-b0d9-e12bc3778e4c'::uuid, '2026-11-21T03:06:53.019+00:00'::timestamptz, '2026-11-21T03:07:09.186+00:00'::timestamptz, '13BOK9q48JmznFoSKvPGmIaUJZbLTY_fp', '1Q_to54OE4NsTdLdafCJOizrM68ziUjQm') ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('d4dac1c5-d0d1-4aeb-b67a-f3f43feb891b'::uuid, 'MANUAL', 'COMPLETED', 'backup-21-11-2026-10-08-59.sql', '18OZojescYx4y5TkKOl2b_yX1g9ZuEuXd', '1cOYpXpbWwHsKPIonBNFTWCGSIsZU_kH-', 13375908, '51d66ce480bb0412cee0c441c2fdbddd', 19920, NULL, '01f58719-18f5-4de3-b0d9-e12bc3778e4c'::uuid, '2026-11-21T10:08:59.071+00:00'::timestamptz, '2026-11-21T10:09:18.871+00:00'::timestamptz, '1W9QF7pq1bW1r_SKE9UwzbRutzdfRjq3o', '1Q_to54OE4NsTdLdafCJOizrM68ziUjQm') ON CONFLICT DO NOTHING;
INSERT INTO public."backup_logs" ("id", "backup_type", "status", "filename", "drive_file_id", "drive_folder_id", "file_size_bytes", "checksum_md5", "duration_ms", "error_message", "created_by_user_id", "started_at", "completed_at", "drive_file_id_2", "drive_folder_id_2") VALUES ('dc1ca3d2-0d27-424f-ab90-852941b78529'::uuid, 'MANUAL', 'COMPLETED', 'backup-21-11-2026-09-51-24.sql', NULL, NULL, 13374493, NULL, 9884, 'Google Drive Account 1 OAuth token expired (invalid_grant). Backup safely stored locally on server. Please reconnect Account 1 in Settings.', '01f58719-18f5-4de3-b0d9-e12bc3778e4c'::uuid, '2026-11-21T09:51:24.667+00:00'::timestamptz, '2026-11-21T09:51:34.435+00:00'::timestamptz, NULL, NULL) ON CONFLICT DO NOTHING;

-- Table: public."sales" (0 rows on live production)

-- Table: public."vendor_transactions" (0 rows on live production)

-- Table: public."vendor_payments" (0 rows on live production)

-- Table: public."repair_jobs" (1 row)
INSERT INTO public."repair_jobs" ("id", "job_number", "shop_id", "customer_id", "device_id", "assigned_technician_id", "created_by_user_id", "status", "priority", "service_type", "customer_complaint", "device_condition", "accessories_received", "subtotal", "discount", "discount_type", "discount_value", "tax_rate", "tax_amount", "total_amount", "paid_amount", "balance_due", "payment_status", "is_warranty_claim", "reopen_count", "warranty_same_issue", "reopened_at", "reopened_by_user_id", "warranty_claim_type", "warranty_free_rework", "last_warranty_issue", "reopen_notes", "previous_delivered_at", "approval_notes", "previous_total_amount", "previous_balance_due", "customer_tested_device", "customer_acceptance_confirmed", "customer_signature", "delivery_notes", "delivered_at", "delivered_by_user_id", "approval_token", "approval_status", "approval_decision_at", "rejection_reason", "warranty_days", "created_at", "updated_at", "payment_remaining_authorized", "warranty_rework_reason", "warranty_history", "warranty_parts", "advance_amount", "remaining_authorized_balance", "vendor_sent_at", "vendor_expected_back_date") VALUES ('5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'mobo-2026-0001', 'a0000000-0000-0000-0000-000000000001'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, '1d124680-ac06-430b-b2b6-4115e1a43985'::uuid, NULL, 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, 'APPROVED', 'NORMAL', 'Pending', 'charging problem mother bord repair', '{"dents":false,"notes":"","touch":"Working","camera":"Yes","screen":"Working","speaker":"Working","checklist":{"dents":"No","touch":"Yes","camera":"Yes","screen":"Yes","speaker":"Yes","powers_on":"Yes","back_glass":"No","power_button":"Yes","charging_port":"Yes","screw_missing":"No","headphone_jack":"Yes","volume_buttons":"Yes","sim_tray_missing":"No","face_id_fingerprint":"Yes"},"powers_on":true,"back_glass":"Intact","power_button":"Working","water_damage":false,"charging_port":"Working","screw_missing":false,"headphone_jack":"Working","volume_buttons":"Working","sim_tray_missing":false,"face_id_fingerprint":"Yes"}'::jsonb, '[]'::jsonb, 7000, 0, 'AMOUNT', 0, 0, 0, 7000, 7000, 0, 'PAID', FALSE, 0, FALSE, NULL, NULL, NULL, FALSE, NULL, NULL, NULL, 'Approved directly by shop owner (walk-in / over-the-counter).', 0, 0, FALSE, FALSE, NULL, NULL, NULL, NULL, 'dc475fe5-4ddf-4c7c-b186-62ea758adb5c', 'APPROVED', '2026-11-22T07:59:42.296+00:00'::timestamptz, NULL, 30, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T08:00:56.846+00:00'::timestamptz, FALSE, NULL, '[]'::jsonb, '[]'::jsonb, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING;

-- Table: public."job_status_history" (7 rows)
INSERT INTO public."job_status_history" ("id", "job_id", "from_status", "to_status", "action_title", "notes", "performed_by_user_id", "created_at") VALUES ('99041ee6-6705-44bc-ad96-9693ef48c7df'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, NULL, 'RECEIVED', 'Device Received & Job Sheet Created', 'Device accepted into shop service. Assigned Job #mobo-2026-0001. Customer complaint: "charging problem mother bord repair".', 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T07:40:30.067+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."job_status_history" ("id", "job_id", "from_status", "to_status", "action_title", "notes", "performed_by_user_id", "created_at") VALUES ('d84ba787-578d-4c17-adcc-c982f6438ef1'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'RECEIVED', 'DIAGNOSING', 'Diagnostic Assessment Started', 'Technician mobotech mobilecare has begun device bench testing and inspection.', 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T07:41:20.355+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."job_status_history" ("id", "job_id", "from_status", "to_status", "action_title", "notes", "performed_by_user_id", "created_at") VALUES ('3e66badd-75b9-4a35-be95-a411bc5aa6fd'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'DIAGNOSING', 'DIAGNOSING', 'Diagnosis Findings Recorded', 'Root cause: no damage . Solution: motherbord repair charging isu...', 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T07:42:08.411+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."job_status_history" ("id", "job_id", "from_status", "to_status", "action_title", "notes", "performed_by_user_id", "created_at") VALUES ('8dfea1a0-483a-45c4-a37d-a12d8dcd256f'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'DIAGNOSING', 'APPROVED', 'Estimate Approved (Direct)', 'Final repair cost ₹7000.00 confirmed directly by shop owner.', 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T07:43:50.16+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."job_status_history" ("id", "job_id", "from_status", "to_status", "action_title", "notes", "performed_by_user_id", "created_at") VALUES ('7979b111-7248-4240-9ead-810ce0c5f098'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'APPROVED', 'APPROVED', 'Diagnosis Findings Recorded', 'Root cause: no damage . Solution: motherbord repair charging isu...', 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T07:44:16.862+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."job_status_history" ("id", "job_id", "from_status", "to_status", "action_title", "notes", "performed_by_user_id", "created_at") VALUES ('ab521021-5f6e-4a31-b7e3-5e9406a78810'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'APPROVED', 'APPROVED', 'Estimate Approved (Direct)', 'Final repair cost ₹7000.00 confirmed directly by shop owner.', 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T07:59:42.436+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."job_status_history" ("id", "job_id", "from_status", "to_status", "action_title", "notes", "performed_by_user_id", "created_at") VALUES ('ee2620cf-7c90-4276-94c1-84e87b382619'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'APPROVED', 'APPROVED', 'Payment Received: ₹7000.00 (CASH)', 'Recorded by staff. Total cost: ₹7000.00, Total paid: ₹7000.00, Remaining balance: ₹0.00. Ref: N/A', 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T08:00:56.846+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."diagnoses" (1 row)
INSERT INTO public."diagnoses" ("id", "job_id", "diagnosed_by_user_id", "reported_issue", "technician_findings", "root_cause", "recommended_solution", "internal_technician_notes", "created_at", "updated_at") VALUES ('529f85c4-ae7b-474b-a28b-7c3a77fcf871'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, 'charging problem mother bord repair', 'no damage', 'no damage ', 'motherbord repair charging isu', 'charging ic replacement ', '2026-11-22T07:42:08.188+00:00'::timestamptz, '2026-11-22T07:44:16.735+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."part_stock_movements" (1 row)
INSERT INTO public."part_stock_movements" ("id", "part_id", "job_id", "movement_type", "quantity", "previous_stock", "new_stock", "reference_number", "notes", "created_by_user_id", "created_at") VALUES ('195fb0e1-83f3-4f61-9e5a-8cf05b5aae59'::uuid, '66846b10-17da-4bcf-883e-a709337931c9'::uuid, NULL, 'SALE', -1, 10, 9, '2', 'Direct Sale Invoice Bill #2', '10000000-0000-0000-0000-000000000001'::uuid, '2026-11-21T12:04:23.23+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."repair_estimates" (1 row)
INSERT INTO public."repair_estimates" ("id", "job_id", "labor_charge", "parts_subtotal", "discount", "discount_type", "discount_value", "tax_rate", "tax_amount", "total_amount", "notes", "valid_until", "status", "created_by_user_id", "created_at", "updated_at") VALUES ('d799171c-fa0d-46e6-a8fd-52c16898b0b5'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 0, 7000, 0, 'AMOUNT', 0, 0, 0, 7000, 'charging ic replacemnt ', NULL, 'SENT', 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T07:43:49.674+00:00'::timestamptz, '2026-11-22T07:59:41.772+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."repair_job_parts" (0 rows on live production)

-- Table: public."repair_job_labor" (0 rows on live production)

-- Table: public."repair_tests" (16 rows)
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('3f2edc84-2534-4a86-907e-49d664a4771d'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'power_on', 'Device Powers On', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T07:40:30.067+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('b8406447-653e-4879-80b1-a4f9ee083292'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'display', 'Display & Color Quality', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T07:40:30.067+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('897175c6-5e3f-431a-bb18-e06abd2a4bd9'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'touch', 'Touchscreen Responsiveness', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T07:40:30.067+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('f5bdd49a-af2e-4c07-8168-cca45937c75d'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'charging', 'Charging Port & Current Draw', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T07:40:30.067+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('b884d937-11f6-49ec-a482-8493cbd07625'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'camera_rear', 'Rear Main Camera & Focus', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T07:40:30.067+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('11e1a6c2-6bb6-464c-9ee7-f3a87bad523c'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'camera_front', 'Front Camera', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T07:40:30.067+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('55de5de1-04f0-43a2-b746-01d5f5b9af02'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'speaker_loud', 'Loudspeaker / Media Audio', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T07:40:30.067+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('e7ff1ac6-910f-44cb-a23a-d344767b7019'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'speaker_ear', 'Earpiece Speaker', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.067+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('9523402f-b3c0-4c11-942f-e1f2e1849dd1'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'microphone', 'Microphone & Noise Cancelling', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.068+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('ae325dfe-849f-4fdf-ae4e-6b42af21bcba'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'wifi', 'Wi-Fi Connection & Signal', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.068+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('d5245e5e-1e7f-4a5b-acc2-1fcb75d5d55c'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'bluetooth', 'Bluetooth Pairing', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.068+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('29792c2c-c7f2-4679-a657-ba0b49b7c683'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'sim_network', 'SIM Card & Cellular Network', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.068+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('8fec1e49-1a00-4a6a-b4fb-77b4f108c64b'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'biometrics', 'Fingerprint / Face ID', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.068+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('d59cd083-a803-4576-b9f3-57e3a91bef1b'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'buttons', 'Physical Buttons (Power/Volume)', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.068+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('f85cde68-f8e6-4d87-bf81-c02fabcd7a80'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'battery_health', 'Battery Health & Charge Hold', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.068+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."repair_tests" ("id", "job_id", "test_key", "test_label", "result", "notes", "tested_by_user_id", "tested_at", "created_at", "updated_at") VALUES ('7dfc1b9e-bd50-48b7-ad68-6441f99bf23e'::uuid, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, 'sensors', 'Proximity Sensor & Accelerometer', 'NOT_TESTED', '', NULL, NULL, '2026-11-22T07:40:30.068+00:00'::timestamptz, '2026-11-22T07:40:30.068+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."payments" (1 row)
INSERT INTO public."payments" ("id", "payment_number", "job_id", "customer_id", "amount", "payment_method", "payment_status", "transaction_reference", "received_by_user_id", "notes", "paid_at", "created_at") VALUES ('c6b6daff-b9e9-4924-8f03-89b9cd914d53'::uuid, 'PAY-2026-00001', '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 7000, 'CASH', 'COMPLETED', NULL, 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '', '2026-11-22T08:00:56.846+00:00'::timestamptz, '2026-11-22T08:00:56.846+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."invoices" (1 row)
INSERT INTO public."invoices" ("id", "invoice_number", "job_id", "customer_id", "shop_id", "subtotal", "labor_amount", "parts_amount", "discount", "discount_type", "discount_value", "tax_rate", "tax_amount", "total_amount", "paid_amount", "balance_due", "payment_status", "warranty_period", "notes", "pdf_url", "issued_by_user_id", "issued_at", "created_at") VALUES ('05c84729-ad4c-4506-90e4-a9041d20b139'::uuid, 'INV-2026-000001', '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 7000, 0, 7000, 0, 'AMOUNT', 0, 0, 0, 7000, 7000, 0, 'PAID', '90 Days Hardware Warranty', 'Thank you for choosing Mobotech mobile care for your mobile device repair!', NULL, 'adcae8d1-2594-4d46-a684-1cbef989e5f9'::uuid, '2026-11-22T07:46:04.456+00:00'::timestamptz, '2026-11-22T07:46:04.456+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."attachments" (0 rows on live production)

-- Table: public."notifications" (0 rows on live production)

-- Table: public."vendor_mobiles" (0 rows on live production)

-- Table: public."repair_estimate_items" (1 row)
INSERT INTO public."repair_estimate_items" ("id", "estimate_id", "part_id", "item_name", "warranty", "quantity", "unit_price", "discount", "total_price", "created_at") VALUES ('7c1eae18-385b-44dd-b30a-72918efed7a1'::uuid, 'd799171c-fa0d-46e6-a8fd-52c16898b0b5'::uuid, NULL, 'charging isu', '30 Days', 1, 7000, 0, 7000, '2026-11-22T07:59:41.773+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."invoice_items" (1 row)
INSERT INTO public."invoice_items" ("id", "invoice_id", "item_type", "item_name", "warranty", "quantity", "unit_price", "total_price", "created_at") VALUES ('303ec70d-fcca-4ce2-af1b-a93e07cd0ab2'::uuid, '05c84729-ad4c-4506-90e4-a9041d20b139'::uuid, 'PART', 'charging isu', '30 Days', 1, 7000, 7000, '2026-11-22T08:00:57.188+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."notification_logs" (58 rows)
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('44b8127c-26b8-4cac-b73a-86b9d302773d'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'JOB_CREATED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_2525', '{"success":true,"provider":"BREVO_SMTP_PORT_2525","messageId":"<fc22b4c5-5e69-e302-4a9e-8f250576335e@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T11:58:52.564+00:00'::timestamptz, '2026-11-21T11:58:52.564+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('21198141-8e6d-470b-9ce1-ee49811f528f'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'JOB_CREATED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0317F05719AB2C15E62"}'::jsonb, NULL, 0, '2026-11-21T11:58:54.704+00:00'::timestamptz, '2026-11-21T11:58:54.704+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('4d164827-caac-47d5-853e-d81331bb3345'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'READY_FOR_PICKUP', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<f48113ce-d2f7-f6dd-43d6-a10ce6599466@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T11:59:55.518+00:00'::timestamptz, '2026-11-21T11:59:55.518+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('a498703a-596e-48ac-b378-d0057199ad00'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'READY_FOR_PICKUP', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0FBA03E990407D739DD"}'::jsonb, NULL, 0, '2026-11-21T11:59:55.633+00:00'::timestamptz, '2026-11-21T11:59:55.633+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('1640d30d-fdb0-4a76-adcb-70892befd14a'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'PAYMENT_RECEIVED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<fadbed1d-b67a-1146-3e89-56541bf3aad2@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T12:00:02.511+00:00'::timestamptz, '2026-11-21T12:00:02.511+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('c09e3ed0-b46b-44b5-9a5b-945c85bcb6d2'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'PAYMENT_RECEIVED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0BF3E637533A7E3D6AD"}'::jsonb, NULL, 0, '2026-11-21T12:00:02.606+00:00'::timestamptz, '2026-11-21T12:00:02.606+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('c4ede688-e54c-4d17-b786-e1ec7c75b9b2'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'INVOICE_GENERATED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<041274fd-1939-2966-cd5e-a4961ec37f6e@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T12:00:29.58+00:00'::timestamptz, '2026-11-21T12:00:29.58+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('d8fe0735-1bec-47a7-9644-164135922c5d'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0A7ABCA0CBBFBB0F0BA"}'::jsonb, NULL, 0, '2026-11-21T12:00:30.582+00:00'::timestamptz, '2026-11-21T12:00:30.582+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('8bfcb444-c2dd-4aa8-a0e9-6e24b403a426'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'SALES_INVOICE_PDF', '8000024439', 'SENT', 'BAILEYS', '"Real PDF Sent"'::jsonb, NULL, 0, '2026-11-21T12:04:34.252+00:00'::timestamptz, '2026-11-21T12:04:34.252+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('e1e4b91b-690c-46ba-abf6-9edc965ceefa'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'SALES_INVOICE_PDF', 'milandevani994@gmail.com', 'SENT', 'BREVO', '"PDF Attached & Sent"'::jsonb, NULL, 0, '2026-11-21T12:04:34.345+00:00'::timestamptz, '2026-11-21T12:04:34.345+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('48dbdf18-229c-4f83-96c3-f500d9f0aa33'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'SALES_INVOICE_PDF', '8000024439', 'SENT', 'BAILEYS', '"Real PDF Sent"'::jsonb, NULL, 0, '2026-11-21T12:05:30.078+00:00'::timestamptz, '2026-11-21T12:05:30.078+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('0e0f2b3c-a7dd-4306-8bb6-39c84be44e0f'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'SALES_INVOICE_PDF', 'milandevani994@gmail.com', 'SENT', 'BREVO', '"PDF Attached & Sent"'::jsonb, NULL, 0, '2026-11-21T12:05:30.321+00:00'::timestamptz, '2026-11-21T12:05:30.321+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('f87fd9e5-6a76-4d70-baca-f022af7fb5c4'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'JOB_REOPENED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<f2642e03-8d6c-ad44-02ce-c7fc72023560@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T12:05:51.972+00:00'::timestamptz, '2026-11-21T12:05:51.972+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('69f9c40b-1bf0-467a-8bb0-556b40139677'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'JOB_REOPENED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0E30725C7959D28A346"}'::jsonb, NULL, 0, '2026-11-21T12:05:52.069+00:00'::timestamptz, '2026-11-21T12:05:52.069+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('592cfa8b-e67c-4569-a0ec-39a29c08b161'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'READY_FOR_PICKUP', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<d08b92da-3c82-7831-41c1-8ebaffac213e@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T12:06:23.707+00:00'::timestamptz, '2026-11-21T12:06:23.707+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('e13f8279-a5c9-4e99-be36-7c9f226756b8'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'READY_FOR_PICKUP', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0F6F4BF497A84FF2A9B"}'::jsonb, NULL, 0, '2026-11-21T12:06:23.793+00:00'::timestamptz, '2026-11-21T12:06:23.793+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('d6496ef4-1e83-4bdc-997b-d3a6bdb2b3ad'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'INVOICE_GENERATED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<f532a16f-d9aa-eff5-ef2c-c449d6ab3a4c@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T12:06:34.725+00:00'::timestamptz, '2026-11-21T12:06:34.725+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('74e65465-7d01-4328-809a-54fafd703067'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0A45D4A26F7CF254F1B"}'::jsonb, NULL, 0, '2026-11-21T12:06:35.637+00:00'::timestamptz, '2026-11-21T12:06:35.637+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('ee0bdcf4-d42f-42f8-b6e8-78962d1dead7'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'JOB_CREATED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<201d0210-2a01-ef01-54d3-25123e05e4ce@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T12:18:01.923+00:00'::timestamptz, '2026-11-21T12:18:01.923+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('c6294343-b0e0-432f-9417-4304bb4dc3ca'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'JOB_CREATED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0AD55460E55D6888BF0"}'::jsonb, NULL, 0, '2026-11-21T12:18:03.637+00:00'::timestamptz, '2026-11-21T12:18:03.637+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('83275088-356f-40ae-9235-38820f4799ef'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'JOB_CREATED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<9f49f90a-de8c-e440-e348-949e22060706@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T12:24:34.741+00:00'::timestamptz, '2026-11-21T12:24:34.741+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('2a1d0748-8f8d-472a-a777-26f962d23d0c'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'JOB_CREATED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0EC37239A43543AB4E2"}'::jsonb, NULL, 0, '2026-11-21T12:24:36.35+00:00'::timestamptz, '2026-11-21T12:24:36.35+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('9109db46-719a-45f0-9fad-ee72c12b729b'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'ESTIMATE_SENT', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<962c5e95-de53-6359-5b22-5289b31db3e4@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T12:26:25.9+00:00'::timestamptz, '2026-11-21T12:26:25.9+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('93f34e4d-a025-4064-ae18-6270c05bed15'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'ESTIMATE_SENT', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB02DE482B891A9FC6C0F"}'::jsonb, NULL, 0, '2026-11-21T12:26:26.016+00:00'::timestamptz, '2026-11-21T12:26:26.016+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('9339ee7e-6bce-4211-a520-c242e497e858'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'JOB_CREATED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<ba3dc0b4-b5a9-dc7f-ba7b-dd72b19e0149@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T13:20:55.587+00:00'::timestamptz, '2026-11-21T13:20:55.587+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('a292f915-07c7-47e0-baa7-502082cdbf69'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'JOB_CREATED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0A691F4EC52DDD083B8"}'::jsonb, NULL, 0, '2026-11-21T13:20:57.44+00:00'::timestamptz, '2026-11-21T13:20:57.44+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('c73922ea-3cef-4fd8-919b-01dbc7658d64'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'READY_FOR_PICKUP', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<d97d9b99-6931-1887-c6ff-42f736b5ad8a@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T13:21:36.999+00:00'::timestamptz, '2026-11-21T13:21:36.999+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('e99ca654-7df3-4f4d-a075-43f8ccb89a0c'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'READY_FOR_PICKUP', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB04C3F600D78728384B0"}'::jsonb, NULL, 0, '2026-11-21T13:21:37.105+00:00'::timestamptz, '2026-11-21T13:21:37.105+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('d673bae9-ce79-4cc4-b289-294b440545bc'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'PAYMENT_RECEIVED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<dc83e4fa-d29f-17aa-2ec3-838d6d6f710f@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T13:22:02.415+00:00'::timestamptz, '2026-11-21T13:22:02.415+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('f29efd58-fba3-4307-a187-d2cc297bb1b6'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'PAYMENT_RECEIVED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0AD8BCECBEB6E64CE28"}'::jsonb, NULL, 0, '2026-11-21T13:22:02.504+00:00'::timestamptz, '2026-11-21T13:22:02.504+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('0139b99d-d736-4b47-b647-fb71bfc28139'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'EMAIL', 'INVOICE_GENERATED', 'milandevani994@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<773b8a8c-1e07-c3ea-7ac9-ed01c354fca7@gmail.com>"}'::jsonb, NULL, 0, '2026-11-21T13:22:18.659+00:00'::timestamptz, '2026-11-21T13:22:18.659+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('15d2cfdb-0d0b-497b-9d52-46ec7b74ed09'::uuid, NULL, NULL, '1c3c0414-e0fb-4499-bb1f-9dad640775f0'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '8000024439', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0911CCDC676CB5DB38B"}'::jsonb, NULL, 0, '2026-11-21T13:22:19.43+00:00'::timestamptz, '2026-11-21T13:22:19.43+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('82e91969-d553-4765-9406-ff18b9d6f087'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'EMAIL', 'JOB_CREATED', 'kamleshveg@gmail.com', 'SENT', 'BREVO_SMTP_PORT_2525', '{"success":true,"provider":"BREVO_SMTP_PORT_2525","messageId":"<c27e849e-dc1d-8371-fccc-598bf89f7ff7@gmail.com>"}'::jsonb, NULL, 0, '2026-11-22T07:41:00.742+00:00'::timestamptz, '2026-11-22T07:41:00.742+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('8dd22a3f-c8c6-4d6e-944b-b7368ab212c0'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'JOB_CREATED', '7203802903', 'SENT', 'FAST2SMS_WHATSAPP_DIRECT', '{"data":null,"phone":"7203802903","success":true,"provider":"FAST2SMS_WHATSAPP_DIRECT"}'::jsonb, NULL, 0, '2026-11-22T07:41:00.854+00:00'::timestamptz, '2026-11-22T07:41:00.854+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('3fb284c9-c990-4471-bce3-1f78a0e11d30'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'EMAIL', 'INVOICE_GENERATED', 'kamleshveg@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<05c9c3ec-6438-01e3-de25-881a03bb87c8@gmail.com>"}'::jsonb, NULL, 0, '2026-11-22T07:46:13.285+00:00'::timestamptz, '2026-11-22T07:46:13.285+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('b00f8bc8-d12d-4ff8-9a6e-f0c133dfce09'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'FAST2SMS_WHATSAPP_DIRECT', '{"data":null,"phone":"7203802903","success":true,"provider":"FAST2SMS_WHATSAPP_DIRECT"}'::jsonb, NULL, 0, '2026-11-22T07:46:13.486+00:00'::timestamptz, '2026-11-22T07:46:13.486+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('7293eb6d-0644-495f-b9f0-d7c27d3765b9'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB06E5EF306184EBC5C18"}'::jsonb, NULL, 0, '2026-11-22T07:53:46.642+00:00'::timestamptz, '2026-11-22T07:53:46.642+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('8f427e24-b6e9-49ff-8a1e-85f389b53923'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB04B95F69E30812E01D6"}'::jsonb, NULL, 0, '2026-11-22T07:54:00.535+00:00'::timestamptz, '2026-11-22T07:54:00.535+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('f40085d1-02dd-446b-941d-de88a199d7e3'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0AD722245F0F7FB8A0D"}'::jsonb, NULL, 0, '2026-11-22T07:54:02.251+00:00'::timestamptz, '2026-11-22T07:54:02.251+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('0744d75c-1a2e-4bc4-95ec-16433a787a07'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB08961621A0634C2831B"}'::jsonb, NULL, 0, '2026-11-22T07:54:07.237+00:00'::timestamptz, '2026-11-22T07:54:07.237+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('9a3f1321-0f9c-48a1-bdb9-77bf5ca74c6f'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0F48202A0758B6F92ED"}'::jsonb, NULL, 0, '2026-11-22T07:54:21.635+00:00'::timestamptz, '2026-11-22T07:54:21.635+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('4adbaef0-baaa-41fc-9118-c81fc5f54412'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB077C0F8C4A4FAACFC77"}'::jsonb, NULL, 0, '2026-11-22T07:54:51.136+00:00'::timestamptz, '2026-11-22T07:54:51.136+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('bebc7ecc-baf9-4021-b266-c9ec43f8d15c'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB09E8F31AD74C9E3FA1C"}'::jsonb, NULL, 0, '2026-11-22T07:54:54.237+00:00'::timestamptz, '2026-11-22T07:54:54.237+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('ddaccaf5-aa78-47fc-b036-cc43f696a1b5'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB073E6C871D43BBADC5C"}'::jsonb, NULL, 0, '2026-11-22T07:54:55.641+00:00'::timestamptz, '2026-11-22T07:54:55.641+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('ee359751-99d0-41a4-b1b5-9040b65f5d30'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB09FED72BC8DC6A02B02"}'::jsonb, NULL, 0, '2026-11-22T07:54:56.237+00:00'::timestamptz, '2026-11-22T07:54:56.237+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('a1ac88cd-5a87-4246-a44f-26336dd97e5a'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB01D229F68080CD191B6"}'::jsonb, NULL, 0, '2026-11-22T07:54:57.136+00:00'::timestamptz, '2026-11-22T07:54:57.136+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('a7c96832-da65-4279-b3c2-c701a739d699'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0788DEF0894F7794085"}'::jsonb, NULL, 0, '2026-11-22T07:55:41.541+00:00'::timestamptz, '2026-11-22T07:55:41.541+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('c539e7f5-38dd-4cda-86dd-2b32f64423ac'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB011FF59299E60E89E01"}'::jsonb, NULL, 0, '2026-11-22T07:55:43.536+00:00'::timestamptz, '2026-11-22T07:55:43.536+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('a9d81847-4b81-4bfa-ae5d-9be44dc57b5a'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB051FBF6C3C296BFBFE7"}'::jsonb, NULL, 0, '2026-11-22T07:55:45.936+00:00'::timestamptz, '2026-11-22T07:55:45.936+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('6ce2b355-5095-41c7-bba9-9e72e52f6b82'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0BF762C3587506E1D02"}'::jsonb, NULL, 0, '2026-11-22T07:55:46.936+00:00'::timestamptz, '2026-11-22T07:55:46.936+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('09ee85de-8fef-4a54-93cb-947796d778a6'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB07CC1381DBE9AFD938C"}'::jsonb, NULL, 0, '2026-11-22T07:55:48.435+00:00'::timestamptz, '2026-11-22T07:55:48.435+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('0eeaad1a-71f2-482e-9cf0-4ba9ca355417'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB008EBB8D5576BBA114D"}'::jsonb, NULL, 0, '2026-11-22T07:56:40.725+00:00'::timestamptz, '2026-11-22T07:56:40.725+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('7f12bfe1-e625-4219-850f-ddee49ff0c67'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0CA01E59267851393CB"}'::jsonb, NULL, 0, '2026-11-22T07:56:40.802+00:00'::timestamptz, '2026-11-22T07:56:40.802+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('131a42ac-c7fe-473e-9c27-3480108b02e7'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0021A601E6093FAF0C4"}'::jsonb, NULL, 0, '2026-11-22T07:56:41.055+00:00'::timestamptz, '2026-11-22T07:56:41.055+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('423e61d0-bcc7-47eb-9c02-b29d5b3b6e01'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'EMAIL', 'PAYMENT_RECEIVED', 'kamleshveg@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<c864e72e-0a44-817c-4bef-94e3ce65816a@gmail.com>"}'::jsonb, NULL, 0, '2026-11-22T08:00:59.796+00:00'::timestamptz, '2026-11-22T08:00:59.796+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('bfd9cb14-98a8-4224-8813-3ea4be126570'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'PAYMENT_RECEIVED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB05C4F141BC831226D36"}'::jsonb, NULL, 0, '2026-11-22T08:01:00.402+00:00'::timestamptz, '2026-11-22T08:01:00.402+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('2e6bf488-61f2-443b-982f-af7f9af83833'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'EMAIL', 'INVOICE_GENERATED', 'kamleshveg@gmail.com', 'SENT', 'BREVO_SMTP_PORT_587', '{"success":true,"provider":"BREVO_SMTP_PORT_587","messageId":"<cbcbed07-d55c-bddb-3be8-dd2c0854040b@gmail.com>"}'::jsonb, NULL, 0, '2026-11-22T08:01:29.812+00:00'::timestamptz, '2026-11-22T08:01:29.812+00:00'::timestamptz) ON CONFLICT DO NOTHING;
INSERT INTO public."notification_logs" ("id", "notification_id", "job_id", "customer_id", "channel", "message_type", "recipient", "status", "provider", "provider_response", "error_message", "retry_count", "sent_at", "created_at") VALUES ('f4fdd54c-6cac-468f-9c6d-62315c9333a9'::uuid, NULL, '5bf65fbc-8d0b-49d4-b0a4-523f51ddbc51'::uuid, '1d48164a-5b80-477c-8ea7-f6975a90fba5'::uuid, 'WHATSAPP', 'INVOICE_GENERATED', '7203802903', 'SENT', 'BAILEYS_LOCAL', '{"success":true,"provider":"BAILEYS_LOCAL","messageId":"3EB0CFD1936FD5FD25EC6D"}'::jsonb, NULL, 0, '2026-11-22T08:01:30.914+00:00'::timestamptz, '2026-11-22T08:01:30.914+00:00'::timestamptz) ON CONFLICT DO NOTHING;

-- Table: public."review_requests" (0 rows on live production)

-- Table: public."vendor_status_history" (0 rows on live production)

-- Table: public."vendor_ledger" (0 rows on live production)

COMMIT;

-- ============================================================================
-- END OF COMPLETE PRODUCTION CLONE (34 tables, 129 rows)
-- ============================================================================
