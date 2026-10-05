"""WSGI entry point for Gunicorn and local development."""

from __future__ import annotations

import os

from dotenv import dotenv_values, load_dotenv
from flask import Flask


def _create_app() -> Flask:
    environment = os.getenv("FLASK_ENV")
    if environment is None:
        environment = dotenv_values().get("FLASK_ENV") or "development"
        if environment.lower() == "development":
            load_dotenv(override=False)

    from app import create_app

    return create_app(config_name=environment)


app = _create_app()


if __name__ == "__main__":
    if app.config["ENVIRONMENT"] == "production":
        raise RuntimeError("Use Gunicorn to run the application in production.")
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=app.config["DEBUG"],
    )
