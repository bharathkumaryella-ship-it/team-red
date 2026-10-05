"""Tests for database models: User, PatientProfile, DoctorProfile, Appointment, MedicalRecord."""

import pytest
from datetime import datetime, timedelta, date

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
)


@pytest.fixture
def app():
    """Create a test application."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Test client."""
    return app.test_client()


class TestUser:
    """User model tests."""

    def test_create_patient_user(self, app):
        """Test creating a patient user."""
        with app.app_context():
            user = User(
                email="patient@example.com",
                password_hash="hashed_password",
                full_name="John Doe",
                phone="555-1234",
                role=UserRole.PATIENT,
                is_active=True,
            )
            db.session.add(user)
            db.session.commit()

            assert user.id is not None
            assert user.email == "patient@example.com"
            assert user.role == UserRole.PATIENT
            assert user.is_active is True
            assert user.created_at is not None
            assert user.updated_at is not None

    def test_create_doctor_user(self, app):
        """Test creating a doctor user."""
        with app.app_context():
            user = User(
                email="doctor@example.com",
                password_hash="hashed_password",
                full_name="Dr. Jane Smith",
                phone="555-5678",
                role=UserRole.DOCTOR,
                is_active=True,
            )
            db.session.add(user)
            db.session.commit()

            assert user.role == UserRole.DOCTOR
            assert user.id is not None

    def test_create_admin_user(self, app):
        """Test creating an admin user."""
        with app.app_context():
            user = User(
                email="admin@example.com",
                password_hash="hashed_password",
                full_name="Admin User",
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.session.add(user)
            db.session.commit()

            assert user.role == UserRole.ADMIN

    def test_email_uniqueness(self, app):
        """Test that email is unique."""
        with app.app_context():
            user1 = User(
                email="duplicate@example.com",
                password_hash="hash1",
                full_name="User One",
                role=UserRole.PATIENT,
            )
            user2 = User(
                email="duplicate@example.com",
                password_hash="hash2",
                full_name="User Two",
                role=UserRole.DOCTOR,
            )
            db.session.add(user1)
            db.session.commit()
            db.session.add(user2)

            with pytest.raises(Exception):
                db.session.commit()

    def test_user_repr(self, app):
        """Test user string representation."""
        with app.app_context():
            user = User(
                email="test@example.com",
                password_hash="hash",
                full_name="Test User",
                role=UserRole.PATIENT,
            )
            db.session.add(user)
            db.session.commit()

            repr_str = repr(user)
            assert "test@example.com" in repr_str
            assert "PATIENT" in repr_str


class TestPatientProfile:
    """PatientProfile model tests."""

    def test_create_patient_profile(self, app):
        """Test creating a patient profile."""
        with app.app_context():
            user = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient User",
                role=UserRole.PATIENT,
            )
            db.session.add(user)
            db.session.commit()

            profile = PatientProfile(
                user_id=user.id,
                date_of_birth=date(1990, 5, 15),
                gender="Male",
                blood_group="O+",
                address="123 Main St, City",
            )
            db.session.add(profile)
            db.session.commit()

            assert profile.id is not None
            assert profile.user_id == user.id
            assert profile.blood_group == "O+"

    def test_patient_profile_user_relationship(self, app):
        """Test patient profile to user relationship."""
        with app.app_context():
            user = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient User",
                role=UserRole.PATIENT,
            )
            db.session.add(user)
            db.session.commit()

            profile = PatientProfile(user_id=user.id, blood_group="A-")
            db.session.add(profile)
            db.session.commit()

            assert user.patient_profile == profile
            assert profile.user == user


class TestDoctorProfile:
    """DoctorProfile model tests."""

    def test_create_doctor_profile(self, app):
        """Test creating a doctor profile."""
        with app.app_context():
            user = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(user)
            db.session.commit()

            profile = DoctorProfile(
                user_id=user.id,
                specialization="Cardiology",
                license_number="MD123456",
                experience_years=10,
                bio="Experienced cardiologist",
            )
            db.session.add(profile)
            db.session.commit()

            assert profile.id is not None
            assert profile.specialization == "Cardiology"
            assert profile.license_number == "MD123456"

    def test_doctor_license_uniqueness(self, app):
        """Test that license number is unique."""
        with app.app_context():
            user1 = User(
                email="doctor1@example.com",
                password_hash="hash",
                full_name="Dr. One",
                role=UserRole.DOCTOR,
            )
            user2 = User(
                email="doctor2@example.com",
                password_hash="hash",
                full_name="Dr. Two",
                role=UserRole.DOCTOR,
            )
            db.session.add(user1)
            db.session.add(user2)
            db.session.commit()

            profile1 = DoctorProfile(
                user_id=user1.id,
                specialization="General",
                license_number="LIC001",
            )
            profile2 = DoctorProfile(
                user_id=user2.id,
                specialization="General",
                license_number="LIC001",
            )
            db.session.add(profile1)
            db.session.commit()
            db.session.add(profile2)

            with pytest.raises(Exception):
                db.session.commit()

    def test_doctor_profile_user_relationship(self, app):
        """Test doctor profile to user relationship."""
        with app.app_context():
            user = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(user)
            db.session.commit()

            profile = DoctorProfile(
                user_id=user.id,
                specialization="Orthopedics",
                license_number="LIC789",
            )
            db.session.add(profile)
            db.session.commit()

            assert user.doctor_profile == profile
            assert profile.user == user


class TestAppointment:
    """Appointment model tests."""

    def test_create_appointment(self, app):
        """Test creating an appointment."""
        with app.app_context():
            patient = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient",
                role=UserRole.PATIENT,
            )
            doctor = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(patient)
            db.session.add(doctor)
            db.session.commit()

            start_time = datetime.utcnow() + timedelta(days=1)
            end_time = start_time + timedelta(minutes=30)

            appointment = Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                start_at=start_time,
                end_at=end_time,
                status=AppointmentStatus.PENDING,
                reason="Consultation",
            )
            db.session.add(appointment)
            db.session.commit()

            assert appointment.id is not None
            assert appointment.status == AppointmentStatus.PENDING
            assert appointment.reason == "Consultation"

    def test_appointment_end_after_start_constraint(self, app):
        """Test that end_at must be after start_at."""
        with app.app_context():
            patient = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient",
                role=UserRole.PATIENT,
            )
            doctor = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(patient)
            db.session.add(doctor)
            db.session.commit()

            start_time = datetime.utcnow()
            appointment = Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                start_at=start_time,
                end_at=start_time,
                status=AppointmentStatus.PENDING,
            )
            db.session.add(appointment)

            with pytest.raises(Exception):
                db.session.commit()

    def test_appointment_patient_not_doctor_constraint(self, app):
        """Test that patient and doctor cannot be the same person."""
        with app.app_context():
            user = User(
                email="user@example.com",
                password_hash="hash",
                full_name="User",
                role=UserRole.PATIENT,
            )
            db.session.add(user)
            db.session.commit()

            start_time = datetime.utcnow()
            appointment = Appointment(
                patient_id=user.id,
                doctor_id=user.id,
                start_at=start_time,
                end_at=start_time + timedelta(minutes=30),
                status=AppointmentStatus.PENDING,
            )
            db.session.add(appointment)

            with pytest.raises(Exception):
                db.session.commit()

    def test_appointment_relationships(self, app):
        """Test appointment relationships to patient and doctor."""
        with app.app_context():
            patient = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient",
                role=UserRole.PATIENT,
            )
            doctor = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(patient)
            db.session.add(doctor)
            db.session.commit()

            start_time = datetime.utcnow() + timedelta(days=1)
            appointment = Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                start_at=start_time,
                end_at=start_time + timedelta(minutes=30),
                status=AppointmentStatus.PENDING,
            )
            db.session.add(appointment)
            db.session.commit()

            assert patient.appointments_as_patient[0] == appointment
            assert doctor.appointments_as_doctor[0] == appointment


class TestMedicalRecord:
    """MedicalRecord model tests."""

    def test_create_medical_record(self, app):
        """Test creating a medical record."""
        with app.app_context():
            patient = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient",
                role=UserRole.PATIENT,
            )
            doctor = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(patient)
            db.session.add(doctor)
            db.session.commit()

            record = MedicalRecord(
                patient_id=patient.id,
                doctor_id=doctor.id,
                diagnosis="Hypertension",
                notes="Patient has elevated BP",
                prescription="Lisinopril 10mg daily",
            )
            db.session.add(record)
            db.session.commit()

            assert record.id is not None
            assert record.diagnosis == "Hypertension"
            assert "Lisinopril" in record.prescription

    def test_medical_record_with_appointment(self, app):
        """Test medical record linked to an appointment."""
        with app.app_context():
            patient = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient",
                role=UserRole.PATIENT,
            )
            doctor = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(patient)
            db.session.add(doctor)
            db.session.commit()

            start_time = datetime.utcnow() + timedelta(days=1)
            appointment = Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                start_at=start_time,
                end_at=start_time + timedelta(minutes=30),
                status=AppointmentStatus.COMPLETED,
            )
            db.session.add(appointment)
            db.session.commit()

            record = MedicalRecord(
                patient_id=patient.id,
                doctor_id=doctor.id,
                appointment_id=appointment.id,
                diagnosis="Influenza",
                prescription="Rest and fluids",
            )
            db.session.add(record)
            db.session.commit()

            assert record.appointment == appointment
            assert appointment.medical_records[0] == record

    def test_medical_record_relationships(self, app):
        """Test medical record relationships."""
        with app.app_context():
            patient = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient",
                role=UserRole.PATIENT,
            )
            doctor = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(patient)
            db.session.add(doctor)
            db.session.commit()

            record = MedicalRecord(
                patient_id=patient.id,
                doctor_id=doctor.id,
                diagnosis="Common cold",
            )
            db.session.add(record)
            db.session.commit()

            assert patient.medical_records_as_patient[0] == record
            assert doctor.medical_records_as_doctor[0] == record


class TestCascadeDelete:
    """Test cascade delete behavior."""

    def test_user_delete_cascades_to_patient_profile(self, app):
        """Test that deleting a user cascades to patient profile."""
        with app.app_context():
            user = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient",
                role=UserRole.PATIENT,
            )
            db.session.add(user)
            db.session.commit()

            profile = PatientProfile(user_id=user.id, blood_group="B+")
            db.session.add(profile)
            db.session.commit()

            profile_id = profile.id
            user_id = user.id

            db.session.delete(user)
            db.session.commit()

            assert PatientProfile.query.get(profile_id) is None

    def test_user_delete_cascades_to_doctor_profile(self, app):
        """Test that deleting a doctor user cascades to doctor profile."""
        with app.app_context():
            user = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(user)
            db.session.commit()

            profile = DoctorProfile(
                user_id=user.id,
                specialization="Surgery",
                license_number="LIC999",
            )
            db.session.add(profile)
            db.session.commit()

            profile_id = profile.id

            db.session.delete(user)
            db.session.commit()

            assert DoctorProfile.query.get(profile_id) is None

    def test_appointment_delete_cascades_to_medical_records(self, app):
        """Test that deleting an appointment cascades to medical records."""
        with app.app_context():
            patient = User(
                email="patient@example.com",
                password_hash="hash",
                full_name="Patient",
                role=UserRole.PATIENT,
            )
            doctor = User(
                email="doctor@example.com",
                password_hash="hash",
                full_name="Dr. Smith",
                role=UserRole.DOCTOR,
            )
            db.session.add(patient)
            db.session.add(doctor)
            db.session.commit()

            start_time = datetime.utcnow() + timedelta(days=1)
            appointment = Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                start_at=start_time,
                end_at=start_time + timedelta(minutes=30),
                status=AppointmentStatus.COMPLETED,
            )
            db.session.add(appointment)
            db.session.commit()

            record = MedicalRecord(
                patient_id=patient.id,
                doctor_id=doctor.id,
                appointment_id=appointment.id,
                diagnosis="Test",
            )
            db.session.add(record)
            db.session.commit()

            record_id = record.id
            appointment_id = appointment.id

            db.session.delete(appointment)
            db.session.commit()

            assert Appointment.query.get(appointment_id) is None
            assert MedicalRecord.query.get(record_id) is None
