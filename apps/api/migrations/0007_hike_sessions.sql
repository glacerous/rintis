-- Migration 0007: Hike Sessions, Checkins & Alerts
-- Run this manually in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS hike_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    hiker_name TEXT NOT NULL,
    emergency_contact_email TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    estimated_return_at TIMESTAMP WITH TIME ZONE NOT NULL,
    buffer_minutes INT NOT NULL DEFAULT 60,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'overdue', 'abandoned')) DEFAULT 'active',
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS hiker_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES hike_sessions(id) ON DELETE CASCADE,
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    waypoint_id UUID NOT NULL REFERENCES waypoints(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS hike_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hike_sessions_device ON hike_sessions(device_id, status);
CREATE INDEX IF NOT EXISTS idx_hiker_checkins_session ON hiker_checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_hiker_checkins_waypoint ON hiker_checkins(waypoint_id);
