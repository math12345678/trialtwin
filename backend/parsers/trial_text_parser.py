"""Rules-based free-text trial spec parser.

Deterministic; runs in <50ms. No LLM dependency.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

try:
    import pycountry  # type: ignore
except Exception:  # pragma: no cover
    pycountry = None  # noqa: N816


# Hardcoded alias map (applied before any fuzzy lookup)
ALIAS_MAP: Dict[str, str] = {
    "uk": "GB", "u.k.": "GB", "england": "GB", "britain": "GB", "great britain": "GB", "united kingdom": "GB",
    "us": "US", "usa": "US", "u.s.": "US", "u.s.a.": "US", "america": "US", "united states": "US", "united states of america": "US",
    "south korea": "KR", "korea": "KR", "republic of korea": "KR",
    "north korea": "KP",
    "uae": "AE", "united arab emirates": "AE",
    "russia": "RU", "russian federation": "RU",
    "czech republic": "CZ", "czechia": "CZ",
    "vietnam": "VN", "viet nam": "VN",
    "taiwan": "TW", "hong kong": "HK",
    "iran": "IR", "turkey": "TR", "turkiye": "TR",
    "germany": "DE", "france": "FR", "italy": "IT", "spain": "ES", "portugal": "PT",
    "netherlands": "NL", "holland": "NL", "belgium": "BE", "switzerland": "CH",
    "sweden": "SE", "norway": "NO", "denmark": "DK", "finland": "FI", "ireland": "IE",
    "austria": "AT", "poland": "PL", "hungary": "HU", "romania": "RO", "ukraine": "UA",
    "japan": "JP", "china": "CN", "india": "IN", "thailand": "TH", "indonesia": "ID",
    "pakistan": "PK", "bangladesh": "BD",
    "australia": "AU", "new zealand": "NZ",
    "brazil": "BR", "mexico": "MX", "argentina": "AR", "chile": "CL",
    "south africa": "ZA", "nigeria": "NG", "egypt": "EG", "kenya": "KE", "morocco": "MA",
    "israel": "IL", "saudi arabia": "SA",
    "canada": "CA",
}

# Country name regex from alias keys (longest first to prevent prefix conflicts)
_alias_pattern = re.compile(
    r"\b(" + "|".join(sorted((re.escape(k) for k in ALIAS_MAP), key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)


def parse_trial_text(text: str) -> Dict:
    if not text or not text.strip():
        return {}

    result: Dict = {}

    # Target N — match digits that are within ~30 chars of a cohort keyword
    # (digits first, then keyword OR keyword first, then digits)
    n_match = re.search(
        r"\b(\d{2,5})\b[^.,;]{0,30}?\b(?:patients|participants|subjects|enrolled|enrollment|cohort|trial)\b",
        text,
        re.IGNORECASE,
    )
    if not n_match:
        # Alternate: "N=600", "target 600"
        n_match = re.search(
            r"\b(?:n\s*=\s*|target[:\s]+|enroll(?:ing|ment)?(?:\s+of)?[:\s]+)(\d{2,5})\b",
            text,
            re.IGNORECASE,
        )
    if n_match:
        result["target_n"] = int(n_match.group(1))

    # Age range  (e.g. "ages 18-75", "18 to 75 years", "adults 21-90")
    age_match = re.search(
        r"(?:age[sd]?\s+)?(\d{1,2})\s*(?:-|–|—|to)\s*(\d{2,3})\s*(?:years?|y/?o)?",
        text,
        re.IGNORECASE,
    )
    if age_match:
        lo, hi = int(age_match.group(1)), int(age_match.group(2))
        if 0 <= lo < hi <= 120:
            result["min_age"] = lo
            result["max_age"] = hi

    # Sex restriction
    if re.search(r"\b(males?\s*[-]?\s*only|men only|male patients only)\b", text, re.IGNORECASE):
        result["sex_restriction"] = "male_only"
    elif re.search(r"\b(females?\s*[-]?\s*only|women only|female patients only)\b", text, re.IGNORECASE):
        result["sex_restriction"] = "female_only"

    # Prior treatment
    if re.search(
        r"\b(prior\s+(?:therapy|treatment|tki|systemic)\s+(?:required|needed)|"
        r"previously\s+treated|second[- ]line|treatment[- ]experienced)\b",
        text,
        re.IGNORECASE,
    ):
        result["prior_treatment_required"] = True

    # Countries: alias map first
    countries: List[str] = []
    for m in _alias_pattern.finditer(text):
        code = ALIAS_MAP.get(m.group(0).lower())
        if code and code not in countries:
            countries.append(code)

    # Pycountry fuzzy fallback for anything still missing
    if pycountry is not None:
        # Tokenize on commas/and/space; try multi-word candidates
        # We avoid scanning every word to keep precision; only candidate strings
        # in capitalized phrases are attempted.
        candidates = re.findall(r"\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b", text)
        for cand in candidates:
            lower = cand.lower()
            if lower in ALIAS_MAP:
                continue
            try:
                matches = pycountry.countries.search_fuzzy(cand)
                if matches:
                    code = matches[0].alpha_2
                    if code not in countries:
                        countries.append(code)
            except LookupError:
                pass

    if countries:
        result["countries"] = countries

    return result
