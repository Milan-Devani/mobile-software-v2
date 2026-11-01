-- Migration: Add warranty rework reason and warranty history audit tracking
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_rework_reason TEXT;
ALTER TABLE public.repair_jobs ADD COLUMN IF NOT EXISTS warranty_history JSONB DEFAULT '[]'::jsonb;

