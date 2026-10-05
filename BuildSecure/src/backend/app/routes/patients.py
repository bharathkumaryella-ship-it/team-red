"""Authenticated patient self-service profile API."""

import logging

from flask import Blueprint, jsonify

from app.auth.utils import get_current_user, require_role
from app.extensions import db
from app.models import UserRole
from app.services.management import (
    api_error,
    parse_date,
    patient_data,
    request_object,
    valid_phone,
    valid_profile_text,
)

patients_bp = Blueprint("patients", __name__, url_prefix="/api/patients")
logger = logging.getLogger("management")
PATIENT_FIELDS = {"full_name", "phone", "date_of_birth", "gender", "blood_group", "address"}


@patients_bp.route("/me", methods=["GET"])
@require_role(UserRole.PATIENT)
def get_my_profile():
    user = get_current_user()
    if user.patient_profile is None:
        return api_error("Patient profile was not found.", 404, "NOT_FOUND")
    return jsonify(data=patient_data(user)), 200


@patients_bp.route("/me", methods=["PUT", "PATCH"])
@require_role(UserRole.PATIENT)
def update_my_profile():
    payload, error = request_object(PATIENT_FIELDS)
    if error:
        return error
    if not payload:
        return api_error("At least one editable field is required.", 400)

    user = get_current_user()
    profile = user.patient_profile
    if profile is None:
        return api_error("Patient profile was not found.", 404, "NOT_FOUND")

    if "full_name" in payload:
        value = payload["full_name"]
        if not valid_profile_text(value, 255, minimum=2):
            return api_error("Full name must be between 2 and 255 characters.", 400)
        user.full_name = value.strip()
    if "phone" in payload:
        value = payload["phone"]
        if not valid_phone(value):
            return api_error("Phone must be 7 to 20 characters in a valid format.", 400)
        user.phone = value.strip() or None if isinstance(value, str) else value
    if "date_of_birth" in payload:
        value, message = parse_date(payload["date_of_birth"])
        if message:
            return api_error(message, 400)
        profile.date_of_birth = value
    if "gender" in payload:
        value = payload["gender"]
        allowed_genders = {"FEMALE", "MALE", "NON_BINARY", "OTHER", "PREFER_NOT_TO_SAY"}
        if value is not None and value != "" and (
            not valid_profile_text(value, 50, minimum=1) or value.strip().upper() not in allowed_genders
        ):
            return api_error("Gender must be one of the supported values.", 400)
        profile.gender = value.strip().upper() or None if isinstance(value, str) else value
    if "blood_group" in payload:
        value = payload["blood_group"]
        allowed_blood_groups = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"}
        if value is not None and value != "" and (
            not isinstance(value, str) or value.strip().upper() not in allowed_blood_groups
        ):
            return api_error("Blood group must be a supported ABO/Rh value.", 400)
        profile.blood_group = value.strip().upper() or None if isinstance(value, str) else value
    if "address" in payload:
        value = payload["address"]
        if value is not None and value != "" and not valid_profile_text(value, 500):
            return api_error("Address must be 500 characters or fewer.", 400)
        profile.address = value.strip() or None if isinstance(value, str) else value

    db.session.commit()
    logger.info("Patient updated own profile (user_id=%s)", user.id)
    return jsonify(data=patient_data(user)), 200
