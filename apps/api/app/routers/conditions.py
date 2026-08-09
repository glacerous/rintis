"""
Conditions router — Stage 2 & 3 pipeline endpoints.

POST /api/trails/{slug}/condition-sources
  Body : { "urls": ["https://...", ...], "source_type": "...", "force_refresh": false }
  Runs : scrape → resolve → match → score → persist for each URL.
  Returns: summary of what was saved.

POST /api/trails/{slug}/discover-and-scrape
  Triggers a background discovery job using TinyFish.
  Returns: { "job_id": "...", "status": "pending" } immediately.

GET /api/trails/{slug}/scrape-jobs/{job_id}
  Returns current status of a discovery job for frontend polling.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.database import supabase_client
from app.services.firecrawl_client import scrape_url
from app.services.resolver import resolve_claims
from app.services.matcher import match_waypoint
from app.services.confidence import compute_confidence

router = APIRouter(prefix="/trails")


# ── Request models ────────────────────────────────────────────────────────────

class ConditionSourcesRequest(BaseModel):
    urls: list[str]
    # Source type applies to all URLs in this batch — caller knows the domain provenance.
    source_type: str = "individual_post"
    force_refresh: bool = False


# ── Domain → source_type inference ───────────────────────────────────────────

_OFFICIAL_GOVT_DOMAINS = ["tngunungmerbabu.org", "go.id"]
_ESTABLISHED_MEDIA_DOMAINS = [
    "detik.com", "kompas.com", "tempo.co", "idntimes.com", "kumparan.com",
    "tribunnews.com", "liputan6.com", "merdeka.com", "cnnindonesia.com", "antaranews.com",
]
_VERIFIED_COMMUNITY_DOMAINS = [
    "kaskus.co.id", "backpackerindonesia.com", "mounture.com",
]


def infer_source_type(url: str) -> str:
    """Infer the source_type for auto-discovered URLs based on their domain."""
    try:
        netloc = urlparse(url).netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        for d in _OFFICIAL_GOVT_DOMAINS:
            if netloc == d or netloc.endswith("." + d):
                return "official_govt"
        for d in _ESTABLISHED_MEDIA_DOMAINS:
            if netloc == d or netloc.endswith("." + d):
                return "established_media"
        for d in _VERIFIED_COMMUNITY_DOMAINS:
            if netloc == d or netloc.endswith("." + d):
                return "verified_community"
    except Exception:
        pass
    return "individual_post"


# ── Core pipeline: single URL ─────────────────────────────────────────────────

def process_single_url(
    url: str,
    source_type: str,
    trail_id: str,
    force_refresh: bool = False,
) -> dict:
    """
    Run the full pipeline for one URL:
      scrape → LLM resolve → waypoint match → confidence score → DB persist.

    Returns a result dict: { url, claims_saved, error, model_used }.
    Raises NO exceptions — all errors are captured in the result dict.
    """
    result: dict = {"url": url, "claims_saved": 0, "error": None, "model_used": None}

    # 1. Scrape (cache-first)
    try:
        raw_text = scrape_url(url, force_refresh=force_refresh)
    except Exception as exc:
        result["error"] = f"Scrape failed: {exc}"
        return result

    if not raw_text:
        result["error"] = "Scrape returned empty content."
        return result

    # 2. LLM extraction
    try:
        resolved = resolve_claims(raw_text, url)
    except Exception as exc:
        result["error"] = f"LLM resolution failed: {exc}"
        return result

    claims = resolved["claims"]
    result["model_used"] = resolved["model_used"]
    if resolved.get("fallback_reason"):
        result["fallback_reason"] = resolved["fallback_reason"]

    if not claims:
        result["error"] = "LLM found no hiking condition claims in this content."
        return result

    # 3. Match + score + persist each claim
    rows_to_insert = []
    for claim in claims:
        claim_text: str = claim.get("claim_text", "").strip()
        claim_type: str = claim.get("claim_type", "other")
        wp_guess: Optional[str] = claim.get("waypoint_name_guess")
        date_guess: Optional[str] = claim.get("published_date_guess")

        if not claim_text:
            continue

        waypoint_id = match_waypoint(wp_guess, trail_id) if wp_guess else None

        published_at: Optional[datetime] = None
        if date_guess:
            try:
                published_at = datetime.fromisoformat(date_guess.replace("Z", "+00:00"))
            except ValueError:
                pass
        if published_at is None:
            published_at = datetime.now(timezone.utc)

        score = compute_confidence(
            source_type=source_type,
            published_or_scraped_at=published_at,
            claim_type=claim_type,
            waypoint_id=waypoint_id,
            trail_id=trail_id,
            current_source_url=url,
        )

        rows_to_insert.append({
            "trail_id": trail_id,
            "waypoint_id": waypoint_id,
            "claim_text": claim_text[:500],
            "claim_type": claim_type,
            "confidence_score": score,
            "source_url": url,
            "source_type": source_type,
            "published_or_scraped_at": published_at.isoformat(),
            "status": "unverified",
        })

    if rows_to_insert:
        try:
            ins_res = (
                supabase_client
                .table("condition_reports")
                .insert(rows_to_insert)
                .execute()
            )
            result["claims_saved"] = len(ins_res.data)
        except Exception as exc:
            result["error"] = f"DB insert failed: {exc}"

    return result


# ── Background discovery runner ───────────────────────────────────────────────

def _run_discovery_job(job_id: str, trail_id: str, trail_name: str, region: str):
    """
    Background task executed by FastAPI BackgroundTasks:
      1. Import TinyFish client & discover URLs.
      2. For each URL: check cache freshness → run pipeline → update counters.
      3. Set job status to 'done' (or 'failed' if discovery itself fails).
    """
    from app.services.tinyfish_client import discover_sources

    now_utc = datetime.now(timezone.utc)

    def _update_job(**kwargs):
        """Helper to patch scrape_jobs row."""
        try:
            supabase_client.table("scrape_jobs").update(kwargs).eq("id", job_id).execute()
        except Exception as e:
            print(f"[Job {job_id}] Failed to update job status: {e}")

    # Mark as running
    _update_job(status="running", started_at=now_utc.isoformat())
    print(f"[Job {job_id}] Starting discovery for trail '{trail_name}'...")

    # Step 1: Discover URLs via TinyFish
    try:
        candidate_urls = discover_sources(trail_name=trail_name, region=region)
    except Exception as exc:
        print(f"[Job {job_id}] TinyFish discovery failed: {exc}")
        _update_job(
            status="failed",
            finished_at=datetime.now(timezone.utc).isoformat(),
            error_message=f"Discovery failed: {exc}",
        )
        return

    # Cap at 10 URLs per job run
    candidate_urls = candidate_urls[:10]
    discovered_count = len(candidate_urls)
    print(f"[Job {job_id}] Discovered {discovered_count} candidate URLs.")
    _update_job(discovered_count=discovered_count)

    if not candidate_urls:
        _update_job(
            status="done",
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
        return

    # Step 2: Process each URL
    processed = 0
    failed = 0
    freshness_threshold = now_utc - timedelta(hours=24)

    for url in candidate_urls:
        # Check scrape_cache — skip if scraped within 24h (save API credits)
        try:
            cache_res = (
                supabase_client
                .table("scrape_cache")
                .select("scraped_at")
                .eq("source_url", url)
                .execute()
            )
            if cache_res.data:
                scraped_at_str = cache_res.data[0].get("scraped_at")
                if scraped_at_str:
                    scraped_at = datetime.fromisoformat(scraped_at_str.replace("Z", "+00:00"))
                    if scraped_at > freshness_threshold:
                        print(f"[Job {job_id}] SKIP (fresh cache): {url}")
                        processed += 1
                        _update_job(processed_count=processed)
                        continue
        except Exception:
            pass  # If cache check fails, proceed to scrape

        source_type = infer_source_type(url)
        print(f"[Job {job_id}] Processing ({processed+1}/{discovered_count}): {url} [{source_type}]")

        url_result = process_single_url(
            url=url,
            source_type=source_type,
            trail_id=trail_id,
            force_refresh=False,
        )

        if url_result["error"]:
            print(f"[Job {job_id}] FAILED: {url} — {url_result['error']}")
            failed += 1
        else:
            print(f"[Job {job_id}] OK: {url} — {url_result['claims_saved']} claims saved.")
            processed += 1

        _update_job(processed_count=processed, failed_count=failed)

    # Step 3: Mark done
    _update_job(
        status="done",
        finished_at=datetime.now(timezone.utc).isoformat(),
        processed_count=processed,
        failed_count=failed,
    )
    print(f"[Job {job_id}] Finished. processed={processed}, failed={failed}.")


# ── Route handlers ────────────────────────────────────────────────────────────

@router.post("/{slug}/condition-sources")
async def add_condition_sources(slug: str, payload: ConditionSourcesRequest):
    """
    Scrape the provided URLs, extract hiking condition claims via LLM,
    match each claim to a waypoint, compute confidence, and persist
    condition_reports to Supabase.

    source_type options: official_govt | established_media | verified_community | individual_post
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not configured.")

    trail_res = (
        supabase_client.table("trails").select("id, name").eq("slug", slug).execute()
    )
    if not trail_res.data:
        raise HTTPException(status_code=404, detail=f"Trail '{slug}' not found.")

    trail = trail_res.data[0]
    trail_id: str = trail["id"]

    valid_source_types = {
        "official_govt", "established_media", "verified_community", "individual_post"
    }
    if payload.source_type not in valid_source_types:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid source_type. Must be one of: {sorted(valid_source_types)}"
        )

    results_per_url = []
    total_claims_saved = 0
    total_scores: list[float] = []

    for url in payload.urls:
        result = process_single_url(
            url=url,
            source_type=payload.source_type,
            trail_id=trail_id,
            force_refresh=payload.force_refresh,
        )
        total_claims_saved += result["claims_saved"]
        results_per_url.append(result)

    avg_confidence = (
        round(sum(total_scores) / len(total_scores), 4) if total_scores else None
    )

    return {
        "status": "ok",
        "trail": trail["name"],
        "processed_urls": len(payload.urls),
        "total_claims_saved": total_claims_saved,
        "avg_confidence": avg_confidence,
        "per_url": results_per_url,
    }


@router.post("/{slug}/discover-and-scrape", status_code=202)
async def discover_and_scrape(slug: str, background_tasks: BackgroundTasks):
    """
    Trigger an auto-discovery job via TinyFish.
    Creates a scrape_jobs record with status='pending' and immediately returns
    the job_id. The discovery + scraping pipeline runs in the background.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not configured.")

    trail_res = (
        supabase_client.table("trails").select("id, name, region").eq("slug", slug).execute()
    )
    if not trail_res.data:
        raise HTTPException(status_code=404, detail=f"Trail '{slug}' not found.")

    trail = trail_res.data[0]
    trail_id: str = trail["id"]
    trail_name: str = trail["name"]
    region: str = trail.get("region", "")

    # Create the job record in 'pending' state
    try:
        job_res = (
            supabase_client
            .table("scrape_jobs")
            .insert({
                "trail_id": trail_id,
                "status": "pending",
                "discovered_count": 0,
                "processed_count": 0,
                "failed_count": 0,
            })
            .execute()
        )
        job_id: str = job_res.data[0]["id"]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {exc}")

    # Schedule background execution — returns immediately
    background_tasks.add_task(
        _run_discovery_job,
        job_id=job_id,
        trail_id=trail_id,
        trail_name=trail_name,
        region=region,
    )

    return {
        "status": "pending",
        "job_id": job_id,
        "message": f"Discovery job queued for '{trail_name}'. Poll /scrape-jobs/{job_id} for status.",
    }


@router.get("/{slug}/scrape-jobs/{job_id}")
async def get_scrape_job(slug: str, job_id: str):
    """
    Return the current status of a scrape/discovery job.
    Used for frontend polling.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not configured.")

    # Verify trail exists
    trail_res = (
        supabase_client.table("trails").select("id").eq("slug", slug).execute()
    )
    if not trail_res.data:
        raise HTTPException(status_code=404, detail=f"Trail '{slug}' not found.")

    trail_id = trail_res.data[0]["id"]

    job_res = (
        supabase_client
        .table("scrape_jobs")
        .select("id, status, discovered_count, processed_count, failed_count, started_at, finished_at, error_message, created_at")
        .eq("id", job_id)
        .eq("trail_id", trail_id)
        .execute()
    )

    if not job_res.data:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found for this trail.")

    return job_res.data[0]
