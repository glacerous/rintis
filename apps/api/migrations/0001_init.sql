-- Create waypoint type check constraint (using CHECK constraint on text to keep it simple and easy to maintain)
-- The allowed types are: 'pos', 'camp', 'water_source', 'peak', 'trailhead'

-- Create trails table
CREATE TABLE IF NOT EXISTS trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    geometry JSONB NOT NULL, -- Stores the GeoJSON LineString geometry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create waypoints table
CREATE TABLE IF NOT EXISTS waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pos', 'camp', 'water_source', 'peak', 'trailhead')),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    elevation_m DOUBLE PRECISION,
    osm_node_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trails_slug ON trails(slug);
CREATE INDEX IF NOT EXISTS idx_waypoints_trail_id ON waypoints(trail_id);
CREATE INDEX IF NOT EXISTS idx_waypoints_type ON waypoints(type);
