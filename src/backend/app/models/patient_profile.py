"""Patient profile model for patient-specific information."""

from datetime import datetime

from app.extensions import db


class PatientProfile(db.Model):
    """Profile information for a patient user."""

    __tablename__ = "patient_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), unique=True, nullable=False, index=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(50), nullable=True)
    blood_group = db.Column(db.String(10), nullable=True)
    address = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user = db.relationship("User", back_populates="patient_profile")

    def __repr__(self):
        return f"<PatientProfile id={self.id} user_id={self.user_id}>"
