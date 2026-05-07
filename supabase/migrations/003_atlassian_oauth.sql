-- ============================================================
-- Migration 003: Add Atlassian OAuth fields, remove Basic Auth fields
-- ============================================================

-- Add OAuth columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atlassian_access_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atlassian_refresh_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atlassian_token_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atlassian_cloud_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atlassian_site_url text;

-- Remove old Basic Auth columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS jira_base_url;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS jira_email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS jira_api_token;
