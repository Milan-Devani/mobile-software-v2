-- ============================================================================
-- 20261121_clean_warranty_terms.sql
-- ----------------------------------------------------------------------------
-- The shops.warranty_terms column accidentally accumulated multiple copies of
-- the boilerplate heading "Standard Warranty Policy (Printed on Invoices &
-- Job Sheets)". This migration strips that boilerplate and collapses the
-- leftover blank lines, leaving only the original warranty sentence.
-- Safe & idempotent: only rows that actually contain the boilerplate change.
-- ============================================================================

UPDATE public.shops
SET
  warranty_terms = TRIM(
    BOTH E' \t\n\r' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        COALESCE(warranty_terms, ''),
        'Standard Warranty Policy \(Printed on Invoices & Job Sheets\)',
        '',
        'g'
      ),
      '\n{2,}',
      E'\n',
      'g'
    )
  ),
  updated_at = NOW()
WHERE warranty_terms IS NOT NULL
  AND warranty_terms LIKE '%Standard Warranty Policy%';
