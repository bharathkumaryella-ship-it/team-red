"""Appointment business rules, role boundaries, and unsafe-input regression tests."""

from datetime import UTC, datetime, timedelta

import pytest

from app import create_app
from app.extensions import db
from app.models import Appointment, AppointmentStatus, DoctorProfile, PatientProfile, User, UserRole


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
        inactive_doctor = _user("inactive@example.test", "Inactive Doctor", UserRole.DOCTOR, active=False)
        inactive_doctor.doctor_profile = DoctorProfile(specialization="Dermatology", license_number="LIC-3")
        admin = _user("admin@example.test", "Admin", UserRole.ADMIN)
        db.session.add_all([patient, other_patient, doctor, other_doctor, inactive_doctor, admin])
        db.session.commit()
        application.test_ids = {"patient": patient.id, "other_patient": other_patient.id, "doctor": doctor.id,
                                "other_doctor": other_doctor.id, "inactive_doctor": inactive_doctor.id, "admin": admin.id}
        yield application
        db.session.remove()
        db.drop_all()


def _user(email, name, role, active=True):
    user = User(email=email, full_name=name, role=role, is_active=active)
    user.set_password("SecurePassword123")
    return user


@pytest.fixture
def client(app):
    return app.test_client()


def login(client, email):
    response = client.post("/api/auth/login", json={"email": email, "password": "SecurePassword123"})
    assert response.status_code == 200


def times(start_delta=timedelta(days=2), duration=timedelta(minutes=30)):
    start = (datetime.now(UTC) + start_delta).replace(microsecond=0)
    end = start + duration
    return start.isoformat().replace("+00:00", "Z"), end.isoformat().replace("+00:00", "Z")


def create_payload(app, **updates):
    start, end = times()
    payload = {"doctor_id": app.test_ids["doctor"], "start_at": start, "end_at": end, "reason": "General consultation"}
    return {**payload, **updates}


def create(client, app, **updates):
    return client.post("/api/appointments", json=create_payload(app, **updates))


def add_appointment(app, *, patient_key="patient", doctor_key="doctor", status=AppointmentStatus.PENDING, start_delta=timedelta(days=2), duration=timedelta(minutes=30)):
    with app.app_context():
        start = datetime.now(UTC).replace(tzinfo=None, microsecond=0) + start_delta
        item = Appointment(patient_id=app.test_ids[patient_key], doctor_id=app.test_ids[doctor_key], start_at=start,
                           end_at=start + duration, status=status, reason="General consultation")
        db.session.add(item)
        db.session.commit()
        return item.id


def test_patient_creates_pending_appointment_derived_from_session(client, app):
    login(client, "patient@example.test")
    response = create(client, app)
    assert response.status_code == 201
    assert response.json["data"]["status"] == "PENDING"
    with app.app_context():
        item = db.session.get(Appointment, response.json["data"]["id"])
        assert item.patient_id == app.test_ids["patient"]
        assert item.status == AppointmentStatus.PENDING
        assert item.start_at.tzinfo is None  # stored UTC-naive for MySQL DATETIME


def test_booking_to_doctor_confirmation_and_completion_workflow(client, app):
    login(client, "patient@example.test")
    created = create(client, app)
    assert created.status_code == 201
    appointment_id = created.json["data"]["id"]
    assert client.get("/api/appointments/my").json["data"][0]["status"] == "PENDING"
    assert client.get(f"/api/appointments/{appointment_id}").status_code == 200

    client.post("/api/auth/logout")
    login(client, "doctor@example.test")
    assert client.get("/api/doctor/appointments").json["data"][0]["id"] == appointment_id
    confirmed = client.post(f"/api/doctor/appointments/{appointment_id}/confirm", json={})
    assert confirmed.status_code == 200 and confirmed.json["data"]["status"] == "CONFIRMED"
    with app.app_context():
        item = db.session.get(Appointment, appointment_id)
        item.start_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1)
        item.end_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=5)
        db.session.commit()
    completed = client.post(f"/api/doctor/appointments/{appointment_id}/complete", json={})
    assert completed.status_code == 200 and completed.json["data"]["status"] == "COMPLETED"

    client.post("/api/auth/logout")
    login(client, "patient@example.test")
    assert client.get(f"/api/appointments/{appointment_id}").json["data"]["status"] == "COMPLETED"


def test_create_requires_authentication_and_patient_role(client, app):
    assert create(client, app).status_code == 401
    login(client, "doctor@example.test")
    assert create(client, app).status_code == 403
    client.post("/api/auth/logout")
    login(client, "admin@example.test")
    assert create(client, app).status_code == 403


def test_create_rejects_missing_inactive_or_invalid_doctor(client, app):
    login(client, "patient@example.test")
    assert create(client, app, doctor_id=987654).status_code == 404
    assert create(client, app, doctor_id=app.test_ids["inactive_doctor"]).status_code == 404
    assert create(client, app, doctor_id=-1).status_code == 400


@pytest.mark.parametrize("fields", [
    {"start_at": "tomorrow"}, {"start_at": "2030-01-01T10:00:00"},
    {"end_at": "2020-01-01T10:00:00Z"}, {"reason": ""}, {"reason": "x" * 501},
    {"patient_id": 999}, {"status": "COMPLETED"}, {"created_at": "2020-01-01T00:00:00Z"},
])
def test_create_rejects_invalid_fields_and_mass_assignment(client, app, fields):
    login(client, "patient@example.test")
    assert create(client, app, **fields).status_code == 400


def test_create_rejects_past_start_and_invalid_or_unreasonable_duration(client, app):
    login(client, "patient@example.test")
    start = (datetime.now(UTC) - timedelta(days=1)).replace(microsecond=0)
    past = {"doctor_id": app.test_ids["doctor"], "start_at": start.isoformat(), "end_at": (start + timedelta(minutes=30)).isoformat(), "reason": "Checkup"}
    assert client.post("/api/appointments", json=past).status_code == 400
    assert create(client, app, end_at=create_payload(app)["start_at"]).status_code == 400
    long_start, long_end = times(duration=timedelta(hours=5))
    assert create(client, app, start_at=long_start, end_at=long_end).status_code == 400


def test_overlap_is_rejected_and_adjacent_slot_is_allowed(client, app):
    login(client, "patient@example.test")
    start, end = times()
    assert client.post("/api/appointments", json=create_payload(app, start_at=start, end_at=end)).status_code == 201
    overlap_start = (datetime.fromisoformat(start.replace("Z", "+00:00")) + timedelta(minutes=15)).isoformat()
    overlap_end = (datetime.fromisoformat(end.replace("Z", "+00:00")) + timedelta(minutes=15)).isoformat()
    assert client.post("/api/appointments", json=create_payload(app, start_at=overlap_start, end_at=overlap_end)).status_code == 409
    assert client.post("/api/appointments", json=create_payload(app, start_at=end, end_at=(datetime.fromisoformat(end.replace("Z", "+00:00")) + timedelta(minutes=30)).isoformat())).status_code == 201


def test_availability_checks_authenticated_patient_slots(client, app):
    login(client, "patient@example.test")
    start, end = times()
    params = {"doctor_id": app.test_ids["doctor"], "start_at": start, "end_at": end}
    assert client.get("/api/appointments/availability", query_string=params).json["data"]["available"] is True
    assert client.post("/api/appointments", json=create_payload(app, start_at=start, end_at=end)).status_code == 201
    assert client.get("/api/appointments/availability", query_string=params).json["data"]["available"] is False
    assert client.get("/api/appointments/availability?doctor_id=1").status_code == 400


def test_cancelled_appointment_does_not_block_availability(client, app):
    login(client, "patient@example.test")
    start, end = times()
    created = client.post("/api/appointments", json=create_payload(app, start_at=start, end_at=end))
    assert client.post(f"/api/appointments/{created.json['data']['id']}/cancel", json={}).status_code == 200
    assert client.post("/api/appointments", json=create_payload(app, start_at=start, end_at=end)).status_code == 201


def test_patient_list_is_owned_filtered_paginated_and_history_supported(client, app):
    add_appointment(app)
    add_appointment(app, patient_key="other_patient")
    login(client, "patient@example.test")
    response = client.get("/api/appointments/my?period=upcoming&page=1&limit=1")
    assert response.status_code == 200 and response.json["pagination"]["total"] == 1
    assert len(response.json["data"]) == 1
    assert "password_hash" not in str(response.json)
    assert client.get("/api/appointments/my?patient_id=2").status_code == 400


def test_patient_cannot_view_or_cancel_another_patients_appointment(client, app):
    other_id = add_appointment(app, patient_key="other_patient")
    login(client, "patient@example.test")
    assert client.get(f"/api/appointments/{other_id}").status_code == 404
    assert client.post(f"/api/appointments/{other_id}/cancel", json={}).status_code == 404


def test_appointment_routes_reject_negative_and_out_of_range_ids(client):
    login(client, "patient@example.test")
    assert client.get("/api/appointments/-1").status_code == 404
    assert client.get("/api/appointments/999999999999999999999999").status_code == 404


def test_reason_is_returned_as_plain_text_for_client_escaping(client, app):
    login(client, "patient@example.test")
    response = create(client, app, reason="<script>alert(1)</script>")
    assert response.status_code == 201
    assert response.json["data"]["reason"] == "<script>alert(1)</script>"


def test_patient_cancels_own_eligible_appointment(client, app):
    appointment_id = add_appointment(app)
    login(client, "patient@example.test")
    response = client.post(f"/api/appointments/{appointment_id}/cancel", json={})
    assert response.status_code == 200 and response.json["data"]["status"] == "CANCELLED"


@pytest.mark.parametrize("status", [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED])
def test_patient_cannot_cancel_terminal_appointment(client, app, status):
    appointment_id = add_appointment(app, status=status)
    login(client, "patient@example.test")
    assert client.post(f"/api/appointments/{appointment_id}/cancel", json={}).status_code == 409


def test_patient_cannot_set_status_directly(client, app):
    appointment_id = add_appointment(app)
    login(client, "patient@example.test")
    assert client.patch(f"/api/appointments/{appointment_id}", json={"status": "COMPLETED"}).status_code == 405


def test_doctor_list_and_detail_are_assignment_scoped(client, app):
    own_id = add_appointment(app)
    other_id = add_appointment(app, doctor_key="other_doctor")
    login(client, "doctor@example.test")
    response = client.get("/api/doctor/appointments?period=all")
    assert response.status_code == 200
    assert [item["id"] for item in response.json["data"]] == [own_id]
    assert response.json["data"][0]["patient"]["full_name"] == "Patient One"
    assert client.get(f"/api/doctor/appointments/{own_id}").status_code == 200
    assert client.get(f"/api/doctor/appointments/{other_id}").status_code == 404
    assert client.get("/api/doctor/appointments?doctor_id=2").status_code == 400


def test_doctor_confirms_then_completes_only_after_end(client, app):
    appointment_id = add_appointment(app)
    login(client, "doctor@example.test")
    assert client.post(f"/api/doctor/appointments/{appointment_id}/confirm", json={}).json["data"]["status"] == "CONFIRMED"
    assert client.post(f"/api/doctor/appointments/{appointment_id}/complete", json={}).status_code == 409
    with app.app_context():
        item = db.session.get(Appointment, appointment_id)
        item.start_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1)
        item.end_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=5)
        db.session.commit()
    assert client.post(f"/api/doctor/appointments/{appointment_id}/complete", json={}).json["data"]["status"] == "COMPLETED"
    assert client.post(f"/api/doctor/appointments/{appointment_id}/cancel", json={}).status_code == 409


def test_invalid_state_transitions_and_wrong_doctor_are_rejected(client, app):
    appointment_id = add_appointment(app)
    login(client, "otherdoctor@example.test")
    assert client.post(f"/api/doctor/appointments/{appointment_id}/confirm", json={}).status_code == 404
    client.post("/api/auth/logout")
    login(client, "doctor@example.test")
    assert client.post(f"/api/doctor/appointments/{appointment_id}/complete", json={}).status_code == 409
    assert client.post(f"/api/doctor/appointments/{appointment_id}/confirm", json={}).status_code == 200
    assert client.post(f"/api/doctor/appointments/{appointment_id}/confirm", json={}).status_code == 409


def test_doctor_can_cancel_own_future_pending_appointment(client, app):
    appointment_id = add_appointment(app)
    login(client, "doctor@example.test")
    response = client.post(f"/api/doctor/appointments/{appointment_id}/cancel", json={})
    assert response.status_code == 200 and response.json["data"]["status"] == "CANCELLED"


def test_admin_search_filters_pagination_and_safe_detail(client, app):
    appointment_id = add_appointment(app)
    add_appointment(app, doctor_key="other_doctor")
    login(client, "admin@example.test")
    response = client.get("/api/admin/appointments?search=Patient+One&status=PENDING&limit=1")
    assert response.status_code == 200 and response.json["pagination"]["total"] == 2
    row = response.json["data"][0]
    assert row["patient"]["full_name"] == "Patient One" and "reason" not in row
    assert client.get(f"/api/admin/appointments/{appointment_id}").status_code == 200
    assert client.get("/api/admin/appointments?status=INVALID").status_code == 400
    assert client.get("/api/admin/appointments?limit=101").status_code == 400
    assert client.get("/api/admin/appointments?date=2026-99-99").status_code == 400
    assert client.get("/api/admin/appointments?search=%27%20OR%201%3D1").status_code == 200


def test_admin_can_only_apply_valid_state_transitions(client, app):
    appointment_id = add_appointment(app)
    login(client, "admin@example.test")
    response = client.patch(f"/api/admin/appointments/{appointment_id}/status", json={"status": "CONFIRMED"})
    assert response.status_code == 200 and response.json["data"]["status"] == "CONFIRMED"
    assert client.patch(f"/api/admin/appointments/{appointment_id}/status", json={"status": "PENDING"}).status_code == 409
    assert client.patch(f"/api/admin/appointments/{appointment_id}/status", json={"status": "UNKNOWN"}).status_code == 400
    assert client.patch(f"/api/admin/appointments/{appointment_id}/status", json={"status": "CANCELLED", "patient_id": 5}).status_code == 400


def test_non_admin_cannot_search_or_manage_all_appointments(client):
    login(client, "patient@example.test")
    assert client.get("/api/admin/appointments").status_code == 403
    assert client.patch("/api/admin/appointments/1/status", json={"status": "CANCELLED"}).status_code == 403


def test_invalid_period_and_status_are_rejected(client):
    login(client, "patient@example.test")
    assert client.get("/api/appointments/my?period=forever").status_code == 400
    assert client.get("/api/appointments/my?status=UNKNOWN").status_code == 400
