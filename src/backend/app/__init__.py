"""Application factory and Flask extension registration."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from flask import Flask, session
from flask_cors import CORS
from flask_migrate import Migrate

from app.config import get_config, validate_config
from app.extensions import db
from app.middleware.errors import register_error_handlers
from app.middleware.security_headers import register_security_headers
from app.routes import register_routes
from app.utils.logging_config import configure_logging
from app.auth import limiter, auth_bp


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

    with app.app_context():
        from app import models  # noqa: F401
    return app
