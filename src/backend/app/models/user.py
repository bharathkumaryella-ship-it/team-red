"""User model for authentication and role-based access."""

from datetime import datetime
from enum import Enum

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.extensions import db
from app.security.phi_encryption import EncryptedText

# Initialize Argon2id hasher
_ph = PasswordHasher()


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
    phone = db.Column(EncryptedText(), nullable=True)
    role = db.Column(db.Enum(UserRole), nullable=False, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    token_version = db.Column(db.Integer, nullable=False, default=1, server_default=db.text("1"))
    failed_login_attempts = db.Column(db.Integer, nullable=False, default=0, server_default=db.text("0"))
    locked_until = db.Column(db.DateTime, nullable=True)
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

    def __init__(
        self,
        email: str = "",
        password_hash: str = "",
        full_name: str = "",
        phone: str | None = None,
        role: UserRole = UserRole.PATIENT,
        is_active: bool = True,
        token_version: int = 1,
        failed_login_attempts: int = 0,
        locked_until: datetime | None = None,
        **kwargs,
    ):
        self.email = email
        self.password_hash = password_hash
        self.full_name = full_name
        self.phone = phone
        self.role = role
        self.is_active = is_active
        self.token_version = token_version
        self.failed_login_attempts = failed_login_attempts
        self.locked_until = locked_until
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"

    def set_password(self, password: str) -> None:
        """Hash and store password using Argon2id.

        Args:
            password: Plaintext password to hash.

        Raises:
            ValueError: If password is empty or invalid.
        """
        if not password or not isinstance(password, str):
            raise ValueError("Password must be a non-empty string")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        self.password_hash = _ph.hash(password)

    def verify_password(self, password: str) -> bool:
        """Verify plaintext password against stored hash using Argon2id.

        Args:
            password: Plaintext password to verify.

        Returns:
            bool: True if password matches, False otherwise.
        """
        if not password or not self.password_hash:
            return False
        try:
            _ph.verify(self.password_hash, password)
            return True
        except (VerificationError, InvalidHashError):
            return False
