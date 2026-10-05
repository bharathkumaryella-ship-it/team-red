"""Medical record model for doctor-documented patient information."""

from datetime import datetime

from app.extensions import db


class MedicalRecord(db.Model):
    """Medical record documented by a doctor for a patient appointment."""

    __tablename__ = "medical_records"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id", ondelete="RESTRICT"), nullable=True)
    diagnosis = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    prescription = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    patient = db.relationship("User", foreign_keys=[patient_id], back_populates="medical_records_as_patient")
    doctor = db.relationship("User", foreign_keys=[doctor_id], back_populates="medical_records_as_doctor")
    appointment = db.relationship("Appointment", back_populates="medical_records")

    def __repr__(self):
        return f"<MedicalRecord id={self.id} patient_id={self.patient_id} doctor_id={self.doctor_id}>"
