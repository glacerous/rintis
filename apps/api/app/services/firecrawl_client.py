"""
Firecrawl scrape client with 24-hour cache-first strategy.

The cache check and write are done in application code (not a SQL trigger)
so we can easily add force_refresh=True for manual bypassing.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from firecrawl import FirecrawlApp
from app.config import settings
from app.database import supabase_client

# Cache TTL: skip re-scraping if the entry is younger than this.
CACHE_TTL_HOURS = 24


def scrape_url(source_url: str, force_refresh: bool = False) -> Optional[str]:
    """
    Scrape a URL and return its markdown text content.

    Strategy:
    1. Check scrape_cache for a recent entry (< CACHE_TTL_HOURS old).
    2. If found and not force_refresh, return cached content.
    3. Otherwise call Firecrawl raw scrape, persist to cache, return result.

    Returns None if scraping fails.
    """
    if not supabase_client:
        raise RuntimeError("Supabase client is not configured.")

    if not settings.firecrawl_api_key:
        raise RuntimeError("FIRECRAWL_API_KEY is not set.")

    # ── 1. Cache lookup ──────────────────────────────────────────────────────
    if not force_refresh:
        cached = _get_cache(source_url)
        if cached:
            print(f"[Firecrawl] Cache HIT for {source_url}")
            return cached

    # ── 2. Actual scrape ─────────────────────────────────────────────────────
    print(f"[Firecrawl] Scraping {source_url} ...")
    try:
        app = FirecrawlApp(api_key=settings.firecrawl_api_key)

        # Use raw scrape (not extract) to keep credit usage low.
        result = app.scrape_url(
            source_url,
            params={"formats": ["markdown"]},
        )

        # firecrawl-py v1 returns a dict-like object; get markdown content.
        content = None
        if isinstance(result, dict):
            content = result.get("markdown") or result.get("content")
        elif hasattr(result, "markdown"):
            content = result.markdown
        elif hasattr(result, "content"):
            content = result.content

        if not content:
            print(f"[Firecrawl] Empty response for {source_url}")
            return None

        # ── 3. Persist to cache ───────────────────────────────────────────────
        _upsert_cache(source_url, content)
        return content

    except Exception as exc:
        print(f"[Firecrawl] Error scraping {source_url}: {exc}")
        return None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_cache(source_url: str) -> Optional[str]:
    """Return cached markdown if it exists and is within TTL, else None."""
    try:
        res = (
            supabase_client
            .table("scrape_cache")
            .select("raw_content, scraped_at")
            .eq("source_url", source_url)
            .limit(1)
            .execute()
        )
        if not res.data:
            return None

        row = res.data[0]
        scraped_at = datetime.fromisoformat(row["scraped_at"].replace("Z", "+00:00"))
        age = datetime.now(timezone.utc) - scraped_at

        if age < timedelta(hours=CACHE_TTL_HOURS):
            return row["raw_content"]

        return None  # stale — let caller re-scrape
    except Exception as exc:
        print(f"[Firecrawl] Cache read error: {exc}")
        return None


def _upsert_cache(source_url: str, content: str) -> None:
    """Insert or update a scrape_cache row for the given URL."""
    try:
        supabase_client.table("scrape_cache").upsert(
            {
                "source_url": source_url,
                "raw_content": content,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="source_url",
        ).execute()
    except Exception as exc:
        # Non-fatal: log and continue — the caller still gets the content.
        print(f"[Firecrawl] Cache write error: {exc}")
