"""Environment-based configuration for development, testing, and production."""

from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlsplit

from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


def _database_uri() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        try:
            parsed_url = make_url(database_url)
        except (ArgumentError, ValueError):
            raise ValueError("DATABASE_URL is invalid.") from None

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
        max_content_length = int(os.getenv("MAX_CONTENT_LENGTH", "1048576"))
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
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "SQLALCHEMY_ENGINE_OPTIONS": {"pool_pre_ping": True},
            "CORS_ALLOWED_ORIGINS": ["http://localhost:3000"],
            "MAX_CONTENT_LENGTH": 1024 * 1024,
            "LOG_LEVEL": "WARNING",
        }

    is_development = environment == "development"
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    allowed_log_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
    if log_level not in allowed_log_levels:
        raise ValueError("LOG_LEVEL is invalid.")

    return {
        "ENVIRONMENT": environment,
        "DEBUG": is_development,
        "TESTING": False,
        "SECRET_KEY": os.getenv("SECRET_KEY", ""),
        "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY", ""),
        "SQLALCHEMY_DATABASE_URI": _database_uri(),
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "SQLALCHEMY_ENGINE_OPTIONS": {
            "pool_pre_ping": True,
            "pool_recycle": 1800,
            "connect_args": {"connect_timeout": 5},
        },
        "CORS_ALLOWED_ORIGINS": _parse_origins(
            os.getenv("CORS_ALLOWED_ORIGINS", ""),
            development=is_development,
        ),
        "MAX_CONTENT_LENGTH": _read_max_content_length(),
        "LOG_LEVEL": log_level,
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
