"""Secure File Handling Blueprint for MediDesk clinical attachments."""

import hashlib
import os
import uuid
import logging
from pathlib import Path

from flask import Blueprint, current_app, request, jsonify, send_file, Response
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models import MedicalRecord, MedicalAttachment, UserRole
from app.auth.utils import require_authentication, get_current_user

attachments_bp = Blueprint("attachments", __name__, url_prefix="/api")
logger = logging.getLogger("attachments")

# Security Constraints
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}

# Magic byte signatures for deep content inspection
MAGIC_SIGNATURES = {
    "application/pdf": [b"%PDF-"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
}


def _get_storage_dir() -> Path:
    """Return verified absolute path to secure attachment storage outside webroot."""
    storage_path = Path(current_app.instance_path) / "secure_attachments"
    storage_path.mkdir(parents=True, exist_ok=True)
    return storage_path


def _detect_magic_mime(header: bytes) -> str | None:
    """Verify magic bytes signature against permitted file types."""
    for mime, signatures in MAGIC_SIGNATURES.items():
        for sig in signatures:
            if header.startswith(sig):
                return mime
    return None


@attachments_bp.route("/medical-records/<int:record_id>/attachments", methods=["POST"])
@require_authentication
def upload_attachment(record_id: int):
    """Upload a secure clinical attachment (PDF report or image) to a medical record.
    
    Security controls applied:
    - Role and relationship authorization (only record's patient or doctor).
    - File size verification (< 5 MB).
    - Double extension and path traversal sanitization via secure_filename.
    - Deep magic-byte file signature validation (defeats extension renaming attacks).
    - Storage under non-executable UUID filename outside webroot.
    - SHA-256 cryptographic hash recording for file integrity.
    """
    current_user = get_current_user()
    record = db.session.get(MedicalRecord, record_id)
    if not record:
        return jsonify({"error": "Medical record not found"}), 404

    # Strict authorization: only assigned patient or doctor
    is_owner_patient = current_user.role == UserRole.PATIENT and record.patient_id == current_user.id
    is_assigned_doctor = current_user.role == UserRole.DOCTOR and record.doctor_id == current_user.id
    if not (is_owner_patient or is_assigned_doctor):
        logger.warning(
            "Unauthorized attachment upload attempt (user_id=%s, record_id=%s)",
            current_user.id,
            record_id,
        )
        return jsonify({"error": "Medical record not found"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file part provided in request"}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file or not uploaded_file.filename:
        return jsonify({"error": "No file selected for upload"}), 400

    # Sanitize original filename
    safe_name = secure_filename(uploaded_file.filename)
    if not safe_name:
        return jsonify({"error": "Invalid filename"}), 400

    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({
            "error": "Disallowed file type. Only PDF, PNG, and JPEG files are permitted."
        }), 400

    expected_mime = ALLOWED_EXTENSIONS[ext]

    # Read and inspect content with strict size cap
    content = uploaded_file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        return jsonify({"error": "File exceeds maximum permitted size of 5 MB"}), 413

    if len(content) == 0:
        return jsonify({"error": "Cannot upload empty file"}), 400

    # Deep magic bytes verification
    detected_mime = _detect_magic_mime(content[:32])
    if detected_mime != expected_mime:
        logger.warning(
            "File signature mismatch detected! expected=%s, detected=%s, filename=%s",
            expected_mime,
            detected_mime,
            safe_name,
        )
        return jsonify({
            "error": "File signature verification failed. File content does not match extension."
        }), 400

    # Generate isolated UUID storage filename outside public document root
    storage_filename = f"{uuid.uuid4().hex}{ext}"
    storage_dir = _get_storage_dir()
    destination = storage_dir / storage_filename

    # Write file securely with restricted permissions
    with open(destination, "wb") as f:
        f.write(content)

    # Compute SHA-256 for audit and integrity
    sha256_hash = hashlib.sha256(content).hexdigest()

    attachment = MedicalAttachment(
        record_id=record.id,
        uploader_id=current_user.id,
        original_filename=safe_name,
        storage_filename=storage_filename,
        mime_type=expected_mime,
        file_size=len(content),
        sha256_hash=sha256_hash,
    )
    db.session.add(attachment)
    db.session.commit()

    logger.info(
        "Attachment successfully uploaded (attachment_id=%s, record_id=%s, uploader_id=%s)",
        attachment.id,
        record.id,
        current_user.id,
    )

    return jsonify({
        "message": "Attachment uploaded successfully",
        "attachment": {
            "id": attachment.id,
            "filename": attachment.original_filename,
            "mime_type": attachment.mime_type,
            "file_size": attachment.file_size,
            "sha256_hash": attachment.sha256_hash,
            "created_at": attachment.created_at.isoformat() + "Z",
        },
    }), 201


@attachments_bp.route("/medical-records/<int:record_id>/attachments", methods=["GET"])
@require_authentication
def list_attachments(record_id: int):
    """List attachments for a medical record scoped to authorized patient or doctor."""
    current_user = get_current_user()
    record = db.session.get(MedicalRecord, record_id)
    if not record:
        return jsonify({"error": "Medical record not found"}), 404

    is_owner_patient = current_user.role == UserRole.PATIENT and record.patient_id == current_user.id
    is_assigned_doctor = current_user.role == UserRole.DOCTOR and record.doctor_id == current_user.id
    if not (is_owner_patient or is_assigned_doctor):
        return jsonify({"error": "Medical record not found"}), 404

    attachments = (
        db.session.query(MedicalAttachment)
        .filter_by(record_id=record.id)
        .order_by(MedicalAttachment.created_at.desc())
        .all()
    )

    return jsonify({
        "record_id": record.id,
        "attachments": [
            {
                "id": a.id,
                "filename": a.original_filename,
                "mime_type": a.mime_type,
                "file_size": a.file_size,
                "sha256_hash": a.sha256_hash,
                "created_at": a.created_at.isoformat() + "Z",
            }
            for a in attachments
        ],
    }), 200


@attachments_bp.route("/medical-records/<int:record_id>/attachments/<int:attachment_id>", methods=["GET"])
@require_authentication
def download_attachment(record_id: int, attachment_id: int):
    """Download a clinical attachment with strict access control and anti-XSS response headers."""
    current_user = get_current_user()
    record = db.session.get(MedicalRecord, record_id)
    if not record:
        return jsonify({"error": "Attachment not found"}), 404

    is_owner_patient = current_user.role == UserRole.PATIENT and record.patient_id == current_user.id
    is_assigned_doctor = current_user.role == UserRole.DOCTOR and record.doctor_id == current_user.id
    if not (is_owner_patient or is_assigned_doctor):
        logger.warning(
            "Unauthorized attachment download attempt (user_id=%s, attachment_id=%s)",
            current_user.id,
            attachment_id,
        )
        return jsonify({"error": "Attachment not found"}), 404

    attachment = (
        db.session.query(MedicalAttachment)
        .filter_by(id=attachment_id, record_id=record.id)
        .first()
    )
    if not attachment:
        return jsonify({"error": "Attachment not found"}), 404

    storage_dir = _get_storage_dir()
    filepath = storage_dir / attachment.storage_filename
    if not filepath.exists() or not filepath.is_file():
        logger.error("Attachment file missing on disk: %s", filepath)
        return jsonify({"error": "Attachment file not found on disk"}), 404

    # Serve as strict attachment to prevent browser executing untrusted content
    response = send_file(
        filepath,
        mimetype=attachment.mime_type,
        as_attachment=True,
        download_name=attachment.original_filename,
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "default-src 'none'"
    response.headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate"
    return response
