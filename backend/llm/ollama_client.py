"""Ollama HTTP client with graceful fallback."""
from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

import httpx

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")


async def is_ollama_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{OLLAMA_HOST}/api/tags")
            return r.status_code == 200
    except Exception:
        return False


async def generate_json(
    prompt: str,
    schema: Optional[Dict[str, Any]] = None,
    temperature: float = 0.3,
    timeout: float = 30.0,
) -> Optional[Dict[str, Any]]:
    """Call Ollama and return parsed JSON, or None on any failure."""
    payload: Dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if schema is not None:
        payload["format"] = schema

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{OLLAMA_HOST}/api/generate", json=payload)
            r.raise_for_status()
            data = r.json()
            raw = data.get("response", "")
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                # Strip code fences if model wrapped output
                cleaned = raw.strip().strip("`")
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    return None
    except Exception:
        return None
