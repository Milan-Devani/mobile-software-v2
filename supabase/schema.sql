-- ============================================================================
-- MOBILE REPAIR MANAGEMENT SYSTEM - PRODUCTION POSTGRESQL / SUPABASE SCHEMA
-- ============================================================================

-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SHOPS (Single-shop setup with expansion support)
CREATE TABLE IF NOT EXISTS shops (
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

-- 2. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (id, name, description) VALUES
('admin', 'Admin / Shop Owner', 'Full administrative access to shop management, financials, parts, and user accounts'),
('technician', 'Technician', 'Diagnose devices, request parts, execute repairs, and complete quality testing'),
('staff', 'Shop Staff / Receptionist', 'Customer check-in, create job sheets, process payments, and manage pickups')
ON CONFLICT (id) DO NOTHING;

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
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

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);

-- 5. DEVICES
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_devices_imei ON devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);

-- 6. REPAIR JOBS
CREATE TABLE IF NOT EXISTS repair_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. mobo-2026-0001
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',
    -- Enum values: RECEIVED, DIAGNOSING, ESTIMATE_SENT, AWAITING_APPROVAL, APPROVED, REJECTED, IN_PROGRESS, TESTING, READY_FOR_PICKUP, DELIVERED, CANCELLED
    
    priority VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    service_type VARCHAR(50) DEFAULT 'Pending',
    customer_complaint TEXT NOT NULL,
    
    -- Condition checklist JSON
    device_condition JSONB DEFAULT '{
        "screen": "INTACT",
        "body": "GOOD",
        "camera_glass": "INTACT",
        "charging_port": "FUNCTIONAL",
        "speaker": "FUNCTIONAL",
        "microphone": "FUNCTIONAL",
        "buttons": "FUNCTIONAL",
        "water_damage": false,
        "scratches": "MINOR",
        "cracks": "NONE",
        "notes": ""
    }'::jsonb,
    
    -- Accessories received array JSON
    accessories_received JSONB DEFAULT '[]'::jsonb,
    
    -- Financial summary cached
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'amount',
    discount_value NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 8.25,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    balance_due NUMERIC(12, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID
    
    -- Warranty Claim & Reopen tracking
    is_warranty_claim BOOLEAN DEFAULT FALSE,
    reopen_count INT DEFAULT 0,
    warranty_same_issue BOOLEAN DEFAULT FALSE,
    reopened_at TIMESTAMPTZ,
    reopened_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    warranty_claim_type VARCHAR(50),
    warranty_free_rework BOOLEAN DEFAULT FALSE,
    last_warranty_issue TEXT,
    reopen_notes TEXT,
    previous_delivered_at TIMESTAMPTZ,
    approval_notes TEXT,
    previous_total_amount NUMERIC(12, 2) DEFAULT 0.00,
    previous_balance_due NUMERIC(12, 2) DEFAULT 0.00,

    -- Customer Pickup & Acceptance
    customer_tested_device BOOLEAN DEFAULT FALSE,
    customer_acceptance_confirmed BOOLEAN DEFAULT FALSE,
    customer_signature TEXT,
    delivery_notes TEXT,
    delivered_at TIMESTAMPTZ,
    delivered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Public token for customer online approval link
    approval_token VARCHAR(100) UNIQUE,
    approval_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approval_decision_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    warranty_days INT DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_job_number ON repair_jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_status ON repair_jobs(status);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_customer_id ON repair_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_technician_id ON repair_jobs(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_created_at ON repair_jobs(created_at);

-- 7. JOB STATUS HISTORY (Audit Trail / Timeline)
CREATE TABLE IF NOT EXISTS job_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    action_title VARCHAR(150) NOT NULL,
    notes TEXT,
    performed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON job_status_history(job_id);

-- 8. DIAGNOSES
CREATE TABLE IF NOT EXISTS diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
    diagnosed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_issue TEXT NOT NULL,
    technician_findings TEXT NOT NULL,
    root_cause TEXT,
    recommended_solution TEXT NOT NULL,
    internal_technician_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PARTS CATALOG & INVENTORY
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    part_code VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    part_number VARCHAR(100),
    brand VARCHAR(100),
    category VARCHAR(100) DEFAULT 'Display', -- Display, Battery, Charging Port, Camera, Speaker, Motherboard, etc.
    compatible_models TEXT,
    purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 3,
    supplier VARCHAR(150),
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, OUT_OF_STOCK, DISCONTINUED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(name);

-- 10. PART STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS part_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    job_id UUID REFERENCES repair_jobs(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL, -- PURCHASE, JOB_USAGE, RETURN, ADJUSTMENT
    quantity INT NOT NULL, -- Positive for addition, negative for deduction
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. REPAIR ESTIMATES
CREATE TABLE IF NOT EXISTS repair_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
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
    status VARCHAR(50) DEFAULT 'SENT', -- DRAFT, SENT, APPROVED, REJECTED
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. REPAIR ESTIMATE ITEMS
CREATE TABLE IF NOT EXISTS repair_estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES repair_estimates(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    warranty VARCHAR(100) DEFAULT '90 Days',
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. REPAIR JOB PARTS (Installed parts during actual repair)
CREATE TABLE IF NOT EXISTS repair_job_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id) ON DELETE SET NULL,
    part_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    installed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. REPAIR JOB LABOR
CREATE TABLE IF NOT EXISTS repair_job_labor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    labor_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hours_or_units NUMERIC(6, 2) DEFAULT 1.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. REPAIR TESTS (Quality Checklist)
CREATE TABLE IF NOT EXISTS repair_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
    test_key VARCHAR(100) NOT NULL, -- e.g. power_on, display, touch, camera_front, speaker, etc.
    test_label VARCHAR(150) NOT NULL,
    result VARCHAR(30) NOT NULL DEFAULT 'NOT_TESTED', -- PASS, FAIL, NOT_TESTED
    notes TEXT,
    tested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH', -- CASH, CARD, UPI, BANK_TRANSFER, OTHER
    payment_status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, PENDING, FAILED, REFUNDED
    transaction_reference VARCHAR(150),
    received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);

-- 17. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. INV-2026-000001
    job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    
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
    
    payment_status VARCHAR(50) DEFAULT 'PAID', -- PAID, PARTIAL, UNPAID
    warranty_period VARCHAR(100) DEFAULT '90 Days Limited Hardware Warranty',
    notes TEXT,
    pdf_url TEXT,
    
    issued_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- 18. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- PART, LABOR, SERVICE, FEE
    item_name VARCHAR(200) NOT NULL,
    warranty VARCHAR(100) DEFAULT '90 Days',
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. ATTACHMENTS (Supabase Storage references)
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES repair_jobs(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL, -- DEVICE_CHECKIN_PHOTO, DIAGNOSIS_PHOTO, REPAIR_PHOTO, PDF_JOBSHEET, PDF_INVOICE
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_job_id ON attachments(job_id);

-- 20. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES repair_jobs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    notification_type VARCHAR(80) NOT NULL,
    -- JOB_CREATED, DIAGNOSIS_COMPLETED, ESTIMATE_SENT, ESTIMATE_APPROVED, ESTIMATE_REJECTED, REPAIR_STARTED, REPAIR_COMPLETED, READY_FOR_PICKUP, PAYMENT_RECEIVED, INVOICE_GENERATED
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    job_id UUID REFERENCES repair_jobs(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    channel VARCHAR(30) NOT NULL, -- EMAIL, SMS, WHATSAPP
    message_type VARCHAR(80) NOT NULL,
    recipient VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    provider VARCHAR(50), -- BREVO, MSG91, OPENWA
    provider_response JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_job_id ON notification_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- 22. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. BACKUP LOGS
CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL', -- MANUAL, SCHEDULED
    status VARCHAR(30) NOT NULL DEFAULT 'RUNNING',     -- QUEUED, RUNNING, COMPLETED, FAILED
    filename VARCHAR(255),
    drive_file_id VARCHAR(255),
    drive_folder_id VARCHAR(255),
    file_size_bytes BIGINT,
    checksum_md5 VARCHAR(64),
    duration_ms INT,
    error_message TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at ON backup_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);

