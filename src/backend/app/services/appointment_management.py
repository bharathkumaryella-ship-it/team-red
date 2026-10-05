"""Appointment validation, filtering, serialization, and state transitions."""

from datetime import UTC, date, datetime, time, timedelta

from flask import request
from sqlalchemy import or_, select
from sqlalchemy.orm import aliased

from app.extensions import db
from app.models import Appointment, AppointmentStatus, User, UserRole
from app.services.management import api_error

MAX_DURATION = timedelta(hours=4)
ALLOWED_TRANSITIONS = {
    AppointmentStatus.PENDING: {AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED},
    AppointmentStatus.CONFIRMED: {AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED},
    AppointmentStatus.COMPLETED: set(),
    AppointmentStatus.CANCELLED: set(),
}


def utc_now_naive() -> datetime:
    """Return UTC as a naive datetime for the existing MySQL DATETIME columns."""
    return datetime.now(UTC).replace(tzinfo=None)


def parse_api_datetime(value):
    """Parse an ISO 8601 timestamp with an explicit UTC offset into UTC-naive."""
    if not isinstance(value, str) or len(value) > 40:
        return None
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00" if value.endswith(("Z", "z")) else value)
    except ValueError:
        return None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return None
    return parsed.astimezone(UTC).replace(tzinfo=None)


def utc_iso(value: datetime) -> str:
    """Serialize stored UTC-naive or aware timestamps as explicit UTC ISO 8601."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def appointment_data(appointment: Appointment, viewer: User) -> dict:
    doctor = appointment.doctor
    patient = appointment.patient
    data = {
        "id": appointment.id,
        "start_at": utc_iso(appointment.start_at),
        "end_at": utc_iso(appointment.end_at),
        "status": appointment.status.value,
        "reason": appointment.reason,
        "created_at": utc_iso(appointment.created_at),
        "doctor": {
            "id": doctor.id,
            "full_name": doctor.full_name,
            "specialization": doctor.doctor_profile.specialization if doctor.doctor_profile else None,
        },
    }
    if viewer.role == UserRole.PATIENT:
        return data
    data["patient"] = {"id": patient.id, "full_name": patient.full_name}
    if viewer.role == UserRole.ADMIN:
        data.pop("reason")
    return data


def parse_page_limit():
    page_raw, limit_raw = request.args.get("page", "1"), request.args.get("limit", "20")
    if not page_raw.isdigit() or not limit_raw.isdigit() or len(page_raw) > 7 or len(limit_raw) > 3:
        return None, api_error("Page and limit must be positive integers.", 400, "INVALID_PAGINATION")
    page, limit = int(page_raw), int(limit_raw)
    if page < 1 or page > 1_000_000 or limit < 1 or limit > 100:
        return None, api_error("Page must be positive and limit must be between 1 and 100.", 400, "INVALID_PAGINATION")
    return (page, limit), None


def parse_status(value):
    if value is None or value == "":
        return None, None
    try:
        return AppointmentStatus(value.upper()), None
    except (ValueError, AttributeError):
        return None, api_error("Status must be PENDING, CONFIRMED, COMPLETED, or CANCELLED.", 400, "INVALID_STATUS")


def appointment_period(query, period: str | None):
    if period in (None, "all", ""):
        return query, None
    now = utc_now_naive()
    if period == "upcoming":
        return query.filter(Appointment.start_at >= now, Appointment.status != AppointmentStatus.CANCELLED), None
    if period in {"history", "past"}:
        return query.filter(or_(Appointment.start_at < now, Appointment.status == AppointmentStatus.CANCELLED)), None
    return query, api_error("Period must be upcoming, history, or all.", 400, "INVALID_PERIOD")


def appointment_window(payload):
    if set(payload) != {"doctor_id", "start_at", "end_at", "reason"}:
        return None, api_error("Only doctor_id, start_at, end_at, and reason are accepted.", 400, "INVALID_FIELDS")
    doctor_id = payload.get("doctor_id")
    if not isinstance(doctor_id, int) or isinstance(doctor_id, bool) or doctor_id <= 0:
        return None, api_error("doctor_id must be a positive integer.", 400)
    start_at, end_at = parse_api_datetime(payload.get("start_at")), parse_api_datetime(payload.get("end_at"))
    if start_at is None or end_at is None:
        return None, api_error("start_at and end_at must be valid ISO 8601 timestamps with a UTC offset.", 400)
    duration = end_at - start_at
    if duration <= timedelta(0) or duration > MAX_DURATION:
        return None, api_error("Appointment duration must be greater than zero and no more than four hours.", 400)
    if start_at <= utc_now_naive():
        return None, api_error("Appointments must start in the future.", 400)
    reason = payload.get("reason")
    if not isinstance(reason, str) or not reason.strip() or len(reason.strip()) > 500:
        return None, api_error("Reason must contain between 1 and 500 characters.", 400)
    return (doctor_id, start_at, end_at, reason.strip()), None


def transition_appointment(appointment: Appointment, target: AppointmentStatus, *, now=None):
    """Enforce the state graph and the timing rule for actions that change state."""
    now = now or utc_now_naive()
    if target not in ALLOWED_TRANSITIONS[appointment.status]:
        return api_error("This appointment cannot make that status transition.", 409, "INVALID_TRANSITION")
    if target in {AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED} and appointment.start_at <= now:
        return api_error("Appointments can only be confirmed or cancelled before they start.", 409, "APPOINTMENT_STARTED")
    if target == AppointmentStatus.COMPLETED and appointment.end_at > now:
        return api_error("An appointment can be completed only after its end time.", 409, "APPOINTMENT_NOT_ENDED")
    appointment.status = target
    return None


def lock_active_doctor(doctor_id: int):
    """Serialize slot checks on the doctor's InnoDB user row when using MySQL."""
    return db.session.execute(
        select(User).where(User.id == doctor_id, User.role == UserRole.DOCTOR).with_for_update()
    ).scalar_one_or_none()


def overlapping_appointment(doctor_id: int, start_at: datetime, end_at: datetime):
    # Use a locking/current read: the request authentication query may already
    # have opened a REPEATABLE READ snapshot before the doctor row lock waits.
    return Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status != AppointmentStatus.CANCELLED,
        Appointment.start_at < end_at,
        Appointment.end_at > start_at,
    ).with_for_update().first()


def admin_filters(query):
    allowed = {"page", "limit", "search", "status", "doctor_id", "date", "date_from", "date_to"}
    if set(request.args) - allowed:
        return None, api_error("An unsupported appointment filter was provided.", 400, "INVALID_FILTER")
    paging, error = parse_page_limit()
    if error:
        return None, error
    page, limit = paging
    status, error = parse_status(request.args.get("status"))
    if error:
        return None, error
    if status:
        query = query.filter(Appointment.status == status)
    doctor_id = request.args.get("doctor_id")
    if doctor_id is not None:
        if not doctor_id.isdigit() or len(doctor_id) > 10 or not 1 <= int(doctor_id) <= 2_147_483_647:
            return None, api_error("doctor_id must be a positive integer.", 400, "INVALID_FILTER")
        query = query.filter(Appointment.doctor_id == int(doctor_id))
    dates = {}
    for key in ("date", "date_from", "date_to"):
        raw = request.args.get(key)
        if raw:
            try:
                dates[key] = date.fromisoformat(raw)
            except ValueError:
                return None, api_error(f"{key} must use YYYY-MM-DD.", 400, "INVALID_FILTER")
            if dates[key].isoformat() != raw:
                return None, api_error(f"{key} must use YYYY-MM-DD.", 400, "INVALID_FILTER")
    if "date" in dates and ({"date_from", "date_to"} & dates.keys()):
        return None, api_error("Use date or a date range, not both.", 400, "INVALID_FILTER")
    if "date" in dates and ({"date_from", "date_to"} & dates.keys()):
        return None, api_error("Use date or a date range, not both.", 400, "INVALID_FILTER")
    if "date_from" in dates and "date_to" in dates and dates["date_from"] > dates["date_to"]:
        return None, api_error("date_from must not be after date_to.", 400, "INVALID_FILTER")
    if "date" in dates:
        start = datetime.combine(dates["date"], time.min)
        query = query.filter(Appointment.start_at >= start)
        if dates["date"] < date.max:
            query = query.filter(Appointment.start_at < start + timedelta(days=1))
    else:
        if "date_from" in dates:
            query = query.filter(Appointment.start_at >= datetime.combine(dates["date_from"], time.min))
        if "date_to" in dates and dates["date_to"] < date.max:
            query = query.filter(Appointment.start_at < datetime.combine(dates["date_to"] + timedelta(days=1), time.min))
    search = request.args.get("search", "").strip()
    if len(search) > 100:
        return None, api_error("Search must be 100 characters or fewer.", 400, "INVALID_SEARCH")
    if search:
        patient = aliased(User)
        doctor = aliased(User)
        query = query.join(patient, patient.id == Appointment.patient_id).join(doctor, doctor.id == Appointment.doctor_id)
        pattern = f"%{search}%"
        query = query.filter(or_(patient.full_name.ilike(pattern), patient.email.ilike(pattern), doctor.full_name.ilike(pattern)))
    return (query, page, limit), None
