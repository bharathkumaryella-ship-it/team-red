"""Application factory and Flask extension registration."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from urllib.parse import urlsplit

from flask import Flask, session, request, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from sqlalchemy import inspect

from app.config import get_config, validate_config
from app.extensions import db
from app.middleware.errors import register_error_handlers
from app.middleware.security_headers import register_security_headers
from app.routes import register_routes
from app.utils.logging_config import configure_logging
from app.auth import limiter, auth_bp


def _normalized_origin(value: str, *, allow_path: bool = False) -> str | None:
    """Parse an Origin or Referer into its canonical scheme/host/port origin."""
    try:
        parsed = urlsplit(value)
        if (
            parsed.scheme.lower() not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or (not allow_path and (parsed.path or parsed.query or parsed.fragment))
        ):
            return None
        hostname = parsed.hostname.lower()
        if ":" in hostname:
            hostname = f"[{hostname}]"
        port = parsed.port
        default_port = 443 if parsed.scheme.lower() == "https" else 80
        netloc = hostname if port is None or port == default_port else f"{hostname}:{port}"
        return f"{parsed.scheme.lower()}://{netloc}"
    except ValueError:
        return None


def create_app(
    config_name: str | None = None,
    config_overrides: Mapping[str, Any] | None = None,
) -> Flask:
    """Create and configure a Flask application instance."""
    app = Flask(__name__)
    app.config.from_mapping(get_config(config_name))

    if config_overrides:
        app.config.from_mapping(config_overrides)

    validate_config(app.config)
    configure_logging(app)
    db.init_app(app)
    Migrate(app, db)
    app.config.setdefault(
        "SESSION_COOKIE_SECURE", app.config["ENVIRONMENT"] == "production"
    )
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["PERMANENT_SESSION_LIFETIME"] = 86400
    limiter.init_app(app)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["CORS_ALLOWED_ORIGINS"],
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type"],
                "supports_credentials": True,
                "max_age": 600,
            }
        },
    )
    register_error_handlers(app)
    register_security_headers(app)
    register_routes(app)
    app.register_blueprint(auth_bp)

    @app.before_request
    def load_user_from_session():
        """Expose only the session user identifier to authentication helpers."""
        if "user_id" in session:
            from flask import g

            g.user_id = session.get("user_id")
            g.session_token_version = session.get("token_version")

    @app.before_request
    def enforce_trusted_mutation_origin():
        """Block cross-origin browser writes to every cookie-authenticated API."""
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = request.headers.get("Origin")
            referer = request.headers.get("Referer")
            trusted_origins = {
                normalized
                for allowed in app.config["CORS_ALLOWED_ORIGINS"]
                if (normalized := _normalized_origin(allowed)) is not None
            }
            request_origin = _normalized_origin(origin) if origin else None
            if not origin and referer:
                request_origin = _normalized_origin(referer, allow_path=True)
            if (origin or referer) and not request_origin:
                return jsonify(error={
                    "code": "ORIGIN_NOT_ALLOWED",
                    "message": "The request origin is not allowed.",
                }), 403
            if request_origin and request_origin not in trusted_origins:
                return jsonify(error={
                    "code": "ORIGIN_NOT_ALLOWED",
                    "message": "The request origin is not allowed.",
                }), 403
            if (
                app.config["ENVIRONMENT"] == "production"
                and session.get("user_id") is not None
                and not request_origin
            ):
                return jsonify(error={
                    "code": "ORIGIN_REQUIRED",
                    "message": "A trusted request origin is required.",
                }), 403

    with app.app_context():
        from app import models  # noqa: F401
        if app.config["ENVIRONMENT"] == "development":
            try:
                from flask_migrate import stamp, upgrade

                tables = set(inspect(db.engine).get_table_names())
                baseline_tables = {
                    "users",
                    "patient_profiles",
                    "doctor_profiles",
                    "appointments",
                    "medical_records",
                }
                if "alembic_version" not in tables and baseline_tables.issubset(tables):
                    # Older development databases were created with create_all().
                    stamp(revision="9c27f4d8a611")
                upgrade()
                from app.models import User
                if User.query.first() is None:
                    from app.seeds import seed_development_data
                    seed_development_data()
            except Exception as e:
                app.logger.error(
                    "Development database migration or initialization failed; refusing startup (%s)",
                    type(e).__name__,
                )
                raise
    return app
