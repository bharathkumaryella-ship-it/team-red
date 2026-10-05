"""Patient appointment booking and ownership-scoped appointment APIs."""

import logging

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.auth.utils import get_current_user, require_role
from app.extensions import db
from app.models import Appointment, AppointmentStatus, User, UserRole
from app.services.appointment_management import (
    appointment_data,
    appointment_period,
    appointment_window,
    MAX_DURATION,
    lock_active_doctor,
    overlapping_appointment,
    parse_api_datetime,
    parse_page_limit,
    parse_status,
    transition_appointment,
    utc_now_naive,
)
from app.services.management import api_error

appointments_bp = Blueprint("appointments", __name__, url_prefix="/api/appointments")
logger = logging.getLogger("appointments")


@appointments_bp.post("")
@require_role(UserRole.PATIENT)
def create_appointment():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return api_error("A JSON object is required.", 400)
    parsed, error = appointment_window(payload)
    if error:
        return error
    doctor_id, start_at, end_at, reason = parsed
    user = get_current_user()

    # Locking the doctor row makes concurrent bookings for that doctor serialize
    # on MySQL/InnoDB while the overlap query and insertion stay in one transaction.
    doctor = lock_active_doctor(doctor_id)
    if doctor is None or not doctor.is_active or doctor.doctor_profile is None:
        db.session.rollback()
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    if user is None or user.role != UserRole.PATIENT or user.patient_profile is None:
        db.session.rollback()
        return api_error("An active patient profile is required.", 403, "FORBIDDEN")
    if overlapping_appointment(doctor_id, start_at, end_at):
        db.session.rollback()
        logger.warning("Appointment booking rejected for occupied doctor slot (doctor_id=%s)", doctor_id)
        return api_error("The doctor is not available for that time.", 409, "SLOT_UNAVAILABLE")

    appointment = Appointment(
        patient_id=user.id,
        doctor_id=doctor_id,
        start_at=start_at,
        end_at=end_at,
        reason=reason,
        status=AppointmentStatus.PENDING,
    )
    db.session.add(appointment)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        logger.warning("Appointment booking rejected by a database constraint (doctor_id=%s)", doctor_id)
        return api_error("The appointment could not be booked for that time.", 409, "SLOT_UNAVAILABLE")
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error("Appointment booking failed; exception_type=%s", type(exc).__name__)
        return api_error("The appointment could not be created.", 500, "INTERNAL_ERROR")
    logger.info("Appointment created (appointment_id=%s, patient_id=%s, doctor_id=%s)", appointment.id, user.id, doctor_id)
    return jsonify(data=appointment_data(appointment, user)), 201


@appointments_bp.get("/availability")
@require_role(UserRole.PATIENT)
def check_availability():
    allowed = {"doctor_id", "start_at", "end_at"}
    if set(request.args) != allowed:
        return api_error("doctor_id, start_at, and end_at are required.", 400, "INVALID_FILTER")
    doctor_id = request.args.get("doctor_id", "")
    if not doctor_id.isdigit() or len(doctor_id) > 10 or not 1 <= int(doctor_id) <= 2_147_483_647:
        return api_error("doctor_id must be a positive integer.", 400, "INVALID_FILTER")
    start_at, end_at = parse_api_datetime(request.args.get("start_at")), parse_api_datetime(request.args.get("end_at"))
    if start_at is None or end_at is None or start_at <= utc_now_naive() or end_at <= start_at or end_at - start_at > MAX_DURATION:
        return api_error("A future ISO 8601 time range with an explicit UTC offset is required.", 400)
    doctor = User.query.filter_by(id=int(doctor_id), role=UserRole.DOCTOR, is_active=True).first()
    if doctor is None or doctor.doctor_profile is None:
        return api_error("Doctor was not found.", 404, "NOT_FOUND")
    available = overlapping_appointment(int(doctor_id), start_at, end_at) is None
    return jsonify(data={"doctor_id": int(doctor_id), "start_at": request.args["start_at"], "end_at": request.args["end_at"], "available": available}), 200


@appointments_bp.get("/my")
@require_role(UserRole.PATIENT)
def list_my_appointments():
    allowed = {"page", "limit", "status", "period"}
    if set(request.args) - allowed:
        return api_error("An unsupported appointment filter was provided.", 400, "INVALID_FILTER")
    paging, error = parse_page_limit()
    if error:
        return error
    page, limit = paging
    status, error = parse_status(request.args.get("status"))
    if error:
        return error
    user = get_current_user()
    query = Appointment.query.filter_by(patient_id=user.id)
    if status:
        query = query.filter(Appointment.status == status)
    query, error = appointment_period(query, request.args.get("period"))
    if error:
        return error
    result = query.order_by(Appointment.start_at.desc(), Appointment.id.desc()).paginate(page=page, per_page=limit, error_out=False)
    return jsonify(data=[appointment_data(item, user) for item in result.items], pagination={"page": page, "limit": limit, "total": result.total, "pages": result.pages}), 200


@appointments_bp.get("/<int(min=1, max=2147483647):appointment_id>")
@require_role(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
def get_appointment(appointment_id: int):
    user = get_current_user()
    query = Appointment.query.filter_by(id=appointment_id)
    if user.role == UserRole.PATIENT:
        query = query.filter_by(patient_id=user.id)
    elif user.role == UserRole.DOCTOR:
        query = query.filter_by(doctor_id=user.id)
    appointment = query.first()
    if appointment is None:
        logger.warning("Appointment detail denied or missing (user_id=%s, appointment_id=%s)", user.id, appointment_id)
        return api_error("Appointment was not found.", 404, "NOT_FOUND")
    return jsonify(data=appointment_data(appointment, user)), 200


@appointments_bp.post("/<int(min=1, max=2147483647):appointment_id>/cancel")
@require_role(UserRole.PATIENT)
def cancel_my_appointment(appointment_id: int):
    if request.get_json(silent=True) not in (None, {}):
        return api_error("Cancellation does not accept request fields.", 400, "INVALID_FIELDS")
    user = get_current_user()
    appointment = Appointment.query.filter_by(id=appointment_id, patient_id=user.id).with_for_update().first()
    if appointment is None:
        db.session.rollback()
        return api_error("Appointment was not found.", 404, "NOT_FOUND")
    error = transition_appointment(appointment, AppointmentStatus.CANCELLED)
    if error:
        db.session.rollback()
        logger.warning("Patient appointment cancellation rejected (appointment_id=%s, patient_id=%s)", appointment_id, user.id)
        return error
    db.session.commit()
    logger.info("Appointment cancelled (appointment_id=%s, patient_id=%s)", appointment.id, user.id)
    return jsonify(data=appointment_data(appointment, user)), 200
