from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List
from app.database import supabase_client
from app.services.overpass_client import fetch_trail_geometry, fetch_trail_waypoints

router = APIRouter(prefix="/trails")

class TrailImportRequest(BaseModel):
    osm_relation_id: int
    slug: str
    name: str
    region: str

@router.post("/import-osm", status_code=201)
async def import_osm_trail(payload: TrailImportRequest):
    """
    Import trail geometry and nearby waypoints from OSM Overpass API.
    Inserts or updates the trail and its waypoints in Supabase.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=500,
            detail="Supabase client is not configured. Please define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env."
        )

    print(f"[Import-OSM] Starting import for relation {payload.osm_relation_id} (slug: {payload.slug})...")

    # 1. Fetch trail LineString geometry
    geometry = fetch_trail_geometry(payload.osm_relation_id)
    if not geometry:
        raise HTTPException(
            status_code=422,
            detail=f"Could not retrieve trail geometry from OpenStreetMap for relation ID {payload.osm_relation_id}."
        )

    # 2. Fetch waypoints around the trail
    waypoints = fetch_trail_waypoints(payload.osm_relation_id)
    print(f"[Import-OSM] Fetched {len(waypoints)} waypoints near the trail relation.")

    try:
        # 3. Upsert the trail into the Supabase database
        trail_data = {
            "slug": payload.slug,
            "name": payload.name,
            "region": payload.region,
            "geometry": geometry
        }
        
        trail_res = supabase_client.table("trails").upsert(trail_data, on_conflict="slug").execute()
        if not trail_res.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to insert or update trail record in Supabase."
            )
            
        trail_id = trail_res.data[0]["id"]
        
        # 4. Remove previous waypoints associated with this trail
        supabase_client.table("waypoints").delete().eq("trail_id", trail_id).execute()

        # 5. Insert new waypoints
        if waypoints:
            waypoint_rows = []
            for wp in waypoints:
                waypoint_rows.append({
                "trail_id": trail_id,
                "name": wp["name"],
                "type": wp["type"],
                "lat": wp["lat"],
                "lng": wp["lng"],
                "elevation_m": wp["elevation_m"],
                "osm_node_id": wp["osm_node_id"],
                "osm_version": wp.get("osm_version"),
                "osm_last_edited": wp.get("osm_last_edited")
            })
            
            # Insert in chunks if there are too many (Supabase might have payload limits)
            # Typically 13 is very small and fits in 1 insert call.
            wp_res = supabase_client.table("waypoints").insert(waypoint_rows).execute()
            print(f"[Import-OSM] Inserted {len(wp_res.data)} waypoints into Supabase.")

        return {
            "status": "success",
            "message": f"Successfully imported '{payload.name}' trail with {len(waypoints)} waypoints.",
            "trail_id": trail_id,
            "waypoint_count": len(waypoints)
        }

    except Exception as e:
        print(f"[Import-OSM] Database operation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Database insertion failed: {str(e)}"
        )

@router.get("/{slug}")
async def get_trail(slug: str):
    """
    Retrieves the trail from Supabase and formats it + its waypoints
    into a GeoJSON FeatureCollection.

    Each waypoint feature now includes a 'condition_reports' property array.
    Top-level 'general_claims' contains reports not tied to any waypoint.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=500,
            detail="Supabase client is not configured. Please define env vars."
        )

    # 1. Fetch trail
    trail_res = supabase_client.table("trails").select("*").eq("slug", slug).execute()
    if not trail_res.data:
        raise HTTPException(
            status_code=404,
            detail=f"Trail with slug '{slug}' not found."
        )

    trail = trail_res.data[0]
    trail_id = trail["id"]

    # 2. Fetch waypoints
    wp_res = supabase_client.table("waypoints").select("*").eq("trail_id", trail_id).execute()
    waypoints = wp_res.data or []

    # 3. Fetch all condition_reports for this trail (one query, split in Python)
    cr_res = (
        supabase_client
        .table("condition_reports")
        .select("waypoint_id, claim_text, claim_type, confidence_score, source_url, source_type, published_or_scraped_at, status")
        .eq("trail_id", trail_id)
        .order("confidence_score", desc=True)
        .execute()
    )
    all_reports = cr_res.data or []

    # Index reports by waypoint_id for quick lookup
    reports_by_waypoint: dict[str, list] = {}
    general_claims: list = []
    for r in all_reports:
        wp_id = r.get("waypoint_id")
        entry = {
            "claim_text": r["claim_text"],
            "claim_type": r["claim_type"],
            "confidence_score": r["confidence_score"],
            "source_url": r["source_url"],
            "source_type": r["source_type"],
            "published_or_scraped_at": r["published_or_scraped_at"],
            "status": r["status"],
        }
        if wp_id:
            reports_by_waypoint.setdefault(wp_id, []).append(entry)
        else:
            general_claims.append(entry)

    # 4. Build GeoJSON FeatureCollection
    features = []

    # Add Route LineString feature
    features.append({
        "type": "Feature",
        "geometry": trail["geometry"],
        "properties": {
            "type": "route",
            "name": trail["name"],
            "slug": trail["slug"],
            "region": trail["region"]
        }
    })

    # Add Waypoint Point features (with embedded condition_reports)
    for wp in waypoints:
        wp_id = wp["id"]
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [wp["lng"], wp["lat"]]
            },
            "properties": {
                "type": "waypoint",
                "waypoint_type": wp["type"],
                "name": wp["name"],
                "elevation_m": wp["elevation_m"],
                "osm_node_id": wp["osm_node_id"],
                "osm_version": wp.get("osm_version"),
                "osm_last_edited": wp.get("osm_last_edited"),
                "condition_reports": reports_by_waypoint.get(wp_id, []),
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "general_claims": general_claims,   # trail-level claims (waypoint_id IS NULL)
    }
