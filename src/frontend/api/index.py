"""WSGI entry point for Vercel serverless deployment."""
from __future__ import annotations

import os
import sys

# Ensure src/backend is on the Python module search path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

alt_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "src", "backend"))
if os.path.exists(alt_backend_dir) and alt_backend_dir not in sys.path:
    sys.path.insert(0, alt_backend_dir)

from dotenv import dotenv_values, load_dotenv
from flask import Flask


def _create_app() -> Flask:
    environment = os.getenv("FLASK_ENV")
    if environment is None:
        environment = dotenv_values().get("FLASK_ENV") or "production"
        if environment.lower() == "development":
            load_dotenv(override=False)

    from app import create_app

    return create_app(config_name=environment)


app = _create_app()

if __name__ == "__main__":
    if app.config.get("ENVIRONMENT") != "production":
        app.run(host="127.0.0.1", port=5000, debug=app.config.get("DEBUG", False))
