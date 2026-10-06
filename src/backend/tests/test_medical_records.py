"""Authorization, validation, and audit tests for clinical records."""

from datetime import datetime, timedelta

import pytest

from app import create_app
from app.extensions import db
from app.models import Appointment, AppointmentStatus, DoctorProfile, MedicalRecord, PatientProfile, User, UserRole


@pytest.fixture
def app():
    application = create_app("testing")
    with application.app_context():
        db.create_all()
        patient = _user("patient@example.test", "Patient One", UserRole.PATIENT)
        patient.patient_profile = PatientProfile()
        other_patient = _user("other@example.test", "Patient Two", UserRole.PATIENT)
        other_patient.patient_profile = PatientProfile()
        doctor = _user("doctor@example.test", "Doctor One", UserRole.DOCTOR)
        doctor.doctor_profile = DoctorProfile(specialization="Cardiology", license_number="LIC-1")
        other_doctor = _user("otherdoctor@example.test", "Doctor Two", UserRole.DOCTOR)
        other_doctor.doctor_profile = DoctorProfile(specialization="Neurology", license_number="LIC-2")
        admin = _user("admin@example.test", "Admin User", UserRole.ADMIN)
        db.session.add_all([patient, other_patient, doctor, other_doctor, admin])
        db.session.commit()
        completed = _appointment(patient, doctor, AppointmentStatus.COMPLETED)
        other_completed = _appointment(other_patient, other_doctor, AppointmentStatus.COMPLETED)
        pending = _appointment(patient, doctor, AppointmentStatus.PENDING)
        legacy = MedicalRecord(patient_id=patient.id, doctor_id=doctor.id, appointment_id=None, diagnosis="Legacy")
        other_record = MedicalRecord(patient_id=other_patient.id, doctor_id=other_doctor.id, appointment_id=other_completed.id, diagnosis="Other")
        db.session.add_all([legacy, other_record])
        db.session.commit()
        application.test_ids = {"patient": patient.id, "other_patient": other_patient.id, "doctor": doctor.id,
                                "other_doctor": other_doctor.id, "admin": admin.id, "completed": completed.id,
                                "other_completed": other_completed.id, "pending": pending.id, "other_record": other_record.id,
                                "legacy": legacy.id}
        yield application
        db.session.remove()
        db.drop_all()


def _user(email, name, role):
    user = User(email=email, full_name=name, role=role, is_active=True)
    user.set_password("SecurePassword123")
    return user


def _appointment(patient, doctor, status):
    start = datetime.utcnow() - timedelta(days=2)
    item = Appointment(patient_id=patient.id, doctor_id=doctor.id, start_at=start,
                       end_at=start + timedelta(minutes=30), status=status)
    db.session.add(item)
    db.session.flush()
    return item


@pytest.fixture
def client(app):
    return app.test_client()


def login(client, email):
    response = client.post("/api/auth/login", json={"email": email, "password": "SecurePassword123"})
    assert response.status_code == 200


def test_create_derives_patient_and_doctor_from_completed_appointment(client, app):
    assert client.post("/api/medical-records", json={}).status_code == 401
    login(client, "doctor@example.test")
    response = client.post("/api/medical-records", json={"appointment_id": app.test_ids["completed"], "diagnosis": "  Migraine  ", "notes": "Rest", "prescription": "RX-1"})
    assert response.status_code == 201
    assert response.json["data"]["diagnosis"] == "Migraine"
    assert "email" not in response.json["data"]["patient"]
    with app.app_context():
        record = db.session.get(MedicalRecord, response.json["data"]["id"])
        assert record.patient_id == app.test_ids["patient"] and record.doctor_id == app.test_ids["doctor"]
        assert record.appointment_id == app.test_ids["completed"]


def test_create_preserves_patient_age_and_weight_snapshot(client, app):
    login(client, "doctor@example.test")
    response = client.post("/api/medical-records", json={
        "appointment_id": app.test_ids["completed"],
        "diagnosis": "Routine check",
        "patient_age": 33,
        "weight_kg": 68.4,
    })
    assert response.status_code == 201
    assert response.json["data"]["patient"]["age"] == 33
    assert response.json["data"]["patient_age"] == 33
    assert response.json["data"]["weight_kg"] == 68.4

    with app.app_context():
        record = db.session.get(MedicalRecord, response.json["data"]["id"])
        assert int(record.patient_age) == 33
        assert float(record.weight_kg) == 68.4

    client.post("/api/auth/logout")
    login(client, "patient@example.test")
    patient_records = client.get("/api/patients/me/medical-records")
    saved = next(item for item in patient_records.json["data"] if item["id"] == response.json["data"]["id"])
    assert saved["patient_age"] == 33
    assert saved["weight_kg"] == 68.4


@pytest.mark.parametrize("email", ["patient@example.test", "admin@example.test"])
def test_only_doctor_can_create(client, app, email):
    login(client, email)
    assert client.post("/api/medical-records", json={"appointment_id": app.test_ids["completed"], "diagnosis": "Private"}).status_code == 403


def test_create_requires_assigned_completed_appointment_and_prevents_duplicates(client, app):
    login(client, "doctor@example.test")
    payload = {"appointment_id": app.test_ids["pending"], "diagnosis": "Finding"}
    assert client.post("/api/medical-records", json=payload).status_code == 409
    payload["appointment_id"] = app.test_ids["other_completed"]
    assert client.post("/api/medical-records", json=payload).status_code == 404
    payload["appointment_id"] = app.test_ids["completed"]
    assert client.post("/api/medical-records", json=payload).status_code == 201
    assert client.post("/api/medical-records", json=payload).status_code == 409


@pytest.mark.parametrize("payload", [
    {"appointment_id": True, "diagnosis": "x"}, {"appointment_id": 1, "diagnosis": " "},
    {"appointment_id": 1, "diagnosis": "x", "patient_id": 55},
    {"appointment_id": 1, "diagnosis": "x", "doctor_id": 55},
    {"appointment_id": 1, "diagnosis": "x", "notes": []},
    {"appointment_id": 1, "diagnosis": "x" * 2001},
    {"appointment_id": 1, "diagnosis": "x", "patient_age": True},
    {"appointment_id": 1, "diagnosis": "x", "patient_age": 131},
    {"appointment_id": 1, "diagnosis": "x", "weight_kg": False},
    {"appointment_id": 1, "diagnosis": "x", "weight_kg": 500.1},
])
def test_create_validates_input_and_rejects_mass_assignment(client, payload):
    login(client, "doctor@example.test")
    assert client.post("/api/medical-records", json=payload).status_code == 400


def test_patient_list_and_detail_are_ownership_scoped(client, app):
    login(client, "doctor@example.test")
    own = client.post("/api/medical-records", json={"appointment_id": app.test_ids["completed"], "diagnosis": "Private result"})
    assert own.status_code == 201
    client.post("/api/auth/logout")
    login(client, "patient@example.test")
    listing = client.get("/api/patients/me/medical-records")
    assert listing.status_code == 200 and len(listing.json["data"]) == 2
    assert client.get("/api/patients/me/medical-records?patient_id=2").status_code == 400
    assert client.get(f"/api/medical-records/{app.test_ids['other_record']}").status_code == 404
    client.post("/api/auth/logout")
    login(client, "other@example.test")
    assert client.get(f"/api/medical-records/{own.json['data']['id']}").status_code == 404


def test_doctor_scope_requires_the_assigned_appointment_and_update_allowlist(client, app):
    login(client, "doctor@example.test")
    created = client.post("/api/medical-records", json={"appointment_id": app.test_ids["completed"], "diagnosis": "Original"})
    record_id = created.json["data"]["id"]
    listing = client.get("/api/doctor/medical-records")
    assert listing.status_code == 200 and len(listing.json["data"]) == 1
    assert client.get(f"/api/doctor/medical-records/{app.test_ids['other_record']}").status_code == 404
    assert client.get(f"/api/doctor/medical-records/{app.test_ids['legacy']}").status_code == 404
    updated = client.patch(f"/api/doctor/medical-records/{record_id}", json={"diagnosis": "Updated", "patient_id": 99})
    assert updated.status_code == 400
    updated = client.patch(f"/api/doctor/medical-records/{record_id}", json={"diagnosis": "<script>alert(1)</script>"})
    assert updated.status_code == 200 and updated.json["data"]["diagnosis"] == "<script>alert(1)</script>"
    assert client.delete(f"/api/doctor/medical-records/{record_id}").status_code == 405


def test_clinical_content_is_not_written_to_audit_log(client, app, caplog):
    caplog.set_level("INFO", logger="medical_records")
    login(client, "doctor@example.test")
    secret_text = "unique-clinical-value-98431"
    response = client.post("/api/medical-records", json={"appointment_id": app.test_ids["completed"], "diagnosis": secret_text})
    assert response.status_code == 201
    assert "medical_record create" in caplog.text
    assert secret_text not in caplog.text
