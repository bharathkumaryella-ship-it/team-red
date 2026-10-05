"""User model for authentication and role-based access."""

from datetime import datetime
from enum import Enum

from app.extensions import db


class UserRole(str, Enum):
    """Valid application roles."""

    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class User(db.Model):
    """User account representing a patient, doctor, or admin."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    role = db.Column(db.Enum(UserRole), nullable=False, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    patient_profile = db.relationship(
        "PatientProfile", uselist=False, back_populates="user", cascade="all, delete-orphan"
    )
    doctor_profile = db.relationship(
        "DoctorProfile", uselist=False, back_populates="user", cascade="all, delete-orphan"
    )
    appointments_as_patient = db.relationship(
        "Appointment",
        foreign_keys="Appointment.patient_id",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    appointments_as_doctor = db.relationship(
        "Appointment",
        foreign_keys="Appointment.doctor_id",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )
    medical_records_as_patient = db.relationship(
        "MedicalRecord",
        foreign_keys="MedicalRecord.patient_id",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    medical_records_as_doctor = db.relationship(
        "MedicalRecord",
        foreign_keys="MedicalRecord.doctor_id",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"
