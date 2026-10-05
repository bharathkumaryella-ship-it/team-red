"""Encrypt existing PHI and ensure attachment storage exists."""

import os
import uuid
from datetime import date, datetime
from pathlib import Path

import sqlalchemy as sa
from alembic import op
from cryptography.fernet import Fernet, MultiFernet
from flask import current_app
from sqlalchemy import inspect

from app.security.phi_encryption import FILE_MARKER, TEXT_MARKER
from app.security.malware_scan import scan_upload

revision = "f5a7c1e92b40"
down_revision = "9c27f4d8a611"
branch_labels = None
depends_on = None


def _cipher():
    keys = current_app.config.get("PHI_ENCRYPTION_KEYS") or tuple(
        key.strip() for key in os.environ.get("PHI_ENCRYPTION_KEYS", "").split(",") if key.strip()
    )
    if not keys:
        raise RuntimeError("PHI_ENCRYPTION_KEYS is required to migrate clinical data")
    return MultiFernet([Fernet(key.encode("ascii")) for key in keys])


def _stored_text(cipher, value):
    if value is None:
        return None
    plaintext = value.isoformat() if isinstance(value, (date, datetime)) else str(value)
    if plaintext.startswith(TEXT_MARKER):
        cipher.decrypt(plaintext[len(TEXT_MARKER):].encode("ascii"))
        return plaintext
    return TEXT_MARKER + cipher.encrypt(plaintext.encode("utf-8")).decode("ascii")


def _encrypt_columns(cipher, table, columns):
    connection = op.get_bind()
    selected = ", ".join(["id", *columns])
    result = connection.execute(sa.text(f"SELECT {selected} FROM {table}"))
    update = sa.text(
        f"UPDATE {table} SET "
        + ", ".join(f"{column} = :{column}" for column in columns)
        + " WHERE id = :id"
    )
    while rows := result.mappings().fetchmany(200):
        updates = []
        for row in rows:
            changed = {column: _stored_text(cipher, row[column]) for column in columns}
            if any(changed[column] != row[column] for column in columns):
                updates.append({"id": row["id"], **changed})
        if updates:
            connection.execute(update, updates)


def _ensure_user_security_columns():
    columns = {column["name"] for column in inspect(op.get_bind()).get_columns("users")}
    if "token_version" not in columns:
        op.add_column(
            "users",
            sa.Column("token_version", sa.Integer(), nullable=False, server_default="1"),
        )
    if "failed_login_attempts" not in columns:
        op.add_column(
            "users",
            sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
        )
    if "locked_until" not in columns:
        op.add_column("users", sa.Column("locked_until", sa.DateTime(), nullable=True))


def _ensure_attachment_table():
    if "medical_attachments" in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "medical_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("record_id", sa.Integer(), nullable=False),
        sa.Column("uploader_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("storage_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("sha256_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["record_id"], ["medical_records.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploader_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_filename"),
    )
    op.create_index(
        "ix_medical_attachments_record_id",
        "medical_attachments",
        ["record_id"],
        unique=False,
    )


def _alter_to_text(table, column_name):
    column = next(
        column for column in inspect(op.get_bind()).get_columns(table)
        if column["name"] == column_name
    )
    if isinstance(column["type"], sa.Text):
        return
    with op.batch_alter_table(table) as batch:
        batch.alter_column(
            column_name,
            existing_type=column["type"],
            type_=sa.Text(),
            existing_nullable=column["nullable"],
        )


def _encrypt_existing_files(cipher):
    storage_dir = Path(current_app.instance_path) / "secure_attachments"
    connection = op.get_bind()
    result = connection.execute(
        sa.text("SELECT storage_filename FROM medical_attachments")
    )
    while rows := result.mappings().fetchmany(200):
        for row in rows:
            name = row["storage_filename"]
            if not isinstance(name, str) or Path(name).name != name:
                raise RuntimeError("Unsafe attachment storage name encountered during migration")
            source = storage_dir / name
            if not source.is_file():
                continue
            content = source.read_bytes()
            if content.startswith(FILE_MARKER):
                cipher.decrypt(content[len(FILE_MARKER):])
                continue

            # Scan legacy plaintext before encrypting it. The scanner fails closed.
            scan_upload(content)
            encrypted = FILE_MARKER + cipher.encrypt(content)
            temporary = storage_dir / f".{name}.{uuid.uuid4().hex}.tmp"
            try:
                with temporary.open("xb") as output:
                    output.write(encrypted)
                os.chmod(temporary, 0o600)
                os.replace(temporary, source)
            finally:
                temporary.unlink(missing_ok=True)


def upgrade():
    cipher = _cipher()
    _ensure_user_security_columns()
    _ensure_attachment_table()

    for table, columns in (
        ("users", ("phone",)),
        ("appointments", ("reason", "notes")),
        ("medical_records", ("diagnosis", "notes", "prescription")),
        ("patient_profiles", ("date_of_birth", "gender", "blood_group", "address")),
        ("medical_attachments", ("original_filename",)),
    ):
        for column in columns:
            _alter_to_text(table, column)

    _encrypt_columns(cipher, "users", ("phone",))
    _encrypt_columns(cipher, "appointments", ("reason", "notes"))
    _encrypt_columns(cipher, "medical_records", ("diagnosis", "notes", "prescription"))
    _encrypt_columns(cipher, "patient_profiles", ("date_of_birth", "gender", "blood_group", "address"))
    _encrypt_columns(cipher, "medical_attachments", ("original_filename",))
    _encrypt_existing_files(cipher)


def downgrade():
    raise RuntimeError(
        "This migration encrypts PHI and attachment files. Restore a pre-migration backup "
        "using its matching encryption keys instead of downgrading in place."
    )
