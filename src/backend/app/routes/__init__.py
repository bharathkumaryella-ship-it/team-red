"""API route registration."""

from flask import Flask

from app.routes.health import health_bp
from app.routes.patients import patients_bp
from app.routes.doctors import doctors_bp
from app.routes.admin import admin_bp


def register_routes(app: Flask) -> None:
    app.register_blueprint(health_bp)
    app.register_blueprint(patients_bp)
    app.register_blueprint(doctors_bp)
    app.register_blueprint(admin_bp)
