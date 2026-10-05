"""Authentication utilities and decorators."""

import re
import logging
from functools import wraps

from flask import g, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.models import User, UserRole
from app.extensions import db


# Initialize limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=None,
)


def validate_email(email: str) -> bool:
    """Validate email format.
    
    Args:
        email: Email address to validate.
        
    Returns:
        bool: True if valid, False otherwise.
    """
    if not email or not isinstance(email, str):
        return False
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return len(email) <= 255 and bool(re.match(pattern, email))


def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength.
    
    Args:
        password: Password to validate.
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not password or not isinstance(password, str):
        return False, "Password must be a non-empty string"
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if len(password) > 128:
        return False, "Password must not exceed 128 characters"
    return True, ""


def validate_full_name(full_name: str) -> bool:
    """Validate full name.
    
    Args:
        full_name: Full name to validate.
        
    Returns:
        bool: True if valid, False otherwise.
    """
    if not full_name or not isinstance(full_name, str):
        return False
    name = full_name.strip()
    if len(name) < 2 or len(name) > 255:
        return False
    return True


def validate_phone(phone: str) -> bool:
    """Validate phone number format.
    
    Args:
        phone: Phone number to validate.
        
    Returns:
        bool: True if valid, False otherwise.
    """
    if not phone or not isinstance(phone, str):
        return False
    phone = phone.strip()
    if len(phone) < 7 or len(phone) > 20:
        return False
    # Allow digits, +, -, (, ), and spaces
    return bool(re.match(r"^[\d+\-() ]{7,20}$", phone))


def normalize_email(email: str) -> str:
    """Normalize email for consistent storage and comparison.
    
    Args:
        email: Email to normalize.
        
    Returns:
        str: Normalized email (lowercase, trimmed).
    """
    return email.strip().lower()


def get_current_user():
    """Get currently authenticated user from session.
    
    Returns:
        User: Current user if authenticated, None otherwise.
    """
    user_id = getattr(g, "user_id", None)
    if not user_id:
        return None
    try:
        user = db.session.get(User, int(user_id))
        return user if user and user.is_active else None
    except (ValueError, TypeError):
        return None


def require_authentication(f):
    """Decorator to require authentication.
    
    Returns 401 Unauthorized if user is not authenticated.
    
    Args:
        f: Flask route function.
        
    Returns:
        Decorated function that checks authentication.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            logging.getLogger("auth").warning("Unauthenticated access attempt")
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return decorated_function


def require_role(*allowed_roles):
    """Decorator to require specific role(s).
    
    Returns 403 Forbidden if user role is not authorized.
    
    Args:
        allowed_roles: One or more UserRole values.
        
    Returns:
        Decorator function.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                logging.getLogger("auth").warning("Unauthenticated role-protected access attempt")
                return jsonify({"error": "Unauthorized"}), 401
            
            # Check if user role is in allowed roles
            normalized_roles = {
                role if isinstance(role, UserRole) else UserRole(str(role).upper())
                for role in allowed_roles
            }
            if user.role not in normalized_roles:
                logging.getLogger("auth").warning(
                    "Authorization denied (user_id=%s, role=%s)", user.id, user.role.value
                )
                return jsonify({"error": "Forbidden"}), 403
            
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def is_resource_owner(user: User, resource) -> bool:
    """Return true only when a resource's patient_id matches this user's id."""
    return bool(
        user
        and user.is_active
        and user.role == UserRole.PATIENT
        and getattr(resource, "patient_id", None) == user.id
    )


def is_authorized_doctor(user: User, resource) -> bool:
    """Authorize a doctor only for a resource explicitly assigned to that doctor."""
    return bool(
        user
        and user.is_active
        and user.role == UserRole.DOCTOR
        and getattr(resource, "doctor_id", None) == user.id
    )


def safe_user_info(user: User) -> dict:
    """Return safe user information for API responses.
    
    Never includes password_hash, secrets, or sensitive data.
    
    Args:
        user: User model instance.
        
    Returns:
        dict: Safe user information.
    """
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
    }
