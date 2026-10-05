"""Admin-only patient and doctor account management APIs."""

import logging

from flask import Blueprint, jsonify
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.auth.utils import normalize_email, require_role, validate_email, validate_password
from app.extensions import db
from app.models import DoctorProfile, User, UserRole
from app.services.management import (
    admin_patient_data,
    api_error,
    doctor_data,
    parse_pagination,
    patient_query,
    request_object,
    valid_phone,
    valid_profile_text,
    validate_experience,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
logger = logging.getLogger("management")
CREATE_DOCTOR_FIELDS = {
    "full_name", "email", "phone", "password", "specialization",
    "experience_years", "license_number", "bio",
}
UPDATE_DOCTOR_FIELDS = {
    "full_name", "email", "phone", "specialization",
    "experience_years", "license_number", "bio",
}


def _page(query, page: int, limit: int, serializer):
    result = query.order_by(User.full_name, User.id).paginate(
        page=page, per_page=limit, error_out=False
    )
    return jsonify(
        data=[serializer(user) for user in result.items],
        pagination={"page": page, "limit": limit, "total": result.total, "pages": result.pages},
    ), 200


@admin_bp.get("/patients")
@require_role(UserRole.ADMIN)
def list_patients():
    params, error = parse_pagination()
    if error:
        return error
    page, limit, search = params
    query = patient_query()
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(User.full_name.ilike(pattern), User.email.ilike(pattern)))
    logger.info("Admin listed patients")
    return _page(query, page, limit, admin_patient_data)


@admin_bp.get("/patients/<int:patient_id>")
@require_role(UserRole.ADMIN)
def get_patient(patient_id: int):
    if patient_id <= 0:
        return api_error("Patient was not found.", 404, "NOT_FOUND")
    user = patient_query().filter_by(id=patient_id).first()
    if user is None:
        return api_error("Patient was not found.", 404, "NOT_FOUND")
    logger.info("Admin viewed patient (user_id=%s)", user.id)
    return jsonify(data=admin_patient_data(user)), 200


@admin_bp.patch("/patients/<int:patient_id>/status")
@require_role(UserRole.ADMIN)
def update_patient_status(patient_id: int):
    payload, error = request_object({"is_active"})
    if error:
        return error
    if patient_id <= 0 or not isinstance(payload.get("is_active"), bool):
        return api_error("A boolean is_active value is required.", 400)
    user = patient_query().filter_by(id=patient_id).first()
    if user is None:
        return api_error("Patient was not found.", 404, "NOT_FOUND")
    user.is_active = payload["is_active"]
    db.session.commit()
    logger.info("Admin changed patient status (user_id=%s, active=%s)", user.id, user.is_active)
    return jsonify(data={"id": user.id, "is_active": user.is_active}), 200


@admin_bp.get("/doctors")
@require_role(UserRole.ADMIN)
def list_doctors():
    params, error = parse_pagination()
    if error:
        return error
    page, limit, search = params
    query = User.query.filter(User.role == UserRole.DOCTOR).outerjoin(
        DoctorProfile, DoctorProfile.user_id == User.id
    )
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(User.full_name.ilike(pattern), User.email.ilike(pattern), DoctorProfile.specialization.ilike(pattern)))
    logger.info("Admin listed doctors")
    return _page(query, page, limit, lambda user: doctor_data(user, include_account=True))


@admin_bp.get("/doctors/<int:doctor_id>")
@require_role(UserRole.ADMIN)
def get_doctor(doctor_id: int):
    if doctor_id <= 0:
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    user = User.query.filter_by(id=doctor_id, role=UserRole.DOCTOR).first()
    if user is None or user.doctor_profile is None:
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    logger.info("Admin viewed doctor (user_id=%s)", user.id)
    return jsonify(data=doctor_data(user, include_account=True)), 200


@admin_bp.post("/doctors")
@require_role(UserRole.ADMIN)
def create_doctor():
    payload, error = request_object(CREATE_DOCTOR_FIELDS)
    if error:
        return error
    required = ("full_name", "email", "password", "specialization", "license_number")
    if any(not payload.get(field) for field in required):
        return api_error("Full name, email, password, specialization, and license number are required.", 400)
    name, email = payload["full_name"], payload["email"]
    specialization, license_number = payload["specialization"], payload["license_number"]
    phone, password = payload.get("phone"), payload["password"]
    experience, bio = payload.get("experience_years"), payload.get("bio")
    valid_password, _ = validate_password(password)
    if not valid_profile_text(name, 255, minimum=2):
        return api_error("Full name must be between 2 and 255 characters.", 400)
    if not validate_email(email):
        return api_error("Email address is invalid.", 400)
    if not valid_password:
        return api_error("Password must be between 8 and 128 characters.", 400)
    if phone is not None and not valid_phone(phone):
        return api_error("Phone must be 7 to 20 characters in a valid format.", 400)
    if not valid_profile_text(specialization, 255, minimum=1):
        return api_error("Specialization must be between 1 and 255 characters.", 400)
    if not valid_profile_text(license_number, 100, minimum=1):
        return api_error("License number must be between 1 and 100 characters.", 400)
    if not validate_experience(experience):
        return api_error("Experience must be an integer between 0 and 80.", 400)
    if bio is not None and not valid_profile_text(bio, 2000):
        return api_error("Bio must be 2,000 characters or fewer.", 400)

    normalized_email = normalize_email(email)
    if User.query.filter_by(email=normalized_email).first():
        return api_error("Email or license number is already in use.", 409, "CONFLICT")
    user = User(
        full_name=name.strip(), email=normalized_email,
        phone=phone.strip() or None if isinstance(phone, str) else phone,
        role=UserRole.DOCTOR, is_active=True,
    )
    user.set_password(password)
    profile = DoctorProfile(
        user=user, specialization=specialization.strip(),
        license_number=license_number.strip(), experience_years=experience,
        bio=bio.strip() or None if isinstance(bio, str) else bio,
    )
    db.session.add_all([user, profile])
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error("Email or license number is already in use.", 409, "CONFLICT")
    logger.info("Admin created doctor (user_id=%s)", user.id)
    return jsonify(data=doctor_data(user, include_account=True)), 201


@admin_bp.patch("/doctors/<int:doctor_id>")
@require_role(UserRole.ADMIN)
def update_doctor(doctor_id: int):
    payload, error = request_object(UPDATE_DOCTOR_FIELDS)
    if error:
        return error
    if not payload:
        return api_error("At least one editable field is required.", 400)
    if doctor_id <= 0:
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    user = User.query.filter_by(id=doctor_id, role=UserRole.DOCTOR).first()
    if user is None or user.doctor_profile is None:
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    profile = user.doctor_profile
    if "full_name" in payload:
        if not valid_profile_text(payload["full_name"], 255, minimum=2):
            return api_error("Full name must be between 2 and 255 characters.", 400)
        user.full_name = payload["full_name"].strip()
    if "email" in payload:
        if not validate_email(payload["email"]):
            return api_error("Email address is invalid.", 400)
        email = normalize_email(payload["email"])
        if User.query.filter(User.email == email, User.id != user.id).first():
            return api_error("Email is already in use.", 409, "CONFLICT")
        user.email = email
    if "phone" in payload:
        if not valid_phone(payload["phone"]):
            return api_error("Phone must be 7 to 20 characters in a valid format.", 400)
        user.phone = payload["phone"].strip() or None if isinstance(payload["phone"], str) else payload["phone"]
    if "specialization" in payload:
        if not valid_profile_text(payload["specialization"], 255, minimum=1):
            return api_error("Specialization must be between 1 and 255 characters.", 400)
        profile.specialization = payload["specialization"].strip()
    if "license_number" in payload:
        if not valid_profile_text(payload["license_number"], 100, minimum=1):
            return api_error("License number must be between 1 and 100 characters.", 400)
        profile.license_number = payload["license_number"].strip()
    if "experience_years" in payload:
        if not validate_experience(payload["experience_years"]):
            return api_error("Experience must be an integer between 0 and 80.", 400)
        profile.experience_years = payload["experience_years"]
    if "bio" in payload:
        value = payload["bio"]
        if value is not None and value != "" and not valid_profile_text(value, 2000):
            return api_error("Bio must be 2,000 characters or fewer.", 400)
        profile.bio = value.strip() or None if isinstance(value, str) else value
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error("Email or license number is already in use.", 409, "CONFLICT")
    logger.info("Admin updated doctor (user_id=%s)", user.id)
    return jsonify(data=doctor_data(user, include_account=True)), 200


@admin_bp.patch("/doctors/<int:doctor_id>/status")
@require_role(UserRole.ADMIN)
def update_doctor_status(doctor_id: int):
    payload, error = request_object({"is_active"})
    if error:
        return error
    if doctor_id <= 0 or not isinstance(payload.get("is_active"), bool):
        return api_error("A boolean is_active value is required.", 400)
    user = User.query.filter_by(id=doctor_id, role=UserRole.DOCTOR).first()
    if user is None:
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    user.is_active = payload["is_active"]
    db.session.commit()
    logger.info("Admin changed doctor status (user_id=%s, active=%s)", user.id, user.is_active)
    return jsonify(data={"id": user.id, "is_active": user.is_active}), 200
