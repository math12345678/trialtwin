"""LLM-generated recommendation rationale (graceful fallback to template)."""
from __future__ import annotations

from typing import Optional

from .ollama_client import generate_json

SCHEMA = {
    "type": "object",
    "properties": {
        "rationale": {"type": "string", "maxLength": 300}
    },
    "required": ["rationale"],
}


def _fallback(country: str, region_label: str, current_rq: float, new_rq: float, delta_res: float) -> str:
    return (
        f"Adding a site in {country} directly addresses {region_label}'s underrepresentation "
        f"(current RQ: {current_rq:.2f}). Simulation projects {region_label}'s RQ improving to "
        f"{new_rq:.2f}, raising the overall RES by {delta_res:.3f}."
    )


async def get_rationale(
    country: str,
    region_label: str,
    current_rq: float,
    new_rq: float,
    delta_res: float,
) -> str:
    prompt = (
        "You are advising a clinical trial team. In two sentences, explain why adding a site in "
        f"{country} would improve representation. Current {region_label} RQ: {current_rq:.2f}. "
        f"Projected {region_label} RQ after the addition: {new_rq:.2f} "
        f"(overall RES change: +{delta_res:.3f}). "
        "Be concrete; no hedging, no bullet points. Output strict JSON: "
        '{"rationale": "..."}'
    )
    parsed = await generate_json(prompt, schema=SCHEMA, temperature=0.3)
    if parsed and isinstance(parsed.get("rationale"), str) and parsed["rationale"].strip():
        rationale = parsed["rationale"].strip()
        # Truncate if model violated length contract
        if len(rationale) > 320:
            rationale = rationale[:317] + "..."
        return rationale
    return _fallback(country, region_label, current_rq, new_rq, delta_res)
