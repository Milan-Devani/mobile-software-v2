-- Migration: 002_add_warranty_to_parts.sql
-- Description: Adds warranty column to parts table for replacement components & inventory items

-- 1. Safely add warranty column to parts table if it does not already exist
ALTER TABLE IF EXISTS public.parts
ADD COLUMN IF NOT EXISTS warranty TEXT DEFAULT '90 Days';

-- 2. Populate existing parts with default warranty if NULL
UPDATE public.parts
SET warranty = '90 Days'
WHERE warranty IS NULL OR warranty = '';
