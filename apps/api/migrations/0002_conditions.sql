-- Migration 0002: Condition Reports Pipeline
-- Run this manually in the Supabase SQL Editor.

-- ─────────────────────────────────────────────
-- condition_reports
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS condition_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,

    -- nullable: NULL means the claim covers the whole trail, not one waypoint
    waypoint_id UUID REFERENCES waypoints(id) ON DELETE SET NULL,

    -- The summarised condition claim in Indonesian
    claim_text TEXT NOT NULL,

    claim_type TEXT NOT NULL CHECK (
        claim_type IN ('trail_status', 'hazard', 'water_source', 'weather', 'closure', 'other')
    ),

    confidence_score FLOAT NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),

    source_url TEXT NOT NULL,

    source_type TEXT NOT NULL CHECK (
        source_type IN ('official_govt', 'established_media', 'verified_community', 'individual_post')
    ),

    -- LLM-guessed publish date from article; falls back to scrape time when NULL
    published_or_scraped_at TIMESTAMP WITH TIME ZONE,

    status TEXT NOT NULL DEFAULT 'unverified' CHECK (
        status IN ('unverified', 'confirmed', 'disputed')
    ),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_condition_reports_trail    ON condition_reports(trail_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_waypoint ON condition_reports(waypoint_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_type     ON condition_reports(claim_type);
CREATE INDEX IF NOT EXISTS idx_condition_reports_score    ON condition_reports(confidence_score DESC);

-- ─────────────────────────────────────────────
-- scrape_cache
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL UNIQUE,
    raw_content TEXT NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scrape_cache_url ON scrape_cache(source_url);
