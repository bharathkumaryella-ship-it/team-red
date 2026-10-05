"""Doctor self-service and patient-facing doctor directory APIs."""

import logging
from sqlalchemy import or_

from flask import Blueprint, jsonify, request

from app.auth.utils import get_current_user, require_role
from app.extensions import db
from app.models import User, UserRole
from app.services.management import (
    api_error,
    doctor_data,
    doctor_query,
    parse_pagination,
    request_object,
    valid_phone,
    valid_profile_text,
    validate_experience,
)

doctors_bp = Blueprint("doctors", __name__, url_prefix="/api/doctors")
logger = logging.getLogger("management")
DOCTOR_FIELDS = {"full_name", "phone", "specialization", "experience_years", "bio"}


@doctors_bp.route("/me", methods=["GET"])
@require_role(UserRole.DOCTOR)
def get_my_doctor_profile():
    user = get_current_user()
    if user.doctor_profile is None:
        return api_error("Doctor profile was not found.", 404, "NOT_FOUND")
    return jsonify(data=doctor_data(user, include_account=True)), 200


@doctors_bp.route("/me", methods=["PUT", "PATCH"])
@require_role(UserRole.DOCTOR)
def update_my_doctor_profile():
    payload, error = request_object(DOCTOR_FIELDS)
    if error:
        return error
    if not payload:
        return api_error("At least one editable field is required.", 400)
    user = get_current_user()
    profile = user.doctor_profile
    if profile is None:
        return api_error("Doctor profile was not found.", 404, "NOT_FOUND")

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
    if "specialization" in payload:
        value = payload["specialization"]
        if not valid_profile_text(value, 255, minimum=1):
            return api_error("Specialization must be between 1 and 255 characters.", 400)
        profile.specialization = value.strip()
    if "experience_years" in payload:
        value = payload["experience_years"]
        if not validate_experience(value):
            return api_error("Experience must be an integer between 0 and 80.", 400)
        profile.experience_years = value
    if "bio" in payload:
        value = payload["bio"]
        if value is not None and value != "" and not valid_profile_text(value, 2000):
            return api_error("Bio must be 2,000 characters or fewer.", 400)
        profile.bio = value.strip() or None if isinstance(value, str) else value

    db.session.commit()
    logger.info("Doctor updated own profile (user_id=%s)", user.id)
    return jsonify(data=doctor_data(user, include_account=True)), 200


@doctors_bp.get("")
@require_role(UserRole.PATIENT)
def list_directory():
    params, error = parse_pagination()
    if error:
        return error
    page, limit, search = params
    query = doctor_query().filter(User.is_active.is_(True), User.doctor_profile.has())
    if search:
        pattern = f"%{search}%"
        from app.models import DoctorProfile
        query = query.outerjoin(DoctorProfile, DoctorProfile.user_id == User.id).filter(
            or_(User.full_name.ilike(pattern), DoctorProfile.specialization.ilike(pattern))
        )
    pagination = query.order_by(User.full_name, User.id).paginate(page=page, per_page=limit, error_out=False)
    return jsonify(
        data=[doctor_data(user) for user in pagination.items],
        pagination={"page": page, "limit": limit, "total": pagination.total, "pages": pagination.pages},
    ), 200


@doctors_bp.get("/<int:doctor_id>")
@require_role(UserRole.PATIENT)
def get_directory_doctor(doctor_id: int):
    if doctor_id <= 0:
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    user = doctor_query().filter_by(id=doctor_id, is_active=True).first()
    if user is None or user.doctor_profile is None:
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    return jsonify(data=doctor_data(user)), 200
