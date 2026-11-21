-- ============================================================================
-- ISOLATED BACKUP & SYSTEM STORAGE MIGRATION
-- Purpose: Setup ONLY tables required for Backups, Assets, and System Settings.
-- Safe: 100% idempotent. Does NOT touch users, customers, jobs, or vendor data.
-- ============================================================================

-- 1. BACKUP LOGS TABLE (Tracks manual/automated backups, Drive 1 & Drive 2 sync)
CREATE TABLE IF NOT EXISTS public.backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    status VARCHAR(30) NOT NULL DEFAULT 'RUNNING',
    filename VARCHAR(255) NOT NULL,
    drive_file_id VARCHAR(255),
    drive_folder_id VARCHAR(255),
    drive_file_id_2 VARCHAR(255),
    drive_folder_id_2 VARCHAR(255),
    file_size_bytes BIGINT,
    checksum_md5 VARCHAR(100),
    duration_ms INT,
    error_message TEXT,
    created_by_user_id UUID,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Safely add any missing columns if backup_logs was created in an older version
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS backup_type VARCHAR(20) DEFAULT 'MANUAL';
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'RUNNING';
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(255);
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(255);
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS drive_file_id_2 VARCHAR(255);
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS drive_folder_id_2 VARCHAR(255);
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS checksum_md5 VARCHAR(100);
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.backup_logs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Performance indexes for backup dashboard
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON public.backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at ON public.backup_logs(started_at DESC);


-- 2. EMBEDDED MEDIA ASSETS TABLE (Stores shop logos, dark/light icons, QR codes)
CREATE TABLE IF NOT EXISTS public._app_backup_assets (
    file_name TEXT PRIMARY KEY,
    mime_type TEXT,
    asset_type TEXT,
    public_url TEXT,
    size_bytes BIGINT,
    data_base64 TEXT,
    created_at TEXT
);


-- 3. SYSTEM SETTINGS TABLE (Stores backup intervals, retention, and configs)
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely remove any deprecated encryption keys from settings table
DELETE FROM public.settings 
WHERE key IN (
    'backup_encryption_key', 
    'backup_encryption_keys', 
    'backup_developer_key', 
    'backup_shopkeeper_key'
);


-- 4. ROW LEVEL SECURITY (RLS) FOR BACKUP & STORAGE ONLY
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._app_backup_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    CREATE POLICY "Allow all on backup_logs" 
    ON public.backup_logs FOR ALL USING (true) WITH CHECK (true); 
EXCEPTION 
    WHEN duplicate_object THEN NULL; 
END $$;

DO $$ 
BEGIN 
    CREATE POLICY "Allow all on app_backup_assets" 
    ON public._app_backup_assets FOR ALL USING (true) WITH CHECK (true); 
EXCEPTION 
    WHEN duplicate_object THEN NULL; 
END $$;

DO $$ 
BEGIN 
    CREATE POLICY "Allow all on settings" 
    ON public.settings FOR ALL USING (true) WITH CHECK (true); 
EXCEPTION 
    WHEN duplicate_object THEN NULL; 
END $$;


-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
