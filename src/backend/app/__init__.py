"""Application factory and Flask extension registration."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from app.config import get_config, validate_config
from app.extensions import db
from app.middleware.errors import register_error_handlers
from app.middleware.security_headers import register_security_headers
from app.routes import register_routes
from app.utils.logging_config import configure_logging


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
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["CORS_ALLOWED_ORIGINS"],
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type"],
                "supports_credentials": False,
                "max_age": 600,
            }
        },
    )
    register_error_handlers(app)
    register_security_headers(app)
    register_routes(app)

    with app.app_context():
        from app import models  # noqa: F401
    
    return app
