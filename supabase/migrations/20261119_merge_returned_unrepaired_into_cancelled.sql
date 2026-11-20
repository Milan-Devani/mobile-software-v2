-- Migration: Merge legacy RETURNED_UNREPAIRED status into CANCELLED
-- The "Returned Unrepaired" status was consolidated into the renamed
-- "Not Repaired" (CANCELLED) status. Existing jobs are migrated so no data breaks.
UPDATE repair_jobs SET status = 'CANCELLED' WHERE status = 'RETURNED_UNREPAIRED';
