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

        # Define domains by category
        GOVT_DOMAINS = ["tngunungmerbabu.org", "go.id"]
        MEDIA_DOMAINS = [
            "detik.com", "kompas.com", "tempo.co", "idntimes.com",
            "kumparan.com", "tribunnews.com", "liputan6.com",
            "merdeka.com", "cnnindonesia.com", "antaranews.com"
        ]
        COMMUNITY_DOMAINS = [
            "kompasiana.com", "kaskus.co.id",
            "backpackerindonesia.com", "mounture.com"
        ]

        # 3 targeted query configurations
        categories = [
            {
                "name": "Official/Govt",
                "query": f"pengumuman informasi pendakian {trail_name}{region_tag}",
                "domains": GOVT_DOMAINS,
                "target_share": 3,
                "urls": []
            },
            {
                "name": "Established Media",
                "query": f"kondisi jalur pendakian {trail_name}{region_tag} terbaru",
                "domains": MEDIA_DOMAINS,
                "target_share": 4,
                "urls": []
            },
            {
                "name": "Community/Forums",
                "query": f"catatan perjalanan pendakian {trail_name}{region_tag} info jalur",
                "domains": COMMUNITY_DOMAINS,
                "target_share": 3,
                "urls": []
            }
        ]

        # Run queries and classify results
        for cat in categories:
            try:
                response = client.search.query(
                    query=cat["query"],
                    include_domains=cat["domains"]
                )
                batch = getattr(response, "results", [])
                print(f"[TinyFish] Category '{cat['name']}' -> {len(batch)} results")
                
                for r in batch:
                    url = getattr(r, "url", None)
                    if url and is_allowed_domain(url):
                        cat["urls"].append(url)
            except Exception as e:
                print(f"[TinyFish] Category '{cat['name']}' query failed: {e}")

        # Interleave and merge with target share limits
        final_urls = []
        seen = set()

        # Step 1: Fill up to target shares
        for cat in categories:
            added = 0
            for url in cat["urls"]:
                if url not in seen:
                    seen.add(url)
                    final_urls.append(url)
                    added += 1
                    if added >= cat["target_share"]:
                        break

        # Step 2: Fill any remaining capacity up to 10 from leftovers
        if len(final_urls) < 10:
            for cat in categories:
                for url in cat["urls"]:
                    if url not in seen:
                        seen.add(url)
                        final_urls.append(url)
                        if len(final_urls) >= 10:
                            break
                if len(final_urls) >= 10:
                    break

        print(f"[TinyFish] Balanced discovery complete: {len(final_urls)} unique URLs selected.")
        for idx, url in enumerate(final_urls):
            print(f"  [{idx+1:02d}] {url}")
            
        return final_urls[:10]

    except Exception as e:
        print(f"[TinyFish] Client initialization or fatal error: {e}")
        raise e



