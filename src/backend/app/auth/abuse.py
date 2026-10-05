"""Account-aware failed-login signals without account lockout."""

from __future__ import annotations

import hashlib
import hmac
from functools import lru_cache

from flask import current_app
from redis import Redis
from redis.exceptions import RedisError

ALERT_THRESHOLDS = {10, 25, 50, 100}
WINDOW_SECONDS = 60 * 60


@lru_cache(maxsize=4)
def _redis_client(storage_uri: str) -> Redis:
    return Redis.from_url(
        storage_uri,
        socket_connect_timeout=1,
        socket_timeout=1,
        decode_responses=True,
    )


def record_failed_account_login(email: str) -> None:
    """Count failed attempts across IPs and emit threshold signals, never lock accounts."""
    if current_app.config.get("ENVIRONMENT") == "testing":
        return

    storage_uri = str(current_app.config.get("RATELIMIT_STORAGE_URI", ""))
    if not storage_uri.startswith(("redis://", "rediss://")):
        return

    secret = current_app.config["SECRET_KEY"].encode("utf-8")
    fingerprint = hmac.new(
        secret,
        email.strip().lower().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:24]
    key = f"medidesk:auth:failed-account:{fingerprint}"

    try:
        pipeline = _redis_client(storage_uri).pipeline(transaction=True)
        pipeline.incr(key)
        pipeline.expire(key, WINDOW_SECONDS)
        count, _ = pipeline.execute()
    except RedisError as exc:
        # Login enforcement remains available through Flask-Limiter; telemetry is best effort.
        current_app.logger.error(
            "Failed-login account signal unavailable (exception_type=%s)",
            type(exc).__name__,
        )
        return

    if count in ALERT_THRESHOLDS:
        current_app.logger.warning(
            "Repeated failed login threshold reached (account_fingerprint=%s failures=%s window_seconds=%s)",
            fingerprint,
            count,
            WINDOW_SECONDS,
        )
