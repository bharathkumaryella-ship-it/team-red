"""Authorization, validation, and account-management coverage for Phase 4."""

import pytest

from app import create_app
from app.extensions import db
from app.models import DoctorProfile, PatientProfile, User, UserRole


@pytest.fixture
def app():
    application = create_app("testing")
    with application.app_context():
        db.create_all()
        patient = _user("patient@example.test", "Patient One", UserRole.PATIENT)
        patient.patient_profile = PatientProfile(gender="OTHER", blood_group="O+")
        other = _user("other@example.test", "Patient Two", UserRole.PATIENT)
        other.patient_profile = PatientProfile()
        doctor = _user("doctor@example.test", "Doctor One", UserRole.DOCTOR)
        doctor.doctor_profile = DoctorProfile(
            specialization="Cardiology", license_number="LIC-001",
            experience_years=8, bio="Heart specialist",
        )
        admin = _user("admin@example.test", "Admin User", UserRole.ADMIN)
        db.session.add_all([patient, other, doctor, admin])
        db.session.commit()
        application.test_ids = {
            "patient": patient.id, "other": other.id,
            "doctor": doctor.id, "admin": admin.id,
        }
        yield application
        db.session.remove()
        db.drop_all()


def _user(email, name, role):
    user = User(email=email, full_name=name, role=role, is_active=True)
    user.set_password("SecurePassword123")
    return user


@pytest.fixture
def client(app):
    return app.test_client()


def login(client, email, password="SecurePassword123"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_patient_reads_and_updates_only_self_profile(client, app):
    assert login(client, "patient@example.test").status_code == 200
    result = client.get("/api/patients/me")
    assert result.status_code == 200
    assert result.json["data"]["email"] == "patient@example.test"
    assert "password_hash" not in result.json["data"]

    result = client.patch("/api/patients/me", json={
        "full_name": "Patient Updated", "phone": "+1 555 0101",
        "date_of_birth": "2002-01-01", "address": "New address",
    })
    assert result.status_code == 200
    assert result.json["data"]["full_name"] == "Patient Updated"
    assert result.json["data"]["date_of_birth"] == "2002-01-01"
    with app.app_context():
        assert db.session.get(User, app.test_ids["other"]).full_name == "Patient Two"


def test_patient_endpoints_require_patient_role(client):
    assert client.get("/api/patients/me").status_code == 401
    assert login(client, "doctor@example.test").status_code == 200
    assert client.get("/api/patients/me").status_code == 403
    assert client.patch("/api/patients/me", json={"is_active": False}).status_code == 403


def test_patient_cannot_address_another_patients_profile(client, app):
    login(client, "patient@example.test")
    response = client.get(f"/api/patients/{app.test_ids['other']}")
    assert response.status_code == 404


@pytest.mark.parametrize("field,value", [
    ("role", "ADMIN"), ("is_active", False), ("email", "attacker@example.test"),
    ("password_hash", "forged"), ("id", 99),
])
def test_patient_profile_rejects_protected_fields(client, field, value):
    login(client, "patient@example.test")
    assert client.patch("/api/patients/me", json={field: value}).status_code == 400


@pytest.mark.parametrize("payload", [
    {"date_of_birth": "2030-01-01"},
    {"date_of_birth": "yesterday"},
    {"date_of_birth": "20020101"},
    {"full_name": "x"},
    {"phone": "123"},
    {"address": "a" * 501},
    {"gender": "ATTACKER"},
    {"blood_group": "NOT-A-BLOOD-TYPE"},
])
def test_patient_profile_validation(client, payload):
    login(client, "patient@example.test")
    assert client.patch("/api/patients/me", json=payload).status_code == 400


def test_patient_cannot_access_admin_management(client):
    login(client, "patient@example.test")
    assert client.get("/api/admin/patients").status_code == 403
    assert client.get("/api/admin/doctors").status_code == 403


def test_untrusted_origin_cannot_mutate_patient_profile(client):
    login(client, "patient@example.test")
    response = client.patch(
        "/api/patients/me", json={"full_name": "Changed"},
        headers={"Origin": "https://attacker.example"},
    )
    assert response.status_code == 403


def test_doctor_reads_updates_own_profile_and_cannot_change_license(client):
    login(client, "doctor@example.test")
    result = client.get("/api/doctors/me")
    assert result.status_code == 200
    assert result.json["data"]["license_number"] == "LIC-001"
    result = client.patch("/api/doctors/me", json={
        "full_name": "Doctor Updated", "specialization": "Neurology",
        "experience_years": 12, "bio": "Updated bio",
    })
    assert result.status_code == 200
    assert result.json["data"]["specialization"] == "Neurology"
    assert client.patch("/api/doctors/me", json={"license_number": "FORGED"}).status_code == 400
    assert client.patch("/api/doctors/me", json={"role": "ADMIN"}).status_code == 400


@pytest.mark.parametrize("payload", [
    {"experience_years": -1}, {"experience_years": 81},
    {"experience_years": True}, {"specialization": " "}, {"bio": "x" * 2001},
])
def test_doctor_update_validation(client, payload):
    login(client, "doctor@example.test")
    assert client.patch("/api/doctors/me", json=payload).status_code == 400


def test_doctor_does_not_get_patient_or_admin_access(client):
    login(client, "doctor@example.test")
    assert client.get("/api/patients/me").status_code == 403
    assert client.get("/api/admin/patients").status_code == 403


def test_patient_directory_returns_only_safe_active_doctor_fields(client, app):
    login(client, "patient@example.test")
    result = client.get("/api/doctors?search=Cardio&page=1&limit=10")
    assert result.status_code == 200
    assert len(result.json["data"]) == 1
    data = result.json["data"][0]
    assert data["specialization"] == "Cardiology"
    assert "email" not in data and "license_number" not in data and "is_active" not in data
    with app.app_context():
        db.session.get(User, app.test_ids["doctor"]).is_active = False
        db.session.commit()
    assert client.get("/api/doctors").json["data"] == []


def test_doctor_directory_is_patient_only_and_handles_missing_ids(client):
    assert client.get("/api/doctors").status_code == 401
    login(client, "doctor@example.test")
    assert client.get("/api/doctors").status_code == 403
    login(client, "patient@example.test")
    assert client.get("/api/doctors/999999").status_code == 404


def test_admin_patient_list_detail_pagination_search_and_status(client, app):
    login(client, "admin@example.test")
    result = client.get("/api/admin/patients?search=%27%20OR%201%3D1&page=1&limit=1")
    assert result.status_code == 200
    assert result.json["pagination"]["limit"] == 1
    assert result.json["pagination"]["total"] == 0
    assert client.get("/api/admin/patients?limit=101").status_code == 400
    assert client.get("/api/admin/patients?page=-1").status_code == 400
    assert client.get("/api/admin/patients?page=1000001").status_code == 400

    patient_id = app.test_ids["patient"]
    assert client.get(f"/api/admin/patients/{patient_id}").json["data"]["email"] == "patient@example.test"
    result = client.patch(f"/api/admin/patients/{patient_id}/status", json={"is_active": False})
    assert result.status_code == 200 and result.json["data"]["is_active"] is False
    assert client.get("/api/auth/me").status_code == 200  # the admin session remains active


def test_inactive_user_cannot_use_protected_api(client, app):
    login(client, "patient@example.test")
    with app.app_context():
        db.session.get(User, app.test_ids["patient"]).is_active = False
        db.session.commit()
        assert db.session.get(User, app.test_ids["patient"]).is_active is False
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/patients/me").status_code == 401


def test_admin_creates_doctor_with_forced_role_and_argon_hash(client, app):
    login(client, "admin@example.test")
    response = client.post("/api/admin/doctors", json={
        "full_name": "New Doctor", "email": "newdoctor@example.test",
        "password": "InitialSecure123", "specialization": "Dermatology",
        "license_number": "LIC-NEW", "experience_years": 4,
        "role": "ADMIN",
    })
    assert response.status_code == 400  # role is an unexpected field
    response = client.post("/api/admin/doctors", json={
        "full_name": "New Doctor", "email": "newdoctor@example.test",
        "password": "InitialSecure123", "specialization": "Dermatology",
        "license_number": "LIC-NEW", "experience_years": 4,
    })
    assert response.status_code == 201
    assert "password_hash" not in response.json["data"]
    with app.app_context():
        user = User.query.filter_by(email="newdoctor@example.test").one()
        assert user.role == UserRole.DOCTOR
        assert user.password_hash.startswith("$argon2id$")


def test_admin_doctor_management_duplicate_update_status_and_pagination(client, app):
    login(client, "admin@example.test")
    assert client.get("/api/admin/doctors?search=%27%20OR%20%271%27%3D%271").status_code == 200
    assert client.get("/api/admin/doctors?limit=1000").status_code == 400
    duplicate = client.post("/api/admin/doctors", json={
        "full_name": "Duplicate", "email": "new@example.test",
        "password": "InitialSecure123", "specialization": "General",
        "license_number": "LIC-001",
    })
    assert duplicate.status_code == 409
    doctor_id = app.test_ids["doctor"]
    changed = client.patch(f"/api/admin/doctors/{doctor_id}", json={"specialization": "Family Medicine"})
    assert changed.status_code == 200
    assert changed.json["data"]["specialization"] == "Family Medicine"
    assert client.patch(f"/api/admin/doctors/{doctor_id}", json={"role": "ADMIN"}).status_code == 400
    status = client.patch(f"/api/admin/doctors/{doctor_id}/status", json={"is_active": False})
    assert status.status_code == 200
    reactivated = client.patch(f"/api/admin/doctors/{doctor_id}/status", json={"is_active": True})
    assert reactivated.status_code == 200 and reactivated.json["data"]["is_active"] is True


def test_admin_endpoints_require_admin_and_bad_ids_are_safe(client):
    assert client.get("/api/admin/patients").status_code == 401
    login(client, "patient@example.test")
    assert client.post("/api/admin/doctors", json={}).status_code == 403
    login(client, "admin@example.test")
    assert client.get("/api/admin/patients/999999").status_code == 404
    assert client.get("/api/admin/doctors/999999").status_code == 404
