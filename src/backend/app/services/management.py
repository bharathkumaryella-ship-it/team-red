"""Shared validation, serialization, and pagination for management APIs."""

import re
from datetime import date
import re

from flask import jsonify, request

from app.models import User, UserRole


def api_error(message: str, status: int, code: str = "INVALID_REQUEST"):
    return jsonify(error={"code": code, "message": message}), status


def request_object(allowed_fields: set[str]):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None, api_error("A JSON object is required.", 400)
    extra = set(payload) - allowed_fields
    if extra:
        return None, api_error("Unexpected fields are not allowed.", 400, "UNEXPECTED_FIELDS")
    return payload, None


def patient_data(user: User) -> dict:
    profile = user.patient_profile
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "date_of_birth": profile.date_of_birth.isoformat() if profile and profile.date_of_birth else None,
        "gender": profile.gender if profile else None,
        "blood_group": profile.blood_group if profile else None,
        "address": profile.address if profile else None,
    }


def doctor_data(user: User, *, include_account: bool = False) -> dict:
    profile = user.doctor_profile
    result = {
        "id": user.id,
        "full_name": user.full_name,
        "specialization": profile.specialization if profile else "",
        "experience_years": profile.experience_years if profile else None,
        "bio": profile.bio if profile else None,
        "clinic_location": profile.clinic_location if profile else None,
    }
    if include_account:
        result.update(email=user.email, phone=user.phone, license_number=profile.license_number if profile else None, is_active=user.is_active)
    return result


def admin_patient_data(user: User) -> dict:
    return {**patient_data(user), "is_active": user.is_active}


def parse_pagination():
    raw_page = request.args.get("page", "1")
    raw_limit = request.args.get("limit", "20")
    if not raw_page.isdigit() or not raw_limit.isdigit() or len(raw_page) > 9 or len(raw_limit) > 3:
        return None, api_error("Page and limit must be positive integers.", 400, "INVALID_PAGINATION")
    page, limit = int(raw_page), int(raw_limit)
    if page < 1 or page > 1_000_000 or limit < 1 or limit > 100:
        return None, api_error("Page must be positive and limit must be between 1 and 100.", 400, "INVALID_PAGINATION")
    search = request.args.get("search", "").strip()
    if len(search) > 100:
        return None, api_error("Search must be 100 characters or fewer.", 400, "INVALID_SEARCH")
    return (page, limit, search), None


def valid_phone(value) -> bool:
    return value is None or (isinstance(value, str) and (value == "" or (7 <= len(value.strip()) <= 20 and re.fullmatch(r"[\d+()\- ]+", value.strip()) is not None)))


def valid_profile_text(value, maximum: int, *, minimum: int = 0) -> bool:
    return isinstance(value, str) and minimum <= len(value.strip()) <= maximum


def parse_date(value):
    if value is None or value == "":
        return None, None
    if not isinstance(value, str) or re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is None:
        return None, "Date of birth must use YYYY-MM-DD."
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None, "Date of birth must use YYYY-MM-DD."
    if parsed > date.today():
        return None, "Date of birth cannot be in the future."
    return parsed, None


def validate_experience(value, *, optional: bool = True):
    if value is None and optional:
        return True
    return isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 80


def patient_query():
    return User.query.filter(User.role == UserRole.PATIENT)


def doctor_query():
    return User.query.filter(User.role == UserRole.DOCTOR)

