"""Authenticated encryption helpers for clinical data at rest."""

from __future__ import annotations

from datetime import date
from functools import lru_cache

from cryptography.fernet import Fernet, MultiFernet
from flask import current_app
from sqlalchemy.types import Text, TypeDecorator

TEXT_MARKER = "enc:v1:"
FILE_MARKER = b"MEDIDESK:ENC:V1:"


@lru_cache(maxsize=32)
def _build_cipher(keys: tuple[str, ...]) -> MultiFernet:
    if not keys:
        raise RuntimeError("PHI encryption keys are not configured")
    return MultiFernet([Fernet(key.encode("ascii")) for key in keys])


def get_phi_cipher() -> MultiFernet:
    return _build_cipher(tuple(current_app.config["PHI_ENCRYPTION_KEYS"]))


def encrypt_text(value: str | date) -> str:
    plaintext = value.isoformat() if isinstance(value, date) else value
    if not isinstance(plaintext, str):
        raise TypeError("Encrypted clinical values must be text or dates")
    token = get_phi_cipher().encrypt(plaintext.encode("utf-8")).decode("ascii")
    return TEXT_MARKER + token


def decrypt_text(value: str) -> str:
    if not isinstance(value, str) or not value.startswith(TEXT_MARKER):
        raise ValueError("Clinical data is not encrypted or has an unsupported version")
    token = value[len(TEXT_MARKER):].encode("ascii")
    return get_phi_cipher().decrypt(token).decode("utf-8")


def encrypt_file(data: bytes) -> bytes:
    return FILE_MARKER + get_phi_cipher().encrypt(data)


def decrypt_file(data: bytes) -> bytes:
    if not data.startswith(FILE_MARKER):
        raise ValueError("Attachment data is not encrypted or has an unsupported version")
    return get_phi_cipher().decrypt(data[len(FILE_MARKER):])


class EncryptedText(TypeDecorator):
    """Store text as a versioned authenticated ciphertext in a TEXT column."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt_text(value)

    def process_result_value(self, value, dialect):
        return None if value is None else decrypt_text(value)


class EncryptedDate(EncryptedText):
    """Store dates encrypted while retaining ``date`` values in Python."""

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt_text(value)

    def process_result_value(self, value, dialect):
        return None if value is None else date.fromisoformat(decrypt_text(value))
