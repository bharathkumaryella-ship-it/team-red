"""Medical record attachment model for secure clinical file uploads."""

from datetime import datetime

from app.extensions import db


class MedicalAttachment(db.Model):
    """Secure attachment (lab report, imaging, prescription PDF) for a medical record."""

    __tablename__ = "medical_attachments"

    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(
        db.Integer,
        db.ForeignKey("medical_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploader_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    original_filename = db.Column(db.String(255), nullable=False)
    storage_filename = db.Column(db.String(255), unique=True, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    sha256_hash = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    medical_record = db.relationship("MedicalRecord", backref=db.backref("attachments", cascade="all, delete-orphan"))
    uploader = db.relationship("User", foreign_keys=[uploader_id])

    def __init__(
        self,
        record_id: int | None = None,
        uploader_id: int | None = None,
        original_filename: str = "",
        storage_filename: str = "",
        mime_type: str = "",
        file_size: int = 0,
        sha256_hash: str = "",
        **kwargs,
    ):
        self.record_id = record_id
        self.uploader_id = uploader_id
        self.original_filename = original_filename
        self.storage_filename = storage_filename
        self.mime_type = mime_type
        self.file_size = file_size
        self.sha256_hash = sha256_hash
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __repr__(self):
        return f"<MedicalAttachment id={self.id} record_id={self.record_id} filename={self.original_filename}>"
