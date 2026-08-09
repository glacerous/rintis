"""
Confidence scoring for condition reports.

Formula
───────
confidence = w1*source_type_score + w2*recency_decay + w3*corroboration + w4*track_record

Weights (tunable — change these constants to re-calibrate without touching logic):
    w1 = 0.40   source authority
    w2 = 0.25   how recent the report is
    w3 = 0.25   how many other sources corroborate the same claim type
    w4 = 0.10   historical track record of this source

All component values are in [0, 1]; the final score is therefore also in [0, 1].
"""

import math
from datetime import datetime, timezone
from typing import Optional

from app.database import supabase_client

# ── Tunable weights ───────────────────────────────────────────────────────────
W1 = 0.50  # source_type_score weight (increased for higher authority impact)
W2 = 0.20  # recency_decay weight
W3 = 0.20  # corroboration weight
W4 = 0.10  # track_record weight

# Recency decay rate.  λ=0.01 means a 30-day-old report retains ~74% of its
# recency score; a 60-day-old report retains ~55%.
RECENCY_LAMBDA = 0.01

# Corroboration: look for other reports with the same claim_type + waypoint_id
# published within this window.
CORROBORATION_WINDOW_DAYS = 30

# Normalisation cap for corroboration count (log-scaled diminishing return).
# At CORROBORATION_CAP reports the score saturates at ~1.0.
CORROBORATION_CAP = 10

# Source type → base authority score.
SOURCE_TYPE_SCORES: dict[str, float] = {
    "official_govt": 1.0,        # BMKG, BNPB, Balai TNGM
    "established_media": 0.7,
    "verified_community": 0.6,   # Basecamp/komunitas terverifikasi
    "individual_post": 0.3,
}


def compute_confidence(
    source_type: str,
    published_or_scraped_at: Optional[datetime],
    claim_type: str,
    waypoint_id: Optional[str],
    trail_id: str,
    osm_last_edited: Optional[str] = None,
) -> float:
    """
    Compute a [0, 1] confidence score for a condition report.

    Parameters
    ----------
    source_type           : one of SOURCE_TYPE_SCORES keys
    published_or_scraped_at : publication/scrape timestamp; None → treat as now
    claim_type            : one of the condition_reports.claim_type enum values
    waypoint_id           : UUID of the matched waypoint, or None (general claim)
    trail_id              : UUID of the parent trail (needed for corroboration query)
    osm_last_edited       : ISO 8601 string from waypoints.osm_last_edited (optional)

    Returns
    -------
    float in [0.0, 1.0]
    """
    s1 = _source_type_score(source_type)
    s2 = _recency_decay(published_or_scraped_at)
    s3 = _corroboration(claim_type, waypoint_id, trail_id)
    s4 = _track_record(source_type)

    score = W1 * s1 + W2 * s2 + W3 * s3 + W4 * s4

    # Optional: minor penalty for very stale OSM waypoint data (max -0.05).
    # This is an additive signal, not a gate — it can never push the score below 0.
    if osm_last_edited:
        score -= _osm_staleness_penalty(osm_last_edited)

    return round(max(0.0, min(1.0, score)), 4)


# ── Component functions ───────────────────────────────────────────────────────

def _source_type_score(source_type: str) -> float:
    return SOURCE_TYPE_SCORES.get(source_type, 0.3)


def _recency_decay(published_or_scraped_at: Optional[datetime]) -> float:
    """
    Exponential decay: e^(-λ * days_since_report).
    Score approaches 1.0 for very recent reports and decays toward 0 over time.
    """
    if published_or_scraped_at is None:
        return 1.0  # unknown age → assume now (best-case; still weighted at w2)

    now = datetime.now(timezone.utc)
    # Ensure tz-aware comparison
    if published_or_scraped_at.tzinfo is None:
        published_or_scraped_at = published_or_scraped_at.replace(tzinfo=timezone.utc)

    days = max(0.0, (now - published_or_scraped_at).total_seconds() / 86400)
    return math.exp(-RECENCY_LAMBDA * days)


def _corroboration(
    claim_type: str,
    waypoint_id: Optional[str],
    trail_id: str,
) -> float:
    """
    Log-scaled corroboration: how many other condition_reports share the same
    claim_type + waypoint_id (or trail-level if waypoint_id is None) within
    CORROBORATION_WINDOW_DAYS days.

    Uses log(1 + count) / log(1 + CAP) for diminishing returns.
    Returns 0.0 if the Supabase query fails (non-fatal).
    """
    if not supabase_client:
        return 0.0
    try:
        from datetime import timedelta

        cutoff = (
            datetime.now(timezone.utc) - timedelta(days=CORROBORATION_WINDOW_DAYS)
        ).isoformat()

        query = (
            supabase_client
            .table("condition_reports")
            .select("id", count="exact")
            .eq("trail_id", trail_id)
            .eq("claim_type", claim_type)
            .gte("published_or_scraped_at", cutoff)
        )
        if waypoint_id:
            query = query.eq("waypoint_id", waypoint_id)
        else:
            query = query.is_("waypoint_id", "null")

        res = query.execute()
        count = res.count or 0
        return math.log(1 + count) / math.log(1 + CORROBORATION_CAP)
    except Exception as exc:
        print(f"[Confidence] Corroboration query failed: {exc}")
        return 0.0


def _track_record(source_type: str) -> float:
    """
    Track record of the source domain based on historical accuracy.

    SIMPLIFICATION (MVP Stage 2): we default to 1.0 for official government
    announcements and 0.5 for all other sources since we do not yet have
    historical dispute data.
    """
    if source_type == "official_govt":
        return 1.0
    return 0.5


def _osm_staleness_penalty(osm_last_edited: str) -> float:
    """
    Optional minor penalty when a waypoint's OSM data is very stale (> 2 years).
    Maximum deduction: 0.05.  This is a rough proxy, not a hard gate.
    """
    try:
        edited = datetime.fromisoformat(osm_last_edited.replace("Z", "+00:00"))
        days_stale = (datetime.now(timezone.utc) - edited).total_seconds() / 86400
        years_stale = days_stale / 365
        if years_stale < 2:
            return 0.0
        # Linear from 0 at 2 years to max 0.05 at 4+ years
        return min(0.05, (years_stale - 2) / 2 * 0.05)
    except Exception:
        return 0.0
