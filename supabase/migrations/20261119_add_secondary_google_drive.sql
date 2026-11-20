-- ============================================================================
-- Migration: Add Secondary Google Drive Support to Backup Logs
-- Date: 2026-11-19
-- ============================================================================

ALTER TABLE public.backup_logs 
ADD COLUMN IF NOT EXISTS drive_file_id_2 VARCHAR(255);

ALTER TABLE public.backup_logs 
ADD COLUMN IF NOT EXISTS drive_folder_id_2 VARCHAR(255);

COMMENT ON COLUMN public.backup_logs.drive_file_id_2 IS 'Google Drive File ID for secondary backup account';
COMMENT ON COLUMN public.backup_logs.drive_folder_id_2 IS 'Google Drive Folder ID for secondary backup account';
