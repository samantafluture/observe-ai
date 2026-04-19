"""Thin HTTP helpers with timeouts and exponential-backoff retries."""
from __future__ import annotations

import os
from typing import Any

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

DEFAULT_UA = "ai-globe-pipeline/0.3 (+https://github.com/samantafluture/observe-ai)"
DEFAULT_TIMEOUT = 20


def offline() -> bool:
    return os.environ.get("PIPELINE_OFFLINE") == "1"


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((requests.RequestException,)),
)
def get_json(url: str, **kwargs: Any) -> Any:
    resp = requests.get(
        url,
        timeout=DEFAULT_TIMEOUT,
        headers={"User-Agent": DEFAULT_UA, "Accept": "application/json"},
        **kwargs,
    )
    resp.raise_for_status()
    return resp.json()


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((requests.RequestException,)),
)
def get_text(url: str, **kwargs: Any) -> str:
    resp = requests.get(
        url,
        timeout=DEFAULT_TIMEOUT,
        headers={"User-Agent": DEFAULT_UA},
        **kwargs,
    )
    resp.raise_for_status()
    return resp.text
