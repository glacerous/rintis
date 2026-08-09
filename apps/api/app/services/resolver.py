"""
Groq LLM resolver — extracts structured hiking condition claims from raw scraped text.

Model selection strategy
─────────────────────────
Primary  : openai/gpt-oss-120b
  - Supports Groq's json_schema response_format (non-strict mode to avoid 400 errors
    from strict/json_tool_call mode incompatibilities reported in 2025 SDK issues).
Fallback : moonshotai/kimi-k2-instruct-0905
  - Explicitly listed in Groq docs as fully supporting structured output.
  - Activated automatically if the primary returns a 400 / parsing error; the caller
    receives a 'model_used' field in the result indicating the switch.
"""

import json
import re
from typing import Any, Optional
from groq import Groq

from app.config import settings

PRIMARY_MODEL = "openai/gpt-oss-120b"
FALLBACK_MODEL = "moonshotai/kimi-k2-instruct-0905"

# JSON Schema for structured output — Groq enforces this server-side.
_CLAIM_SCHEMA = {
    "name": "hiking_claims",
    "strict": False,   # strict=True triggers 400 on some Groq models; keep False
    "schema": {
        "type": "object",
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "claim_text": {
                            "type": "string",
                            "description": "Ringkasan singkat klaim kondisi dalam bahasa Indonesia (maks 200 karakter)."
                        },
                        "claim_type": {
                            "type": "string",
                            "enum": ["trail_status", "hazard", "water_source", "weather", "closure", "other"]
                        },
                        "waypoint_name_guess": {
                            "type": ["string", "null"],
                            "description": "Nama pos/camp/puncak yang paling relevan dari teks, atau null jika klaim bersifat umum."
                        },
                        "published_date_guess": {
                            "type": ["string", "null"],
                            "description": "Tanggal terbit artikel dalam format ISO 8601 jika ada di teks, null jika tidak ada sinyal tanggal."
                        }
                    },
                    "required": ["claim_text", "claim_type", "waypoint_name_guess", "published_date_guess"]
                }
            }
        },
        "required": ["claims"]
    }
}

_SYSTEM_PROMPT = """Kamu adalah asisten ekstraksi informasi untuk aplikasi pendakian gunung Indonesia.

Tugasmu: dari teks artikel/laporan yang diberikan, ekstrak SEMUA klaim yang relevan tentang kondisi jalur pendakian.

Aturan ketat:
- Hanya ekstrak klaim yang BENAR-BENAR ada di teks. Jangan mengarang informasi.
- Jangan menebak tanggal jika tidak ada sinyal waktu di teks. Gunakan null.
- Jangan menebak nama pos/waypoint jika tidak disebutkan. Gunakan null.
- claim_text: ringkasan singkat dalam bahasa Indonesia, maksimal 200 karakter.
- claim_type: pilih salah satu dari enum yang disediakan.
- Kalau teks tidak mengandung informasi kondisi jalur sama sekali, kembalikan claims: [].
"""


def resolve_claims(
    raw_text: str,
    source_url: str,
) -> dict[str, Any]:
    """
    Extract structured hiking condition claims from raw scraped markdown.

    Returns:
        {
            "claims": [...],
            "model_used": str,
            "fallback_reason": str | None   # set if fallback was triggered
        }
    """
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set.")

    client = Groq(api_key=settings.groq_api_key)

    # Truncate very long texts to avoid token limit issues (keep first ~12k chars)
    text_excerpt = raw_text[:12000] if len(raw_text) > 12000 else raw_text

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": f"URL Sumber: {source_url}\n\n---\n\n{text_excerpt}"},
    ]

    # ── Attempt primary model ─────────────────────────────────────────────────
    claims, fallback_reason = _call_groq(client, PRIMARY_MODEL, messages)
    model_used = PRIMARY_MODEL

    if claims is None:
        fallback_reason_detail = fallback_reason or "Primary model returned unparseable output"
        print(f"[Resolver] Falling back to {FALLBACK_MODEL}: {fallback_reason_detail}")
        claims, _ = _call_groq(client, FALLBACK_MODEL, messages)
        model_used = FALLBACK_MODEL
        if claims is None:
            raise RuntimeError(
                f"Both primary ({PRIMARY_MODEL}) and fallback ({FALLBACK_MODEL}) models failed. "
                f"Primary failure: {fallback_reason_detail}"
            )
    else:
        fallback_reason_detail = None

    return {
        "claims": claims,
        "model_used": model_used,
        "fallback_reason": fallback_reason_detail,
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _call_groq(
    client: Groq,
    model: str,
    messages: list[dict],
) -> tuple[Optional[list], Optional[str]]:
    """
    Call Groq with json_schema response_format.
    Returns (claims_list, error_reason) — claims_list is None on failure.
    """
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": _CLAIM_SCHEMA,
            },
            temperature=0.1,   # low temperature → more deterministic, less hallucination
            max_tokens=2048,
        )

        content = response.choices[0].message.content
        parsed = _safe_parse_json(content)

        if parsed is None:
            return None, f"JSON parse failed. Raw: {content[:200]}"

        claims = parsed.get("claims", [])
        if not isinstance(claims, list):
            return None, "Response 'claims' field is not a list."

        return claims, None

    except Exception as exc:
        return None, str(exc)


def _safe_parse_json(text: str) -> Optional[dict]:
    """Parse JSON, stripping markdown fences if present."""
    if text is None:
        return None
    text = text.strip()
    # Strip ```json ... ``` fences that some models still emit
    fence = re.match(r"^```(?:json)?\s*([\s\S]+?)\s*```$", text)
    if fence:
        text = fence.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None
