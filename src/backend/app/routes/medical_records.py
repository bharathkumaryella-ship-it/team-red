"""Patient-owned and doctor-assigned medical record APIs."""

import logging

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.auth.utils import get_current_user, require_role
from app.extensions import db
from app.models import Appointment, AppointmentStatus, MedicalRecord, UserRole
from app.services.management import api_error

medical_records_bp = Blueprint("medical_records", __name__, url_prefix="/api")
logger = logging.getLogger("medical_records")
MAX_TEXT = {"diagnosis": 2000, "notes": 10000, "prescription": 5000}
MAX_ID = 2_147_483_647


def _record_data(record, *, doctor_view=False):
    data = {
        "id": record.id,
        "appointment_id": record.appointment_id,
        "diagnosis": record.diagnosis,
        "notes": record.notes,
        "prescription": record.prescription,
        "created_at": record.created_at.isoformat() + "Z",
        "updated_at": record.updated_at.isoformat() + "Z",
        "doctor": {
            "id": record.doctor.id,
            "full_name": record.doctor.full_name,
            "specialization": record.doctor.doctor_profile.specialization if record.doctor.doctor_profile else None,
        },
    }
    if doctor_view:
        data["patient"] = {"id": record.patient.id, "full_name": record.patient.full_name}
    return data


def _validated_fields(payload, *, create):
    if not isinstance(payload, dict):
        return None, api_error("A JSON object is required.", 400, "INVALID_FIELDS")
    allowed = {"appointment_id", *MAX_TEXT} if create else set(MAX_TEXT)
    if not payload or set(payload) - allowed or (create and "appointment_id" not in payload):
        return None, api_error("Only the permitted medical record fields are accepted.", 400, "INVALID_FIELDS")
    if create:
        appointment_id = payload["appointment_id"]
        if not isinstance(appointment_id, int) or isinstance(appointment_id, bool) or not 1 <= appointment_id <= MAX_ID:
            return None, api_error("appointment_id must be a positive integer.", 400, "INVALID_FIELDS")
    parsed = {}
    for field, maximum in MAX_TEXT.items():
        if field not in payload:
            continue
        value = payload[field]
        if not isinstance(value, str) or len(value) > maximum:
            return None, api_error(f"{field} must be text of at most {maximum} characters.", 400, "INVALID_FIELDS")
        value = value.strip()
        if field == "diagnosis" and not value:
            return None, api_error("diagnosis is required and cannot be blank.", 400, "INVALID_FIELDS")
        parsed[field] = value or None
    if create and "diagnosis" not in parsed:
        return None, api_error("diagnosis is required.", 400, "INVALID_FIELDS")
    return ({"appointment_id": payload.get("appointment_id"), **parsed}, None)


def _doctor_record_query(user):
    return MedicalRecord.query.join(Appointment, MedicalRecord.appointment_id == Appointment.id).filter(
        MedicalRecord.doctor_id == user.id,
        Appointment.doctor_id == user.id,
        Appointment.patient_id == MedicalRecord.patient_id,
    )


@medical_records_bp.post("/medical-records")
@require_role(UserRole.DOCTOR)
def create_medical_record():
    fields, error = _validated_fields(request.get_json(silent=True), create=True)
    if error:
        return error
    user = get_current_user()
    appointment = Appointment.query.filter_by(id=fields["appointment_id"], doctor_id=user.id).with_for_update().first()
    if appointment is None:
        db.session.rollback()
        logger.warning("medical_record create denied (user_id=%s appointment_id=%s)", user.id, fields["appointment_id"])
        return api_error("Completed appointment was not found.", 404, "NOT_FOUND")
    if appointment.status != AppointmentStatus.COMPLETED:
        db.session.rollback()
        logger.warning("medical_record create rejected (user_id=%s appointment_id=%s reason=incomplete)", user.id, appointment.id)
        return api_error("A record can be created only for a completed appointment.", 409, "APPOINTMENT_NOT_COMPLETED")
    if MedicalRecord.query.filter_by(appointment_id=appointment.id).first():
        db.session.rollback()
        return api_error("A medical record already exists for this appointment.", 409, "RECORD_EXISTS")
    record = MedicalRecord(patient_id=appointment.patient_id, doctor_id=user.id, appointment_id=appointment.id,
                           diagnosis=fields["diagnosis"], notes=fields.get("notes"), prescription=fields.get("prescription"))
    db.session.add(record)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        logger.warning("medical_record create conflict (user_id=%s appointment_id=%s)", user.id, appointment.id)
        return api_error("A medical record already exists for this appointment.", 409, "RECORD_EXISTS")
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error("medical_record create failed (user_id=%s exception_type=%s)", user.id, type(exc).__name__)
        return api_error("The medical record could not be created.", 500, "INTERNAL_ERROR")
    logger.info("medical_record create (actor_id=%s record_id=%s appointment_id=%s)", user.id, record.id, appointment.id)
    return jsonify(data=_record_data(record, doctor_view=True)), 201


@medical_records_bp.get("/patients/me/medical-records")
@require_role(UserRole.PATIENT)
def list_patient_medical_records():
    if set(request.args) - {"page", "limit"}:
        return api_error("Only page and limit are accepted.", 400, "INVALID_FILTER")
    page, limit = request.args.get("page", "1"), request.args.get("limit", "20")
    if not page.isdigit() or not limit.isdigit() or not 1 <= int(page) <= 1_000_000 or not 1 <= int(limit) <= 100:
        return api_error("page and limit must be positive bounded integers.", 400, "INVALID_FILTER")
    user = get_current_user()
    result = MedicalRecord.query.filter_by(patient_id=user.id).order_by(MedicalRecord.created_at.desc(), MedicalRecord.id.desc()).paginate(
        page=int(page), per_page=int(limit), error_out=False
    )
    logger.info("medical_record list (actor_id=%s role=PATIENT count=%s)", user.id, len(result.items))
    return jsonify(data=[_record_data(item) for item in result.items], pagination={"page": result.page, "limit": result.per_page, "total": result.total, "pages": result.pages}), 200


@medical_records_bp.get("/medical-records/<int(min=1, max=2147483647):record_id>")
@require_role(UserRole.PATIENT)
def get_patient_medical_record(record_id):
    user = get_current_user()
    record = MedicalRecord.query.filter_by(id=record_id, patient_id=user.id).first()
    if record is None:
        logger.warning("medical_record read denied or missing (actor_id=%s record_id=%s)", user.id, record_id)
        return api_error("Medical record was not found.", 404, "NOT_FOUND")
    logger.info("medical_record read (actor_id=%s record_id=%s role=PATIENT)", user.id, record.id)
    return jsonify(data=_record_data(record)), 200


@medical_records_bp.get("/doctor/medical-records")
@require_role(UserRole.DOCTOR)
def list_doctor_medical_records():
    if set(request.args) - {"page", "limit"}:
        return api_error("Only page and limit are accepted.", 400, "INVALID_FILTER")
    page, limit = request.args.get("page", "1"), request.args.get("limit", "20")
    if not page.isdigit() or not limit.isdigit() or not 1 <= int(page) <= 1_000_000 or not 1 <= int(limit) <= 100:
        return api_error("page and limit must be positive bounded integers.", 400, "INVALID_FILTER")
    user = get_current_user()
    result = _doctor_record_query(user).order_by(MedicalRecord.created_at.desc(), MedicalRecord.id.desc()).paginate(
        page=int(page), per_page=int(limit), error_out=False
    )
    logger.info("medical_record list (actor_id=%s role=DOCTOR count=%s)", user.id, len(result.items))
    return jsonify(data=[_record_data(item, doctor_view=True) for item in result.items], pagination={"page": result.page, "limit": result.per_page, "total": result.total, "pages": result.pages}), 200


@medical_records_bp.get("/doctor/medical-records/<int(min=1, max=2147483647):record_id>")
@require_role(UserRole.DOCTOR)
def get_doctor_medical_record(record_id):
    user = get_current_user()
    record = _doctor_record_query(user).filter(MedicalRecord.id == record_id).first()
    if record is None:
        logger.warning("medical_record read denied or missing (actor_id=%s record_id=%s role=DOCTOR)", user.id, record_id)
        return api_error("Medical record was not found.", 404, "NOT_FOUND")
    logger.info("medical_record read (actor_id=%s record_id=%s role=DOCTOR)", user.id, record.id)
    return jsonify(data=_record_data(record, doctor_view=True)), 200


@medical_records_bp.patch("/doctor/medical-records/<int(min=1, max=2147483647):record_id>")
@require_role(UserRole.DOCTOR)
def update_doctor_medical_record(record_id):
    fields, error = _validated_fields(request.get_json(silent=True), create=False)
    if error:
        return error
    user = get_current_user()
    record = _doctor_record_query(user).filter(MedicalRecord.id == record_id).with_for_update().first()
    if record is None:
        db.session.rollback()
        logger.warning("medical_record update denied or missing (actor_id=%s record_id=%s)", user.id, record_id)
        return api_error("Medical record was not found.", 404, "NOT_FOUND")
    for key, value in fields.items():
        setattr(record, key, value)
    try:
        db.session.commit()
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error("medical_record update failed (actor_id=%s exception_type=%s)", user.id, type(exc).__name__)
        return api_error("The medical record could not be updated.", 500, "INTERNAL_ERROR")
    logger.info("medical_record update (actor_id=%s record_id=%s)", user.id, record.id)
    return jsonify(data=_record_data(record, doctor_view=True)), 200
