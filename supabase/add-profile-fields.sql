-- Run this in Supabase SQL Editor to add professional context fields
-- This adds Apollo enrichment data and personalization preferences

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personalization_opt_out boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
