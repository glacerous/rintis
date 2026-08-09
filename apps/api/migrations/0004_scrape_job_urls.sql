-- Migration 0004: Scrape Job URL Granularity Status for Stage 4 Discovery Pipeline
-- Run this manually in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS scrape_job_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'discovered' CHECK (
        stage IN ('discovered', 'scraping', 'resolving', 'scoring', 'done', 'failed')
    ),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scrape_job_urls_job ON scrape_job_urls(job_id);
