-- Run this in Supabase SQL Editor
-- Adds referral tracking and email format tracking

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_email_format text;
