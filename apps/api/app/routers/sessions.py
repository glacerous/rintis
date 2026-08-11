from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import supabase_client
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/trails")

class SessionStartRequest(BaseModel):
    device_id: str
    hiker_name: str
    emergency_contact_email: str
    estimated_return_at: str # ISO timestamp
    buffer_minutes: Optional[int] = 60

class CheckinRequest(BaseModel):
    device_id: str
    waypoint_id: str
    timestamp: str # ISO timestamp
    lat: float
    lng: float

class SosRequest(BaseModel):
    device_id: str
    lat: float
    lng: float

@router.post("/{slug}/sessions")
async def start_hike_session(slug: str, payload: SessionStartRequest):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not configured.")

    # Find trail
    trail_res = supabase_client.table("trails").select("id").eq("slug", slug).execute()
    if not trail_res.data:
        raise HTTPException(status_code=404, detail="Trail not found.")
    trail_id = trail_res.data[0]["id"]

    # Deactivate any previous active sessions for this device
    try:
        supabase_client.table("hike_sessions").update({"status": "abandoned"}).eq("device_id", payload.device_id).eq("status", "active").execute()
    except Exception as e:
        print(f"[Sessions] Warning: Failed to deactivate old sessions: {e}")

    try:
        session_data = {
            "trail_id": trail_id,
            "device_id": payload.device_id,
            "hiker_name": payload.hiker_name,
            "emergency_contact_email": payload.emergency_contact_email,
            "estimated_return_at": payload.estimated_return_at,
            "buffer_minutes": payload.buffer_minutes,
            "status": "active"
        }
        res = supabase_client.table("hike_sessions").insert(session_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create session.")
        return {
            "status": "success",
            "message": "Hiking session started successfully.",
            "session": res.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/{slug}/sessions/complete")
async def complete_hike_session(slug: str, payload: dict):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not configured.")

    device_id = payload.get("device_id")
    if not device_id:
        raise HTTPException(status_code=422, detail="Missing device_id in request payload.")

    try:
        res = (
            supabase_client
            .table("hike_sessions")
            .update({"status": "completed"})
            .eq("device_id", device_id)
            .eq("status", "active")
            .execute()
        )
        return {
            "status": "success",
            "message": f"Successfully completed hiking session for device {device_id}.",
            "updated_count": len(res.data) if res.data else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/{slug}/checkin")
async def register_hiker_checkin(slug: str, payload: CheckinRequest):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not configured.")

    # Find trail
    trail_res = supabase_client.table("trails").select("id").eq("slug", slug).execute()
    if not trail_res.data:
        raise HTTPException(status_code=404, detail="Trail not found.")
    trail_id = trail_res.data[0]["id"]

    # Check for active session
    session_res = (
        supabase_client
        .table("hike_sessions")
        .select("id")
        .eq("device_id", payload.device_id)
        .eq("status", "active")
        .execute()
    )
    session_id = session_res.data[0]["id"] if session_res.data else None

    try:
        checkin_data = {
            "session_id": session_id,
            "trail_id": trail_id,
            "waypoint_id": payload.waypoint_id,
            "device_id": payload.device_id,
            "latitude": payload.lat,
            "longitude": payload.lng,
            "checked_in_at": payload.timestamp
        }
        res = supabase_client.table("hiker_checkins").insert(checkin_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to insert check-in record.")
            
        print(f"[Check-in] Recorded successfully for device {payload.device_id} at waypoint {payload.waypoint_id}")
        return {
            "status": "success",
            "message": "Check-in recorded successfully.",
            "checkin": res.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/{slug}/sos")
async def trigger_sos_alert(slug: str, payload: SosRequest):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not configured.")

    try:
        sos_data = {
            "device_id": payload.device_id,
            "latitude": payload.lat,
            "longitude": payload.lng
        }
        res = supabase_client.table("hike_alerts").insert(sos_data).execute()
        
        # Log SOS warning prominently to server logs
        print(f"\n==========================================")
        print(f"!!! EMERGENCY SOS TRIGGERED! !!!")
        print(f"Device ID: {payload.device_id}")
        print(f"Location: Lat {payload.lat}, Lng {payload.lng}")
        print(f"Time: {datetime.now(timezone.utc).isoformat()}")
        print(f"==========================================\n")
        
        return {
            "status": "success",
            "message": "SOS emergency trigger recorded successfully.",
            "alert": res.data[0] if res.data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
