"""
Waypoint name fuzzy matcher.

Matches an LLM-guessed waypoint name against the actual waypoints stored in
Supabase for a given trail, using rapidfuzz for fast string similarity.

Threshold and strategy notes
─────────────────────────────
- We use WRatio (weighted ratio) from rapidfuzz which handles partial matches
  well (e.g. "Pos 3" matches "Pos 3 Wakpey" with high score).
- Default threshold: 70 / 100.  Below this we consider the match non-confident
  and store the claim as a general trail-level report (waypoint_id = None).
- Embedding-based semantic matching is deliberately out of scope for Stage 2.
  Upgrade path: replace this module's internals without changing the call site.
"""

from typing import Optional

from rapidfuzz import process, fuzz

from app.database import supabase_client

MATCH_THRESHOLD = 70  # minimum similarity score (0–100) to accept a match


def match_waypoint(
    waypoint_name_guess: Optional[str],
    trail_id: str,
) -> Optional[str]:
    """
    Return the UUID of the best-matching waypoint for a given trail, or None.

    Parameters
    ----------
    waypoint_name_guess : name string extracted by the LLM (may be None)
    trail_id            : UUID of the parent trail

    Returns
    -------
    waypoint UUID string, or None if no confident match found.
    """
    if not waypoint_name_guess or not supabase_client:
        return None

    # Fetch all waypoints for this trail (name + id)
    try:
        res = (
            supabase_client
            .table("waypoints")
            .select("id, name")
            .eq("trail_id", trail_id)
            .execute()
        )
    except Exception as exc:
        print(f"[Matcher] Failed to fetch waypoints for trail {trail_id}: {exc}")
        return None

    if not res.data:
        return None

    # Build lookup: name → id
    choices: dict[str, str] = {row["name"]: row["id"] for row in res.data}

    # rapidfuzz.process.extractOne returns (best_name, score, key)
    result = process.extractOne(
        waypoint_name_guess,
        choices.keys(),
        scorer=fuzz.WRatio,
        score_cutoff=MATCH_THRESHOLD,
    )

    if result is None:
        print(
            f"[Matcher] No confident match for '{waypoint_name_guess}' "
            f"(threshold {MATCH_THRESHOLD}) — storing as general claim."
        )
        return None

    best_name, score, _ = result
    waypoint_id = choices[best_name]
    print(
        f"[Matcher] Matched '{waypoint_name_guess}' -> '{best_name}' "
        f"(score {score:.1f}) -> waypoint {waypoint_id}"
    )
    return waypoint_id
