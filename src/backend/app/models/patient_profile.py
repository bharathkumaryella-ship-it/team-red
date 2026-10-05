"""Patient profile model for patient-specific information."""

from datetime import datetime

from app.extensions import db
from app.security.phi_encryption import EncryptedDate, EncryptedText


class PatientProfile(db.Model):
    """Profile information for a patient user."""

    __tablename__ = "patient_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), unique=True, nullable=False, index=True)
    date_of_birth = db.Column(EncryptedDate(), nullable=True)
    gender = db.Column(EncryptedText(), nullable=True)
    blood_group = db.Column(EncryptedText(), nullable=True)
    address = db.Column(EncryptedText(), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user = db.relationship("User", back_populates="patient_profile")

    def __init__(
        self,
        user_id: int | None = None,
        date_of_birth=None,
        gender: str | None = None,
        blood_group: str | None = None,
        address: str | None = None,
        **kwargs,
    ):
        self.user_id = user_id
        self.date_of_birth = date_of_birth
        self.gender = gender
        self.blood_group = blood_group
        self.address = address
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __repr__(self):
        return f"<PatientProfile id={self.id} user_id={self.user_id}>"
