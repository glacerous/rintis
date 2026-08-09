from typing import Optional
from urllib.parse import urlparse
from app.config import settings

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
    # Verified Community / Forums / Blogs
    "kompasiana.com",
    "kaskus.co.id",
    "backpackerindonesia.com",
    "mounture.com",
    "trackgunung.com",
    "blogspot.com",
    "wordpress.com",
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
    Enforces allowlist domain filtering before returning.
    
    If settings.tinyfish_api_key is 'mock' or empty, falls back to a verified mock list of URLs.
    """
    api_key = settings.tinyfish_api_key.strip() if settings.tinyfish_api_key else ""
    
    if not api_key or api_key.lower() == "mock":
        print("[TinyFish] Running in MOCK mode. Returning pre-verified Merbabu URLs.")
        # Return a list of verified real URLs (both govt and individual kompasiana)
        mock_urls = [
            "https://tngunungmerbabu.org/2026/06/13/tn-gunung-merbabu-operasikan-shelter-emergency-berbasis-teknologi-di-jalur-suwanting/",
            "https://tngunungmerbabu.org/2026/07/19/balai-tn-gunung-merbabu-bersihkan-vandalisme-dan-perkuat-pengamanan-jalur-pendakian/",
            "https://tngunungmerbabu.org/2026/07/10/balai-tn-gunung-merbabu-perkuat-kesiapsiagaan-masyarakat-hadapi-karhutla-melalui-pembinaan-mpa/",
            "https://tngunungmerbabu.org/2026/05/31/polres-boyolali-dan-tn-gunung-merbabu-sosialisasikan-keselamatan-pendakian-dan-waspada-el-nino-2026/",
            "https://www.kompasiana.com/sultanalbana2528/67e11e6eed6415145d3f84f4/pendakian-tektok-gunung-merbabu-estimasi-waktu-dan-tantangannya"
        ]
        return [url for url in mock_urls if is_allowed_domain(url)]

    print(f"[TinyFish] Initializing client for discovery query: '{trail_name}'...")
    try:
        from tinyfish import TinyFish
        client = TinyFish(api_key=api_key)
        
        # Build query string
        query_str = f"laporan kondisi jalur pendakian {trail_name}"
        if region:
            query_str += f" {region}"
        query_str += " terbaru"
        
        response = client.search.query(
            query=query_str,
            include_domains=ALLOWLIST_DOMAINS
        )
        
        discovered_urls = []
        for result in getattr(response, "results", []):
            url = getattr(result, "url", None)
            if url and is_allowed_domain(url):
                discovered_urls.append(url)
                
        # Limit to hard cap of 10
        return discovered_urls[:10]
        
    except Exception as e:
        print(f"[TinyFish] Search discovery failed: {e}")
        raise e
