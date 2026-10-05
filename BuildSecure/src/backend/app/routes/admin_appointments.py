"""Admin appointment search and state-management API."""

import logging

from flask import Blueprint, jsonify, request

from app.auth.utils import get_current_user, require_role
from app.extensions import db
from app.models import Appointment, AppointmentStatus, UserRole
from app.services.appointment_management import admin_filters, appointment_data, transition_appointment
from app.services.management import api_error

admin_appointments_bp = Blueprint("admin_appointments", __name__, url_prefix="/api/admin/appointments")
logger = logging.getLogger("appointments")


@admin_appointments_bp.get("")
@require_role(UserRole.ADMIN)
def list_appointments():
    result, error = admin_filters(Appointment.query)
    if error:
        return error
    query, page, limit = result
    pagination = query.order_by(Appointment.start_at.desc(), Appointment.id.desc()).paginate(page=page, per_page=limit, error_out=False)
    user = get_current_user()
    return jsonify(data=[appointment_data(item, user) for item in pagination.items], pagination={"page": page, "limit": limit, "total": pagination.total, "pages": pagination.pages}), 200


@admin_appointments_bp.get("/<int(min=1, max=2147483647):appointment_id>")
@require_role(UserRole.ADMIN)
def get_appointment(appointment_id: int):
    appointment = Appointment.query.filter_by(id=appointment_id).first()
    if appointment is None:
        return api_error("Appointment was not found.", 404, "NOT_FOUND")
    return jsonify(data=appointment_data(appointment, get_current_user())), 200


@admin_appointments_bp.patch("/<int(min=1, max=2147483647):appointment_id>/status")
@require_role(UserRole.ADMIN)
def update_appointment_status(appointment_id: int):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) != {"status"}:
        return api_error("Only a supported status value is accepted.", 400, "INVALID_FIELDS")
    try:
        target = AppointmentStatus(payload["status"])
    except (ValueError, TypeError):
        return api_error("Status must be PENDING, CONFIRMED, COMPLETED, or CANCELLED.", 400, "INVALID_STATUS")
    appointment = Appointment.query.filter_by(id=appointment_id).with_for_update().first()
    if appointment is None:
        db.session.rollback()
        return api_error("Appointment was not found.", 404, "NOT_FOUND")
    error = transition_appointment(appointment, target)
    if error:
        db.session.rollback()
        logger.warning("Admin appointment transition rejected (appointment_id=%s, actor_id=%s)", appointment_id, get_current_user().id)
        return error
    db.session.commit()
    logger.info("Admin changed appointment status (appointment_id=%s, status=%s, actor_id=%s)", appointment.id, target.value, get_current_user().id)
    return jsonify(data=appointment_data(appointment, get_current_user())), 200
