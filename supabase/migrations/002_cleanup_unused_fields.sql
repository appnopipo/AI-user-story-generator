-- ============================================================
-- Migration 002: Remove unused fields from generated_stories
--
-- The review workflow and dry-run feature have been removed.
-- These columns are no longer used by the application.
-- ============================================================

-- Drop review columns
ALTER TABLE public.generated_stories DROP COLUMN IF EXISTS review_status;
ALTER TABLE public.generated_stories DROP COLUMN IF EXISTS reviewer_id;
ALTER TABLE public.generated_stories DROP COLUMN IF EXISTS review_comment;
ALTER TABLE public.generated_stories DROP COLUMN IF EXISTS reviewed_at;

-- Drop dry-run column
ALTER TABLE public.generated_stories DROP COLUMN IF EXISTS jira_dry_run_payload;

-- Update jira_sync_status check constraint to remove 'dry_run' option
ALTER TABLE public.generated_stories DROP CONSTRAINT IF EXISTS generated_stories_jira_sync_status_check;
ALTER TABLE public.generated_stories ADD CONSTRAINT generated_stories_jira_sync_status_check
  CHECK (jira_sync_status IN ('not_synced', 'synced', 'error'));
