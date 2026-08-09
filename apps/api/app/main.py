from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import trails

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

@app.get("/")
async def root():
    return {
        "name": "Rintis API",
        "version": "1.0.0",
        "status": "online"
    }
