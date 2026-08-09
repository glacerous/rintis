"""
Conditions router — Stage 2 pipeline endpoint.

POST /api/trails/{slug}/condition-sources
  Body : { "urls": ["https://...", ...], "source_type": "...", "force_refresh": false }
  Runs : scrape → resolve → match → score → persist for each URL.
  Returns: summary of what was saved.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from app.database import supabase_client
from app.services.firecrawl_client import scrape_url
from app.services.resolver import resolve_claims
from app.services.matcher import match_waypoint
from app.services.confidence import compute_confidence

router = APIRouter(prefix="/trails")


class ConditionSourcesRequest(BaseModel):
    urls: list[str]
    # Source type applies to all URLs in this batch — caller knows the domain provenance.
    source_type: str = "individual_post"
    force_refresh: bool = False


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

    # ── Resolve trail ─────────────────────────────────────────────────────────
    trail_res = (
        supabase_client.table("trails").select("id, name").eq("slug", slug).execute()
    )
    if not trail_res.data:
        raise HTTPException(status_code=404, detail=f"Trail '{slug}' not found.")

    trail = trail_res.data[0]
    trail_id: str = trail["id"]

    # Validate source_type
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
        url_result: dict = {"url": url, "claims_saved": 0, "error": None, "model_used": None}

        # ── 1. Scrape (cache-first) ───────────────────────────────────────────
        try:
            raw_text = scrape_url(url, force_refresh=payload.force_refresh)
        except Exception as exc:
            url_result["error"] = f"Scrape failed: {exc}"
            results_per_url.append(url_result)
            continue

        if not raw_text:
            url_result["error"] = "Scrape returned empty content."
            results_per_url.append(url_result)
            continue

        # ── 2. LLM extraction ─────────────────────────────────────────────────
        try:
            resolved = resolve_claims(raw_text, url)
        except Exception as exc:
            url_result["error"] = f"LLM resolution failed: {exc}"
            results_per_url.append(url_result)
            continue

        claims = resolved["claims"]
        url_result["model_used"] = resolved["model_used"]
        if resolved.get("fallback_reason"):
            url_result["fallback_reason"] = resolved["fallback_reason"]

        if not claims:
            url_result["error"] = "LLM found no hiking condition claims in this content."
            results_per_url.append(url_result)
            continue

        # ── 3. Match + score + persist each claim ─────────────────────────────
        rows_to_insert = []
        for claim in claims:
            claim_text: str = claim.get("claim_text", "").strip()
            claim_type: str = claim.get("claim_type", "other")
            wp_guess: Optional[str] = claim.get("waypoint_name_guess")
            date_guess: Optional[str] = claim.get("published_date_guess")

            if not claim_text:
                continue

            # Fuzzy match waypoint
            waypoint_id = match_waypoint(wp_guess, trail_id) if wp_guess else None

            # Resolve published timestamp
            published_at: Optional[datetime] = None
            if date_guess:
                try:
                    published_at = datetime.fromisoformat(
                        date_guess.replace("Z", "+00:00")
                    )
                except ValueError:
                    pass
            if published_at is None:
                published_at = datetime.now(timezone.utc)

            # Fetch OSM staleness for the matched waypoint (optional signal)
            osm_last_edited = _get_osm_last_edited(waypoint_id)

            # Compute confidence
            score = compute_confidence(
                source_type=payload.source_type,
                published_or_scraped_at=published_at,
                claim_type=claim_type,
                waypoint_id=waypoint_id,
                trail_id=trail_id,
                osm_last_edited=osm_last_edited,
            )

            rows_to_insert.append({
                "trail_id": trail_id,
                "waypoint_id": waypoint_id,
                "claim_text": claim_text[:500],   # hard cap to match DB constraints
                "claim_type": claim_type,
                "confidence_score": score,
                "source_url": url,
                "source_type": payload.source_type,
                "published_or_scraped_at": published_at.isoformat(),
                "status": "unverified",
            })
            total_scores.append(score)

        if rows_to_insert:
            try:
                ins_res = (
                    supabase_client
                    .table("condition_reports")
                    .insert(rows_to_insert)
                    .execute()
                )
                saved = len(ins_res.data)
                url_result["claims_saved"] = saved
                total_claims_saved += saved
            except Exception as exc:
                url_result["error"] = f"DB insert failed: {exc}"

        results_per_url.append(url_result)

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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_osm_last_edited(waypoint_id: Optional[str]) -> Optional[str]:
    """Fetch osm_last_edited for a waypoint; returns None on any failure."""
    if not waypoint_id or not supabase_client:
        return None
    try:
        res = (
            supabase_client
            .table("waypoints")
            .select("osm_last_edited")
            .eq("id", waypoint_id)
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0].get("osm_last_edited")
    except Exception:
        pass
    return None
