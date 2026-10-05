"""Appointment model for scheduling patient-doctor meetings."""

from datetime import datetime
from enum import Enum

from app.extensions import db


class AppointmentStatus(str, Enum):
    """Valid appointment statuses."""

    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Appointment(db.Model):
    """Appointment record between a patient and doctor."""

    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    start_at = db.Column(db.DateTime, nullable=False, index=True)
    end_at = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.PENDING, index=True)
    reason = db.Column(db.String(500), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    patient = db.relationship("User", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    doctor = db.relationship("User", foreign_keys=[doctor_id], back_populates="appointments_as_doctor")
    medical_records = db.relationship(
        "MedicalRecord",
        back_populates="appointment",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.CheckConstraint("end_at > start_at", name="check_appointment_end_after_start"),
        db.CheckConstraint("patient_id != doctor_id", name="check_appointment_patient_not_doctor"),
    )

    def __init__(
        self,
        patient_id: int | None = None,
        doctor_id: int | None = None,
        start_at=None,
        end_at=None,
        status: AppointmentStatus = AppointmentStatus.PENDING,
        reason: str | None = None,
        notes: str | None = None,
        **kwargs,
    ):
        self.patient_id = patient_id
        self.doctor_id = doctor_id
        self.start_at = start_at
        self.end_at = end_at
        self.status = status
        self.reason = reason
        self.notes = notes
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __repr__(self):
        return f"<Appointment id={self.id} patient_id={self.patient_id} doctor_id={self.doctor_id} status={self.status}>"
