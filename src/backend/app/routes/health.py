"""Non-sensitive application liveness endpoint."""

from flask import Blueprint, Response, jsonify

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health() -> Response:
    return jsonify(status="ok", service="medidesk-backend")
