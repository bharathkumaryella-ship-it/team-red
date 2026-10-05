"""Focused Phase 7 regression tests for defensive controls."""

from app import create_app
from app.extensions import db
from app.models import PatientProfile, User, UserRole


def _user(email: str, role: UserRole) -> User:
    user = User(email=email, full_name=email.split("@")[0], role=role, is_active=True)
    user.set_password("SecurePassword123")
    if role is UserRole.PATIENT:
        user.patient_profile = PatientProfile()
    return user


def test_security_headers_and_cors_are_explicit():
    app = create_app("testing")
    client = app.test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]
    assert response.headers["Referrer-Policy"] == "no-referrer"


def test_role_boundary_and_idor_are_denied():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        patient_a = _user("a@example.test", UserRole.PATIENT)
        patient_b = _user("b@example.test", UserRole.PATIENT)
        admin = _user("admin@example.test", UserRole.ADMIN)
        db.session.add_all([patient_a, patient_b, admin])
        db.session.commit()
        patient_b_id = patient_b.id

    client = app.test_client()
    client.post("/api/auth/login", json={"email": "a@example.test", "password": "SecurePassword123"})
    assert client.get("/api/admin/patients").status_code == 403
    assert client.get(f"/api/patients/{patient_b_id}").status_code == 404

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_untrusted_origin_cannot_change_cookie_authenticated_state():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        patient = _user("patient@example.test", UserRole.PATIENT)
        db.session.add(patient)
        db.session.commit()

    client = app.test_client()
    client.post("/api/auth/login", json={"email": "patient@example.test", "password": "SecurePassword123"})
    response = client.patch(
        "/api/patients/me",
        json={"full_name": "Attacker"},
        headers={"Origin": "https://attacker.example"},
    )
    assert response.status_code == 403

    with app.app_context():
        db.session.remove()
        db.drop_all()
