-- Migration: 001_create_google_review_tables.sql
-- Description: Creates review_settings and review_requests for AI-Powered Google Review Assistant

-- 1. Create review_settings table
CREATE TABLE IF NOT EXISTS public.review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  google_review_url TEXT DEFAULT 'https://g.page/r/CROHWMY3TX9dEBM/review',
  review_dialog_url TEXT DEFAULT 'https://g.page/r/CROHWMY3TX9dEBM/review',
  is_enabled BOOLEAN DEFAULT true,
  invitation_channel VARCHAR(20) DEFAULT 'WHATSAPP',
  invitation_message TEXT DEFAULT 'Thank you for choosing {shop_name}! We hope your repair experience was good. We would appreciate your honest feedback. Please share your experience here: {review_link}',
  ai_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create review_requests table
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

-- 3. Indexes for fast lookups and token security
CREATE INDEX IF NOT EXISTS idx_review_requests_token_hash ON public.review_requests(unique_token_hash);
CREATE INDEX IF NOT EXISTS idx_review_requests_token ON public.review_requests(unique_token);
CREATE INDEX IF NOT EXISTS idx_review_requests_job ON public.review_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON public.review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON public.review_requests(invitation_status);

-- 4. Enable RLS and add public read/update policies if RLS is enabled
ALTER TABLE IF EXISTS public.review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'review_settings' AND policyname = 'Allow service role full access on review_settings'
  ) THEN
    CREATE POLICY "Allow service role full access on review_settings" ON public.review_settings FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'review_requests' AND policyname = 'Allow service role full access on review_requests'
  ) THEN
    CREATE POLICY "Allow service role full access on review_requests" ON public.review_requests FOR ALL USING (true);
  END IF;
END $$;