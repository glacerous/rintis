from typing import Optional
from urllib.parse import urlparse
from app.config import settings

# Tight allowlist — only high-signal domains for hiking condition reports.
# Generic blog platforms (blogspot.com, wordpress.com) are intentionally excluded
# to avoid stale noise; only known specific subdomains get through the discovery step.
ALLOWLIST_DOMAINS = [
    # Government / Official
    "tngunungmerbabu.org",
    "go.id",
    # Established Media
    "detik.com",
    "kompas.com",
    "tempo.co",
    "idntimes.com",
    "kumparan.com",
    "tribunnews.com",
    "liputan6.com",
    "merdeka.com",
    "cnnindonesia.com",
    "antaranews.com",
    # Verified Community / Forums
    "kompasiana.com",
    "kaskus.co.id",
    "backpackerindonesia.com",
    "mounture.com",
]

def is_allowed_domain(url: str) -> bool:
    """Check if the URL belongs to the allowed domains list (rejects Instagram, X, Facebook, etc.)."""
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
            
        for allowed in ALLOWLIST_DOMAINS:
            if netloc == allowed or netloc.endswith("." + allowed):
                return True
        return False
    except Exception:
        return False

def discover_sources(trail_name: str, region: Optional[str] = None) -> list[str]:
    """
    Search for hike condition reports using TinyFish Search API.
    Runs multiple targeted queries and merges deduplicated results.
    Enforces allowlist domain filtering before returning.

    If settings.tinyfish_api_key is 'mock' or empty, falls back to a
    verified mock list of URLs for demo/testing without a real API key.
    """
    api_key = settings.tinyfish_api_key.strip() if settings.tinyfish_api_key else ""

    if not api_key or api_key.lower() == "mock":
        print("[TinyFish] Running in MOCK mode. Returning pre-verified Merbabu URLs.")
        mock_urls = [
            "https://tngunungmerbabu.org/2026/06/13/tn-gunung-merbabu-operasikan-shelter-emergency-berbasis-teknologi-di-jalur-suwanting/",
            "https://tngunungmerbabu.org/2026/07/19/balai-tn-gunung-merbabu-bersihkan-vandalisme-dan-perkuat-pengamanan-jalur-pendakian/",
            "https://tngunungmerbabu.org/2026/07/10/balai-tn-gunung-merbabu-perkuat-kesiapsiagaan-masyarakat-hadapi-karhutla-melalui-pembinaan-mpa/",
            "https://tngunungmerbabu.org/2026/05/31/polres-boyolali-dan-tn-gunung-merbabu-sosialisasikan-keselamatan-pendakian-dan-waspada-el-nino-2026/",
            "https://www.kompasiana.com/sultanalbana2528/67e11e6eed6415145d3f84f4/pendakian-tektok-gunung-merbabu-estimasi-waktu-dan-tantangannya"
        ]
        return [url for url in mock_urls if is_allowed_domain(url)]

    print(f"[TinyFish] REAL mode — calling Search API for '{trail_name}'...")
    try:
        from tinyfish import TinyFish
        client = TinyFish(api_key=api_key)

        region_tag = f" {region}" if region else ""

        # Two targeted queries using include_domains (NOT site: operators — they conflict):
        # 1. Official/media sources — authoritative condition updates
        # 2. Community sources — trip reports and forum posts
        OFFICIAL_MEDIA_DOMAINS = [
            "tngunungmerbabu.org", "go.id",
            "detik.com", "kompas.com", "tempo.co", "idntimes.com",
            "kumparan.com", "tribunnews.com", "liputan6.com",
            "merdeka.com", "cnnindonesia.com", "antaranews.com",
        ]
        COMMUNITY_DOMAINS = [
            "kompasiana.com", "kaskus.co.id",
            "backpackerindonesia.com", "mounture.com",
        ]

        queries = [
            (
                f"kondisi jalur pendakian {trail_name}{region_tag} terbaru",
                OFFICIAL_MEDIA_DOMAINS,
            ),
            (
                f"laporan pendakian {trail_name}{region_tag} kondisi jalur terbaru",
                COMMUNITY_DOMAINS,
            ),
        ]

        seen: set[str] = set()
        discovered_urls: list[str] = []

        for i, (query_str, domains) in enumerate(queries):
            try:
                response = client.search.query(
                    query=query_str,
                    include_domains=domains,
                )
                batch = getattr(response, "results", [])
                print(f"[TinyFish] Query {i+1}: '{query_str[:60]}' -> {len(batch)} results")

                for result in batch:
                    url = getattr(result, "url", None)
                    if url and url not in seen and is_allowed_domain(url):
                        seen.add(url)
                        discovered_urls.append(url)
                        title = getattr(result, "title", "")
                        print(f"  + [{len(discovered_urls):02d}] {title[:60]} — {url[:80]}")

            except Exception as e:
                print(f"[TinyFish] Query {i+1} failed: {e}")
                # Don't abort — try remaining queries

        print(f"[TinyFish] Discovery complete: {len(discovered_urls)} unique allowed URLs found.")
        return discovered_urls[:10]

    except Exception as e:
        print(f"[TinyFish] Client initialization or fatal error: {e}")
        raise e


