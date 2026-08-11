-- Migration 0006: Report Verifications
-- Run this manually in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS report_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_report_id UUID NOT NULL REFERENCES condition_reports(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('still_accurate', 'outdated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_verifications_report ON report_verifications(condition_report_id);
