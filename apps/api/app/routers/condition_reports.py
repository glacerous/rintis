from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import supabase_client
from app.services.confidence import compute_confidence
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/condition-reports")

class VerifyRequest(BaseModel):
    vote: str # 'still_accurate' or 'outdated'

@router.post("/{report_id}/verify")
async def verify_condition_report(report_id: str, payload: VerifyRequest):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not configured.")
        
    if payload.vote not in ("still_accurate", "outdated"):
        raise HTTPException(status_code=422, detail="Invalid vote. Must be 'still_accurate' or 'outdated'.")
        
    # 1. Check if report exists
    report_res = supabase_client.table("condition_reports").select("*").eq("id", report_id).execute()
    if not report_res.data:
        raise HTTPException(status_code=404, detail="Condition report not found.")
        
    report = report_res.data[0]
    
    # 2. Insert vote
    try:
        vote_data = {
            "condition_report_id": report_id,
            "vote": payload.vote,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase_client.table("report_verifications").insert(vote_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record verification vote: {str(e)}")
        
    # 3. Recalculate confidence score
    try:
        published_at_str = report.get("published_or_scraped_at")
        published_at = None
        if published_at_str:
            published_at = datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))
            
        new_score = compute_confidence(
            source_type=report["source_type"],
            published_or_scraped_at=published_at,
            claim_type=report["claim_type"],
            waypoint_id=report.get("waypoint_id"),
            trail_id=report["trail_id"],
            current_source_url=report["source_url"],
            condition_report_id=report_id
        )
        
        # Update in database
        supabase_client.table("condition_reports").update({"confidence_score": new_score}).eq("id", report_id).execute()
        
    except Exception as e:
        # Log error but don't fail the request since vote was successfully recorded
        print(f"[Verify] Failed to update confidence score for report {report_id}: {e}")
        new_score = report["confidence_score"]
        
    return {
        "status": "success",
        "message": "Verification vote recorded successfully.",
        "new_confidence_score": new_score
    }
