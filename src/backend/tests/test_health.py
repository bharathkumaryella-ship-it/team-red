"""Tests for the public health endpoint and API security baseline."""

import pytest
from app import create_app
from app.config import get_config


def test_health_returns_only_expected_service_status():
    app = create_app("testing")

    response = app.test_client().get(
        "/api/health",
        headers={"Origin": "http://localhost:3000"},
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "status": "ok",
        "service": "medidesk-backend",
    }
    assert b"SQLALCHEMY_DATABASE_URI" not in response.data
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_unknown_route_returns_generic_json_error():
    response = create_app("testing").test_client().get("/api/internal")

    assert response.status_code == 404
    assert response.get_json() == {
        "error": {
            "code": "NOT_FOUND",
            "message": "The requested resource was not found.",
        }
    }


def test_unexpected_error_returns_generic_json_without_exception_details():
    app = create_app("testing")

    @app.get("/api/failure")
    def fail_request():
        raise RuntimeError("sensitive internal detail")

    response = app.test_client().get("/api/failure")

    assert response.status_code == 500
    assert response.get_json() == {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred.",
        }
    }
    assert b"sensitive internal detail" not in response.data


def test_development_cors_rejects_wildcard_origins(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://*.example.com")
    monkeypatch.setenv(
        "DATABASE_URL",
        "mysql+pymysql://test-user:test-password@localhost/test-db",
    )

    with pytest.raises(ValueError, match="explicit origins"):
        get_config("development")


def test_production_config_disables_debug_and_requires_https_origins(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "mysql+pymysql://test-user:test-password@localhost/test-db",
    )
    monkeypatch.setenv("SECRET_KEY", "s" * 48)
    monkeypatch.setenv("JWT_SECRET_KEY", "j" * 48)
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://clinic.example.com")

    app = create_app("production")
    config = app.config

    assert config["DEBUG"] is False
    assert config["CORS_ALLOWED_ORIGINS"] == ["https://clinic.example.com"]
    response = app.test_client().get(
        "/api/health",
        headers={"Origin": "https://clinic.example.com"},
    )
    assert (
        response.headers["Access-Control-Allow-Origin"]
        == "https://clinic.example.com"
    )
    assert "Strict-Transport-Security" in response.headers


def test_production_config_rejects_placeholder_secrets(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "mysql+pymysql://test-user:test-password@localhost/test-db",
    )
    placeholder_secret = "replace-with-a-generated-secret-of-more-than-32-chars"
    monkeypatch.setenv("SECRET_KEY", placeholder_secret)
    monkeypatch.setenv("JWT_SECRET_KEY", "j" * 48)
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://clinic.example.com")

    with pytest.raises(ValueError, match="SECRET_KEY"):
        create_app("production")
