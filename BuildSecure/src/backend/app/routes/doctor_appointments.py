"""Doctor appointment schedule and authorized patient association API."""

import logging

from flask import Blueprint, jsonify, request

from app.auth.utils import get_current_user, require_role
from app.extensions import db
from app.models import Appointment, AppointmentStatus, UserRole
from app.services.appointment_management import appointment_data, appointment_period, parse_page_limit, parse_status, transition_appointment
from app.services.management import api_error

doctor_appointments_bp = Blueprint("doctor_appointments", __name__, url_prefix="/api/doctor/appointments")
logger = logging.getLogger("appointments")


@doctor_appointments_bp.get("")
@require_role(UserRole.DOCTOR)
def list_doctor_appointments():
    if set(request.args) - {"page", "limit", "status", "period"}:
        return api_error("An unsupported appointment filter was provided.", 400, "INVALID_FILTER")
    paging, error = parse_page_limit()
    if error:
        return error
    page, limit = paging
    status, error = parse_status(request.args.get("status"))
    if error:
        return error
    user = get_current_user()
    query = Appointment.query.filter_by(doctor_id=user.id)
    if status:
        query = query.filter(Appointment.status == status)
    query, error = appointment_period(query, request.args.get("period"))
    if error:
        return error
    result = query.order_by(Appointment.start_at.desc(), Appointment.id.desc()).paginate(page=page, per_page=limit, error_out=False)
    return jsonify(data=[appointment_data(item, user) for item in result.items], pagination={"page": page, "limit": limit, "total": result.total, "pages": result.pages}), 200


@doctor_appointments_bp.get("/<int(min=1, max=2147483647):appointment_id>")
@require_role(UserRole.DOCTOR)
def get_doctor_appointment(appointment_id: int):
    user = get_current_user()
    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=user.id).first()
    if appointment is None:
        logger.warning("Doctor appointment detail denied or missing (doctor_id=%s, appointment_id=%s)", user.id, appointment_id)
        return api_error("Appointment was not found.", 404, "NOT_FOUND")
    return jsonify(data=appointment_data(appointment, user)), 200


def _transition(appointment_id: int, target: AppointmentStatus):
    if request.get_json(silent=True) not in (None, {}):
        return api_error("Appointment actions do not accept request fields.", 400, "INVALID_FIELDS")
    user = get_current_user()
    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=user.id).with_for_update().first()
    if appointment is None:
        db.session.rollback()
        logger.warning("Doctor appointment action denied or missing (doctor_id=%s, appointment_id=%s)", user.id, appointment_id)
        return api_error("Appointment was not found.", 404, "NOT_FOUND")
    error = transition_appointment(appointment, target)
    if error:
        db.session.rollback()
        logger.warning("Appointment transition rejected (appointment_id=%s, actor_id=%s)", appointment_id, user.id)
        return error
    db.session.commit()
    logger.info("Appointment status changed (appointment_id=%s, status=%s, actor_id=%s)", appointment.id, target.value, user.id)
    return jsonify(data=appointment_data(appointment, user)), 200


@doctor_appointments_bp.post("/<int(min=1, max=2147483647):appointment_id>/confirm")
@require_role(UserRole.DOCTOR)
def confirm_appointment(appointment_id: int):
    return _transition(appointment_id, AppointmentStatus.CONFIRMED)


@doctor_appointments_bp.post("/<int(min=1, max=2147483647):appointment_id>/complete")
@require_role(UserRole.DOCTOR)
def complete_appointment(appointment_id: int):
    return _transition(appointment_id, AppointmentStatus.COMPLETED)


@doctor_appointments_bp.post("/<int(min=1, max=2147483647):appointment_id>/cancel")
@require_role(UserRole.DOCTOR)
def cancel_appointment(appointment_id: int):
    return _transition(appointment_id, AppointmentStatus.CANCELLED)
