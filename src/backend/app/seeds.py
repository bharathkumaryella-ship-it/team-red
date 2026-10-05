"""Seed data for development and demonstration purposes."""

from datetime import datetime, timedelta, date
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import (
    User,
    UserRole,
    PatientProfile,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
    MedicalRecord,
)


def seed_development_data():
    """Populate database with demo data for development."""
    # Clear existing data
    MedicalRecord.query.delete()
    Appointment.query.delete()
    PatientProfile.query.delete()
    DoctorProfile.query.delete()
    User.query.delete()
    db.session.commit()

    demo_password_hash = generate_password_hash("DEMO-ONLY-Password123!")

    patients = [
        User(
            email="patient1@demo.local",
            password_hash=demo_password_hash,
            full_name="Alice Johnson",
            phone="555-0001",
            role=UserRole.PATIENT,
            is_active=True,
        ),
        User(
            email="patient2@demo.local",
            password_hash=demo_password_hash,
            full_name="Bob Smith",
            phone="555-0002",
            role=UserRole.PATIENT,
            is_active=True,
        ),
        User(
            email="patient3@demo.local",
            password_hash=demo_password_hash,
            full_name="Carol White",
            phone="555-0003",
            role=UserRole.PATIENT,
            is_active=True,
        ),
    ]
    db.session.add_all(patients)
    db.session.flush()

    doctors = [
        User(
            email="doctor1@demo.local",
            password_hash=demo_password_hash,
            full_name="Dr. Elizabeth Brown",
            phone="555-1001",
            role=UserRole.DOCTOR,
            is_active=True,
        ),
        User(
            email="doctor2@demo.local",
            password_hash=demo_password_hash,
            full_name="Dr. Michael Davis",
            phone="555-1002",
            role=UserRole.DOCTOR,
            is_active=True,
        ),
    ]
    db.session.add_all(doctors)
    db.session.flush()

    admin_user = User(
        email="admin@demo.local",
        password_hash=demo_password_hash,
        full_name="Admin User",
        phone="555-9000",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.session.add(admin_user)
    db.session.flush()

    patient_profiles = [
        PatientProfile(
            user_id=patients[0].id,
            date_of_birth=date(1985, 3, 15),
            gender="Female",
            blood_group="O+",
            address="123 Oak St, Springfield",
        ),
        PatientProfile(
            user_id=patients[1].id,
            date_of_birth=date(1978, 7, 22),
            gender="Male",
            blood_group="A-",
            address="456 Elm St, Springfield",
        ),
        PatientProfile(
            user_id=patients[2].id,
            date_of_birth=date(1992, 11, 8),
            gender="Female",
            blood_group="B+",
            address="789 Maple St, Springfield",
        ),
    ]
    db.session.add_all(patient_profiles)
    db.session.flush()

    doctor_profiles = [
        DoctorProfile(
            user_id=doctors[0].id,
            specialization="Cardiology",
            license_number="MD-BROWN-001",
            experience_years=15,
            bio="Specialized in cardiac care and preventive heart health.",
        ),
        DoctorProfile(
            user_id=doctors[1].id,
            specialization="General Practice",
            license_number="MD-DAVIS-002",
            experience_years=8,
            bio="Comprehensive primary care and patient wellness.",
        ),
    ]
    db.session.add_all(doctor_profiles)
    db.session.flush()

    now = datetime.utcnow()
    appointments = [
        Appointment(
            patient_id=patients[0].id,
            doctor_id=doctors[0].id,
            start_at=now + timedelta(days=1, hours=10),
            end_at=now + timedelta(days=1, hours=10, minutes=30),
            status=AppointmentStatus.CONFIRMED,
            reason="Annual checkup",
        ),
        Appointment(
            patient_id=patients[1].id,
            doctor_id=doctors[1].id,
            start_at=now + timedelta(days=2, hours=14),
            end_at=now + timedelta(days=2, hours=14, minutes=30),
            status=AppointmentStatus.PENDING,
            reason="Blood pressure follow-up",
        ),
        Appointment(
            patient_id=patients[2].id,
            doctor_id=doctors[0].id,
            start_at=now - timedelta(days=7),
            end_at=now - timedelta(days=7) + timedelta(minutes=30),
            status=AppointmentStatus.COMPLETED,
            reason="Routine examination",
        ),
    ]
    db.session.add_all(appointments)
    db.session.flush()

    medical_records = [
        MedicalRecord(
            patient_id=patients[0].id,
            doctor_id=doctors[0].id,
            appointment_id=appointments[2].id,
            diagnosis="Hypertension Stage 1",
            notes="Patient presenting with elevated blood pressure. Lifestyle modifications advised.",
            prescription="Lisinopril 10mg once daily, low-sodium diet recommended",
        ),
        MedicalRecord(
            patient_id=patients[1].id,
            doctor_id=doctors[1].id,
            appointment_id=None,
            diagnosis="Common Cold",
            notes="Symptomatic treatment recommended.",
            prescription="Rest, fluids, acetaminophen 500mg as needed",
        ),
        MedicalRecord(
            patient_id=patients[2].id,
            doctor_id=doctors[0].id,
            diagnosis="Preventive Care Record",
            notes="Baseline health metrics recorded. All vitals normal.",
            prescription="Continue current lifestyle",
        ),
    ]
    db.session.add_all(medical_records)
    db.session.commit()

    print("Demo data seeded successfully!")
    print(f"  - {len(patients)} patient users")
    print(f"  - {len(doctors)} doctor users")
    print(f"  - 1 admin user")
    print(f"  - {len(appointments)} appointments")
    print(f"  - {len(medical_records)} medical records")
