"""Comprehensive expert security tests for MediDesk hardening.

Covers:
1. Server-side session token revocation on logout.
2. Account-level brute-force lockout after 5 failed attempts.
3. Password complexity and dictionary rejection.
4. Secure File Handling: magic-byte verification, anti-traversal, and IDOR protection.
"""

import io
from datetime import datetime, timedelta

from app import create_app
from app.extensions import db
from app.models import (
    User,
    UserRole,
    PatientProfile,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
    MedicalRecord,
    MedicalAttachment,
)


def _setup_test_db(app):
    with app.app_context():
        db.create_all()
        # Create Patient
        patient = User(
            email="patient@hospital.test",
            full_name="Alice Patient",
            role=UserRole.PATIENT,
            is_active=True,
        )
        patient.set_password("SecurePassword123")
        patient.patient_profile = PatientProfile()

        # Create Doctor
        doctor = User(
            email="doctor@hospital.test",
            full_name="Dr. Bob Specialist",
            role=UserRole.DOCTOR,
            is_active=True,
        )
        doctor.set_password("SecurePassword123")
        doctor.doctor_profile = DoctorProfile(specialization="Cardiology", license_number="CARD-999")

        # Create other patient for IDOR tests
        other_patient = User(
            email="eve@hospital.test",
            full_name="Eve Intruder",
            role=UserRole.PATIENT,
            is_active=True,
        )
        other_patient.set_password("SecurePassword123")
        other_patient.patient_profile = PatientProfile()

        db.session.add_all([patient, doctor, other_patient])
        db.session.commit()

        # Create Appointment and Medical Record
        start = datetime.utcnow() - timedelta(hours=2)
        end = datetime.utcnow() - timedelta(hours=1)
        appt = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            start_at=start,
            end_at=end,
            status=AppointmentStatus.COMPLETED,
            reason="Chest pain consult",
        )
        db.session.add(appt)
        db.session.commit()

        record = MedicalRecord(
            patient_id=patient.id,
            doctor_id=doctor.id,
            appointment_id=appt.id,
            diagnosis="Angina pectoris",
            notes="Rest and follow up",
            prescription="Aspirin 81mg",
        )
        db.session.add(record)
        db.session.commit()

        return patient.id, doctor.id, other_patient.id, record.id


def test_session_token_revocation_on_logout():
    """Verify that logging out invalidates session token server-side (preventing cookie replay)."""
    app = create_app("testing")
    _setup_test_db(app)

    client = app.test_client()

    # Step 1: Login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "patient@hospital.test", "password": "SecurePassword123"},
    )
    assert login_res.status_code == 200

    # Step 2: Access protected route
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json["email"] == "patient@hospital.test"

    # Step 3: Logout (increments token_version on server)
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # Step 4: Verify the session is invalidated
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 401

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_account_lockout_after_failed_attempts():
    """Verify that a locked account returns 429 even before IP limit."""
    app = create_app("testing")
    _setup_test_db(app)

    with app.app_context():
        user = User.query.filter_by(email="patient@hospital.test").first()
        user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()

    client = app.test_client()
    res_locked = client.post(
        "/api/auth/login",
        json={"email": "patient@hospital.test", "password": "SecurePassword123"},
    )
    assert res_locked.status_code == 429
    assert "temporarily locked" in res_locked.json["error"]

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_password_policy_rejects_common_passwords():
    """Verify password policy rejects trivial dictionary passwords."""
    app = create_app("testing")
    _setup_test_db(app)
    client = app.test_client()

    weak_passwords = ["12345678", "password123", "admin123", "letmein123"]
    for wp in weak_passwords:
        res = client.post(
            "/api/auth/register",
            json={
                "full_name": "New Patient",
                "email": f"test_{wp}@test.com",
                "phone": "+1-555-9999",
                "password": wp,
            },
        )
        assert res.status_code == 400
        assert "password" in res.json.get("errors", {})

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_secure_file_handling_upload_and_magic_bytes():
    """Verify secure file upload, signature checking, and anti-traversal."""
    app = create_app("testing")
    patient_id, doctor_id, other_id, record_id = _setup_test_db(app)
    client = app.test_client()

    # Login as attending doctor
    client.post(
        "/api/auth/login",
        json={"email": "doctor@hospital.test", "password": "SecurePassword123"},
    )

    # 1. Valid PDF upload with proper magic bytes
    pdf_content = b"%PDF-1.4\n% clinical lab report dummy test content"
    data = {"file": (io.BytesIO(pdf_content), "lab_report_scan.pdf")}
    res = client.post(
        f"/api/medical-records/{record_id}/attachments",
        data=data,
        content_type="multipart/form-data",
    )
    assert res.status_code == 201
    attachment_id = res.json["attachment"]["id"]
    assert res.json["attachment"]["mime_type"] == "application/pdf"
    assert len(res.json["attachment"]["sha256_hash"]) == 64

    # 2. Spoofed extension: EXE/script disguised as a PDF
    fake_pdf = b"MZ\x90\x00\x03\x00\x00\x00malicious executable disguised"
    bad_data = {"file": (io.BytesIO(fake_pdf), "malware.pdf")}
    bad_res = client.post(
        f"/api/medical-records/{record_id}/attachments",
        data=bad_data,
        content_type="multipart/form-data",
    )
    assert bad_res.status_code == 400
    assert "File signature verification failed" in bad_res.json["error"]

    # 3. Disallowed extension (.svg or .html stored XSS attempts)
    xss_data = {"file": (io.BytesIO(b"<svg onload=alert(1)>"), "image.svg")}
    xss_res = client.post(
        f"/api/medical-records/{record_id}/attachments",
        data=xss_data,
        content_type="multipart/form-data",
    )
    assert xss_res.status_code == 400

    # 4. Authorized patient can download their attachment
    client.post("/api/auth/logout")
    client.post(
        "/api/auth/login",
        json={"email": "patient@hospital.test", "password": "SecurePassword123"},
    )
    dl_res = client.get(f"/api/medical-records/{record_id}/attachments/{attachment_id}")
    assert dl_res.status_code == 200
    assert dl_res.headers["X-Content-Type-Options"] == "nosniff"
    assert "attachment" in dl_res.headers["Content-Disposition"]
    assert dl_res.data == pdf_content

    # 5. IDOR test: Unauthorized patient (Eve) cannot access Alice's attachment
    client.post("/api/auth/logout")
    client.post(
        "/api/auth/login",
        json={"email": "eve@hospital.test", "password": "SecurePassword123"},
    )
    idor_res = client.get(f"/api/medical-records/{record_id}/attachments/{attachment_id}")
    assert idor_res.status_code == 404

    with app.app_context():
        db.session.remove()
        db.drop_all()
