"""API route registration."""

from flask import Flask

from app.routes.health import health_bp
from app.routes.patients import patients_bp
from app.routes.doctors import doctors_bp
from app.routes.admin import admin_bp
from app.routes.appointments import appointments_bp
from app.routes.doctor_appointments import doctor_appointments_bp
from app.routes.admin_appointments import admin_appointments_bp
from app.routes.medical_records import medical_records_bp


def register_routes(app: Flask) -> None:
    app.register_blueprint(health_bp)
    app.register_blueprint(patients_bp)
    app.register_blueprint(doctors_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(doctor_appointments_bp)
    app.register_blueprint(admin_appointments_bp)
    app.register_blueprint(medical_records_bp)
