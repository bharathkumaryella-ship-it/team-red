"""Environment-based configuration for development, testing, and production."""

from __future__ import annotations

import base64
import hashlib
import os
from pathlib import Path
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlsplit

from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


def _phi_encryption_keys(environment: str) -> tuple[str, ...]:
    if environment == "testing":
        test_key = base64.urlsafe_b64encode(
            hashlib.sha256(b"medidesk-test-only-phi-key").digest()
        ).decode("ascii")
        return (test_key,)

    raw_keys = os.getenv("PHI_ENCRYPTION_KEYS", "").strip()
    key_file = os.getenv("PHI_ENCRYPTION_KEYS_FILE", "").strip()
    if key_file:
        if raw_keys:
            raise ValueError("Configure PHI_ENCRYPTION_KEYS or PHI_ENCRYPTION_KEYS_FILE, not both.")
        try:
            raw_keys = Path(key_file).read_text(encoding="utf-8").strip()
        except OSError:
            raise ValueError("PHI_ENCRYPTION_KEYS_FILE could not be read.") from None
    if not raw_keys:
        secret_seed = os.getenv("SECRET_KEY", "medidesk-dev-default-phi-fernet-key").encode("utf-8")
        fallback_key = base64.urlsafe_b64encode(hashlib.sha256(secret_seed).digest()).decode("ascii")
        return (fallback_key,)

    keys = tuple(key.strip() for key in raw_keys.split(",") if key.strip())
    try:
        from cryptography.fernet import Fernet

        for key in keys:
            Fernet(key.encode("ascii"))
    except (UnicodeEncodeError, ValueError, TypeError):
        raise ValueError("PHI_ENCRYPTION_KEYS must contain valid URL-safe Fernet keys.") from None
    if not keys:
        raise ValueError("PHI_ENCRYPTION_KEYS must contain at least one key.")
    return keys


def _database_uri(environment: str = "development") -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        try:
            parsed_url = make_url(database_url)
        except (ArgumentError, ValueError):
            raise ValueError("DATABASE_URL is invalid.") from None

        if parsed_url.drivername.startswith("sqlite"):
            if environment == "production":
                raise ValueError("SQLite is not supported in production.")
            return parsed_url.render_as_string(hide_password=False)

        if parsed_url.drivername == "mysql":
            parsed_url = parsed_url.set(drivername="mysql+pymysql")
        elif parsed_url.drivername != "mysql+pymysql":
            raise ValueError("DATABASE_URL must use MySQL with the PyMySQL driver.")
        if not all(
            (
                parsed_url.host,
                parsed_url.database,
                parsed_url.username,
                parsed_url.password,
            )
        ):
            raise ValueError(
                "DATABASE_URL must include a host, database, username, and password."
            )

        return parsed_url.render_as_string(hide_password=False)

    if environment == "development":
        mysql_pwd = os.getenv("MYSQL_PASSWORD", "")
        # Fallback to local SQLite when MySQL is not configured or still has placeholder
        if not mysql_pwd or "replace" in mysql_pwd.lower():
            return "sqlite:///medidesk.db"

    required_variables = (
        "MYSQL_HOST",
        "MYSQL_DATABASE",
        "MYSQL_USER",
        "MYSQL_PASSWORD",
    )
    missing_variables = [
        name for name in required_variables if not os.getenv(name, "").strip()
    ]
    if missing_variables:
        raise ValueError(
            "Missing required database environment variables: "
            + ", ".join(missing_variables)
        )

    try:
        port = int(os.getenv("MYSQL_PORT", "3306"))
    except ValueError:
        raise ValueError("MYSQL_PORT must be an integer.") from None
    if not 1 <= port <= 65535:
        raise ValueError("MYSQL_PORT must be between 1 and 65535.")

    url = URL.create(
        drivername="mysql+pymysql",
        username=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"],
        host=os.environ["MYSQL_HOST"],
        port=port,
        database=os.environ["MYSQL_DATABASE"],
    )
    return url.render_as_string(hide_password=False)


def _parse_origins(raw_origins: str, *, development: bool) -> list[str]:
    if not raw_origins.strip() and development:
        raw_origins = "http://localhost:3000"

    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",")]
    origins = [origin for origin in origins if origin]
    if not origins or any("*" in origin for origin in origins):
        raise ValueError("CORS_ALLOWED_ORIGINS must contain explicit origins.")

    for origin in origins:
        try:
            parsed_origin = urlsplit(origin)
            parsed_origin.port
        except ValueError:
            raise ValueError(
                "CORS_ALLOWED_ORIGINS contains an invalid origin."
            ) from None
        if (
            parsed_origin.scheme not in {"http", "https"}
            or not parsed_origin.hostname
            or parsed_origin.path
            or parsed_origin.query
            or parsed_origin.fragment
            or parsed_origin.username
            or parsed_origin.password
        ):
            raise ValueError("CORS_ALLOWED_ORIGINS contains an invalid origin.")
        if not development and parsed_origin.scheme != "https":
            raise ValueError("Production CORS origins must use HTTPS.")

    return origins


def _read_max_content_length() -> int:
    try:
        # Bound every request while allowing a 5 MiB attachment plus multipart framing.
        max_content_length = int(os.getenv("MAX_CONTENT_LENGTH", str(6 * 1024 * 1024)))
    except ValueError:
        raise ValueError("MAX_CONTENT_LENGTH must be an integer.") from None
    if max_content_length < 1:
        raise ValueError("MAX_CONTENT_LENGTH must be greater than zero.")
    return max_content_length


def get_config(config_name: str | None = None) -> dict[str, Any]:
    """Build configuration without logging or exposing secret values."""
    environment = (config_name or os.getenv("FLASK_ENV", "development")).lower()
    if environment not in {"development", "testing", "production"}:
        raise ValueError("FLASK_ENV must be development, testing, or production.")

    if environment == "testing":
        return {
            "ENVIRONMENT": environment,
            "DEBUG": False,
            "TESTING": True,
            "SECRET_KEY": "testing-only-not-a-production-secret",
            "JWT_SECRET_KEY": "",
            "PHI_ENCRYPTION_KEYS": _phi_encryption_keys(environment),
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "SQLALCHEMY_ENGINE_OPTIONS": {"pool_pre_ping": True},
            "CORS_ALLOWED_ORIGINS": ["http://localhost:3000"],
            "MAX_CONTENT_LENGTH": 6 * 1024 * 1024,
            "LOG_LEVEL": "WARNING",
            "SESSION_COOKIE_SECURE": False,
            "RATELIMIT_STORAGE_URI": "memory://",
            "AUTH_REGISTER_LIMIT": "5 per hour",
            "AUTH_LOGIN_LIMIT": "10 per hour",
        }

    is_development = environment == "development"
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    allowed_log_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
    if log_level not in allowed_log_levels:
        raise ValueError("LOG_LEVEL is invalid.")

    db_uri = _database_uri(environment)
    engine_options: dict[str, Any] = {"pool_pre_ping": True}
    if not db_uri.startswith("sqlite"):
        engine_options.update(
            {
                "pool_recycle": 1800,
                "connect_args": {"connect_timeout": 5},
            }
        )

    return {
        "ENVIRONMENT": environment,
        "DEBUG": is_development,
        "TESTING": False,
        "SECRET_KEY": os.getenv("SECRET_KEY", ""),
        "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY", ""),
        "PHI_ENCRYPTION_KEYS": _phi_encryption_keys(environment),
        "SQLALCHEMY_DATABASE_URI": db_uri,
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "SQLALCHEMY_ENGINE_OPTIONS": engine_options,
        "CORS_ALLOWED_ORIGINS": _parse_origins(
            os.getenv("CORS_ALLOWED_ORIGINS", ""),
            development=is_development,
        ),
        "MAX_CONTENT_LENGTH": _read_max_content_length(),
        "LOG_LEVEL": log_level,
        "SESSION_COOKIE_SECURE": environment == "production",
        "RATELIMIT_STORAGE_URI": os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
        "AUTH_REGISTER_LIMIT": os.getenv("AUTH_REGISTER_LIMIT", "5 per hour"),
        "AUTH_LOGIN_LIMIT": os.getenv("AUTH_LOGIN_LIMIT", "10 per hour"),
        "CLAMD_HOST": os.getenv("CLAMD_HOST", "clamav"),
        "CLAMD_PORT": int(os.getenv("CLAMD_PORT", "3310")),
        "CLAMD_TIMEOUT_SECONDS": int(os.getenv("CLAMD_TIMEOUT_SECONDS", "30")),
    }


def validate_config(config: Mapping[str, Any]) -> None:
    """Fail fast on weak secrets or invalid application configuration."""
    if config["ENVIRONMENT"] == "testing":
        return

    for name in ("SECRET_KEY", "JWT_SECRET_KEY"):
        value = config[name]
        lowered_value = value.lower()
        if (
            len(value) < 32
            or any(
                marker in lowered_value
                for marker in (
                    "replace",
                    "change",
                    "placeholder",
                    "example",
                    "your-",
                )
            )
        ):
            raise ValueError(
                f"{name} must be a generated secret of at least 32 characters."
            )

    if config["ENVIRONMENT"] == "production":
        if config["DEBUG"]:
            raise ValueError("Debug mode must be disabled in production.")
        for origin in config["CORS_ALLOWED_ORIGINS"]:
            if urlsplit(origin).scheme != "https":
                raise ValueError("Production CORS origins must use HTTPS.")
        if config["RATELIMIT_STORAGE_URI"].startswith("memory://"):
            raise ValueError("Production rate limiting requires shared persistent storage.")
        if not config.get("CLAMD_HOST"):
            raise ValueError("Production attachment uploads require a ClamAV host.")
    if not 1 <= int(config.get("CLAMD_PORT", 3310)) <= 65535:
        raise ValueError("CLAMD_PORT must be between 1 and 65535.")
    if not 1 <= int(config.get("CLAMD_TIMEOUT_SECONDS", 30)) <= 300:
        raise ValueError("CLAMD_TIMEOUT_SECONDS must be between 1 and 300.")
