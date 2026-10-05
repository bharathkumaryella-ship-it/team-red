"""Doctor profile model for doctor-specific information."""

from datetime import datetime

from app.extensions import db


class DoctorProfile(db.Model):
    """Profile information for a doctor user."""

    __tablename__ = "doctor_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), unique=True, nullable=False, index=True)
    specialization = db.Column(db.String(255), nullable=False, index=True)
    license_number = db.Column(db.String(100), unique=True, nullable=False)
    experience_years = db.Column(db.Integer, nullable=True)
    bio = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user = db.relationship("User", back_populates="doctor_profile")

    def __init__(
        self,
        user_id: int | None = None,
        specialization: str = "",
        license_number: str = "",
        experience_years: int | None = None,
        bio: str | None = None,
        **kwargs,
    ):
        self.user_id = user_id
        self.specialization = specialization
        self.license_number = license_number
        self.experience_years = experience_years
        self.bio = bio
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __repr__(self):
        return f"<DoctorProfile id={self.id} specialization={self.specialization} user_id={self.user_id}>"
