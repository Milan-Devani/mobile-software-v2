-- Migration: 003_add_serial_and_imei_to_parts.sql
-- Description: Adds serial_number and imei columns to parts table for device and inventory tracking

-- 1. Safely add serial_number and imei columns if they don't already exist
ALTER TABLE IF EXISTS public.parts
ADD COLUMN IF NOT EXISTS serial_number TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS imei TEXT DEFAULT '';

-- 2. Populate existing parts with empty string if NULL
UPDATE public.parts
SET serial_number = ''
WHERE serial_number IS NULL;

UPDATE public.parts
SET imei = ''
WHERE imei IS NULL;
