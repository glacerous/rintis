# Trigger reload to parse env
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import trails, conditions, condition_reports, sessions
from app.database import supabase_client

app = FastAPI(
    title="Rintis API",
    description="Decision-support layer for hiking in Indonesia",
    version="1.0.0"
)

# Configure CORS so our Next.js frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(trails.router, prefix="/api", tags=["Trails"])
app.include_router(conditions.router, prefix="/api", tags=["Conditions"])
app.include_router(condition_reports.router, prefix="/api", tags=["Condition Reports"])
app.include_router(sessions.router, prefix="/api", tags=["Hike Sessions"])

# Dead-man's Switch Background Check loop
async def dead_mans_switch_check():
    while True:
        await asyncio.sleep(60) # run every 60 seconds
        if not supabase_client:
            continue
        try:
            now = datetime.now(timezone.utc)
            # Find active sessions
            res = (
                supabase_client
                .table("hike_sessions")
                .select("id, hiker_name, emergency_contact_email, estimated_return_at, buffer_minutes, notified_at")
                .eq("status", "active")
                .is_("notified_at", "null")
                .execute()
            )
            active_sessions = res.data or []
            
            for s in active_sessions:
                est_str = s["estimated_return_at"]
                # Parse return time (handle Z or offset formats)
                est = datetime.fromisoformat(est_str.replace("Z", "+00:00"))
                buffer = s.get("buffer_minutes", 60)
                
                # Check if elapsed return time + buffer has passed
                overdue_time = est + timedelta(minutes=buffer)
                if now > overdue_time:
                    h_name = s["hiker_name"]
                    c_email = s["emergency_contact_email"]
                    
                    # Prominently print Dead-man's Switch alert to logs
                    print(f"\n==========================================")
                    print(f"!!! DEAD-MAN'S SWITCH WARNING! !!!")
                    print(f"Hiker '{h_name}' is OVERDUE!")
                    print(f"Estimated Return: {est_str} (+{buffer}m buffer)")
                    print(f"Sending Emergency Notification to: {c_email}")
                    print(f"Email Dispatch Simulated OK.")
                    print(f"==========================================\n")
                    
                    # Update status in db
                    supabase_client.table("hike_sessions").update({
                        "status": "overdue",
                        "notified_at": now.isoformat()
                    }).eq("id", s["id"]).execute()
        except Exception as e:
            print(f"[Dead-man's Switch] Error in check loop: {e}")

@app.on_event("startup")
async def startup_event():
    # Start the background checking thread daemon
    asyncio.create_task(dead_mans_switch_check())

@app.get("/")
async def root():
    return {
        "name": "Rintis API",
        "version": "1.0.0",
        "status": "online"
    }
