-- Migration 0005: Add resolved_at column to scrape_cache for resolver idempotency.
-- Run this manually in the Supabase SQL Editor.

ALTER TABLE scrape_cache
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
