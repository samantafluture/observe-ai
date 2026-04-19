"""Geocoding wrapper over Nominatim with rate-limiting + disk cache.

Nominatim's fair-use policy requires a 1-req/sec ceiling and a descriptive
user agent. We cache every successful lookup to `pipeline/.cache/geocode.json`
so re-runs are free and reproducible even without network access.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

CACHE_PATH = Path(__file__).resolve().parent.parent / ".cache" / "geocode.json"
USER_AGENT = "ai-globe-pipeline/0.3 (https://github.com/samantafluture/observe-ai)"


class Geocoder:
    def __init__(self, cache_path: Path = CACHE_PATH):
        self.cache_path = cache_path
        self.cache: dict[str, tuple[float, float]] = {}
        self._load_cache()
        # Only spin up a real geocoder if we're allowed to hit the network.
        offline = os.environ.get("PIPELINE_OFFLINE") == "1"
        if offline:
            self._fn = None
        else:
            nom = Nominatim(user_agent=USER_AGENT, timeout=10)
            self._fn = RateLimiter(nom.geocode, min_delay_seconds=1.0, max_retries=2)

    def _load_cache(self) -> None:
        if self.cache_path.exists():
            try:
                self.cache = {k: tuple(v) for k, v in json.loads(self.cache_path.read_text()).items()}
            except Exception:
                self.cache = {}

    def _save_cache(self) -> None:
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_path.write_text(json.dumps(self.cache, indent=2, sort_keys=True))

    def lookup(self, query: str) -> Optional[tuple[float, float]]:
        key = query.strip().lower()
        if key in self.cache:
            return self.cache[key]
        if self._fn is None:
            return None
        try:
            loc = self._fn(query)
        except Exception:
            return None
        if loc is None:
            return None
        coords = (float(loc.longitude), float(loc.latitude))
        self.cache[key] = coords
        self._save_cache()
        return coords
