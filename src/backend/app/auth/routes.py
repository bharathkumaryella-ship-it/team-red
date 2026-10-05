"""Authentication blueprint with register, login, logout, and me endpoints."""

import logging

from flask import Blueprint, current_app, request, jsonify, session
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import User, UserRole, PatientProfile
from app.auth.utils import (
    limiter,
    validate_email,
    validate_password,
    validate_full_name,
    validate_phone,
    normalize_email,
    get_current_user,
    require_authentication,
    safe_user_info,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Logger for security events
auth_logger = logging.getLogger("auth")


@auth_bp.before_request
def protect_cookie_auth_from_cross_site_posts():
    """Reject browser mutations whose Origin is outside the configured allowlist."""
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None
    origin = request.headers.get("Origin")
    if origin and origin.rstrip("/") not in current_app.config["CORS_ALLOWED_ORIGINS"]:
        return jsonify({"error": "Request origin is not allowed"}), 403
    return None


@auth_bp.route("/register", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_REGISTER_LIMIT"])
def register():
    """Register a new patient account.
    
    Public endpoint that always creates PATIENT role accounts.
    Malicious role tampering is ignored; all new users are patients.
    
    Request body:
        - full_name: str (required, 2-255 chars)
        - email: str (required, valid email format)
        - phone: str (required, 7-20 chars, digits and +- () spaces)
        - password: str (required, min 8 chars)
        
    Response:
        201: Account created
        400: Validation error (safe message)
        409: Email already exists
        429: Rate limit exceeded
        500: Unexpected error
    """
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "A JSON object is required"}), 400

        # Extract input fields
        full_name = data.get("full_name", "")
        email = data.get("email", "")
        phone = data.get("phone", "")
        password = data.get("password", "")
        if isinstance(full_name, str):
            full_name = full_name.strip()
        if isinstance(email, str):
            email = email.strip()
        if isinstance(phone, str):
            phone = phone.strip()

        # Validate input
        errors = {}

        if not validate_full_name(full_name):
            errors["full_name"] = "Full name must be 2-255 characters"
        if not validate_email(email):
            errors["email"] = "Invalid email format"
        if not phone or not validate_phone(phone):
            errors["phone"] = "Phone must be 7-20 characters"
        is_valid_password, password_error = validate_password(password)
        if not is_valid_password:
            errors["password"] = password_error

        if errors:
            return jsonify({"errors": errors}), 400

        # Normalize email
        email = normalize_email(email)

        # Check for existing email
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            auth_logger.warning("Registration rejected: duplicate email")
            return jsonify({"error": "Email already registered"}), 409

        # Create new patient user
        user = User(
            email=email,
            full_name=full_name,
            phone=phone or None,
            role=UserRole.PATIENT,  # Always create PATIENT, ignore client role
            is_active=True,
        )
        user.set_password(password)

        # Create associated patient profile
        patient_profile = PatientProfile(user=user)

        db.session.add(user)
        db.session.add(patient_profile)
        db.session.commit()

        auth_logger.info("New patient registered (user_id=%s)", user.id)

        return jsonify(safe_user_info(user)), 201

    except IntegrityError:
        db.session.rollback()
        auth_logger.warning("Registration rejected by a database integrity constraint")
        return jsonify({"error": "Email already registered"}), 409
    except Exception as e:
        db.session.rollback()
        auth_logger.error("Registration failed; exception_type=%s", type(e).__name__)
        return jsonify({"error": "Registration failed"}), 500


@auth_bp.route("/login", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_LOGIN_LIMIT"])
def login():
    """Authenticate user and establish session.
    
    Request body:
        - email: str (required)
        - password: str (required)
        
    Response:
        200: Login successful, session cookie set
        400: Invalid request format
        401: Invalid email or password (generic error, no user enumeration)
        429: Rate limit exceeded
        500: Unexpected error
    """
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "A JSON object is required"}), 400

        email = data.get("email", "")
        password = data.get("password", "")
        if not isinstance(email, str) or not isinstance(password, str):
            return jsonify({"error": "Email and password must be strings"}), 400
        email = email.strip()

        # Validate input presence
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        # Normalize email for lookup
        email = normalize_email(email)

        # Find user by email
        user = User.query.filter_by(email=email).first()

        # Verify password and account status
        if not user or not user.verify_password(password):
            auth_logger.warning("Failed login attempt")
            return jsonify({"error": "Invalid email or password"}), 401

        if not user.is_active:
            auth_logger.warning("Login attempt for inactive account (user_id=%s)", user.id)
            return jsonify({"error": "Invalid email or password"}), 401

        # Establish session
        session.clear()
        session["user_id"] = user.id
        session.permanent = True

        auth_logger.info("Successful login (user_id=%s)", user.id)

        return jsonify(safe_user_info(user)), 200

    except Exception as e:
        auth_logger.error("Login failed; exception_type=%s", type(e).__name__)
        return jsonify({"error": "Login failed"}), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clear authenticated session.
    
    Response:
        200: Logout successful (even if not authenticated)
    """
    try:
        user_id = session.get("user_id")
        if user_id is not None:
            auth_logger.info("Logout (user_id=%s)", user_id)
        session.clear()
        return jsonify({"message": "Logged out"}), 200
    except Exception as e:
        auth_logger.error("Logout completed after exception; exception_type=%s", type(e).__name__)
        return jsonify({"message": "Logged out"}), 200


@auth_bp.route("/me", methods=["GET"])
@require_authentication
def get_current_user_info():
    """Get currently authenticated user information.
    
    Response:
        200: User information
        401: Not authenticated
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(safe_user_info(user)), 200
