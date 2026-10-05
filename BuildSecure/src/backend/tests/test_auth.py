"""Comprehensive authentication tests."""

import pytest
from flask import session

from app import create_app
from app.extensions import db
from app.models import User, UserRole, PatientProfile


@pytest.fixture
def app():
    """Create and configure a test Flask application."""
    app = create_app(config_name="testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def test_patient(app):
    """Create a test patient user."""
    user = User(
        email="patient@test.example",
        full_name="Test Patient",
        phone="+1-555-0001",
        role=UserRole.PATIENT,
        is_active=True,
    )
    user.set_password("SecurePassword123")
    profile = PatientProfile(user=user)
    db.session.add(user)
    db.session.add(profile)
    db.session.commit()
    return user


@pytest.fixture
def test_doctor(app):
    """Create a test doctor user."""
    from app.models import DoctorProfile

    user = User(
        email="doctor@test.example",
        full_name="Test Doctor",
        phone="+1-555-0002",
        role=UserRole.DOCTOR,
        is_active=True,
    )
    user.set_password("SecurePassword123")
    profile = DoctorProfile(
        user=user,
        specialization="General Practice",
        license_number="LIC-001",
        experience_years=5,
    )
    db.session.add(user)
    db.session.add(profile)
    db.session.commit()
    return user


@pytest.fixture
def test_admin(app):
    """Create a test admin user."""
    user = User(
        email="admin@test.example",
        full_name="Test Admin",
        phone="+1-555-0003",
        role=UserRole.ADMIN,
        is_active=True,
    )
    user.set_password("SecurePassword123")
    db.session.add(user)
    db.session.commit()
    return user


class TestPasswordHashing:
    """Test password hashing functionality."""

    def test_password_hashing(self, app):
        """Password should be hashed with Argon2id, not plaintext."""
        with app.app_context():
            user = User(email="test@example.com", full_name="Test", role=UserRole.PATIENT)
            user.set_password("MySecurePassword123")

            assert user.password_hash is not None
            assert user.password_hash != "MySecurePassword123"
            assert "$argon2" in user.password_hash or "$2" in user.password_hash

    def test_password_verification(self, app):
        """Correct password should verify."""
        with app.app_context():
            user = User(email="test@example.com", full_name="Test", role=UserRole.PATIENT)
            user.set_password("MySecurePassword123")

            assert user.verify_password("MySecurePassword123") is True

    def test_password_verification_fails_wrong_password(self, app):
        """Wrong password should not verify."""
        with app.app_context():
            user = User(email="test@example.com", full_name="Test", role=UserRole.PATIENT)
            user.set_password("MySecurePassword123")

            assert user.verify_password("WrongPassword") is False

    def test_password_never_in_hash(self, app):
        """Password hash should not contain plaintext password."""
        with app.app_context():
            password = "MySecurePassword123"
            user = User(email="test@example.com", full_name="Test", role=UserRole.PATIENT)
            user.set_password(password)

            assert password not in user.password_hash

    def test_password_minimum_length(self, app):
        """Password shorter than 8 characters should fail."""
        with app.app_context():
            user = User(email="test@example.com", full_name="Test", role=UserRole.PATIENT)
            with pytest.raises(ValueError, match="at least 8 characters"):
                user.set_password("short")


class TestRegistration:
    """Test patient registration endpoint."""

    def test_successful_registration(self, client):
        """Successful registration should create patient user."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "New Patient",
                "email": "newpatient@example.com",
                "phone": "+1-555-0100",
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["email"] == "newpatient@example.com"
        assert data["full_name"] == "New Patient"
        assert data["role"] == "PATIENT"
        assert "password_hash" not in data

    def test_registration_creates_patient_profile(self, client, app):
        """Registration should create associated patient profile."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "New Patient",
                "email": "newpatient@example.com",
                "phone": "+1-555-0100",
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 201
        with app.app_context():
            user = User.query.filter_by(email="newpatient@example.com").first()
            assert user is not None
            assert user.patient_profile is not None

    def test_registration_role_tampering_ignored(self, client):
        """Malicious role in registration should be ignored, always PATIENT."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "Attacker",
                "email": "attacker@example.com",
                "phone": "+1-555-0101",
                "password": "SecurePassword123",
                "role": "ADMIN",  # Malicious attempt
            },
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["role"] == "PATIENT"  # Must be PATIENT, not ADMIN

    def test_cookie_auth_rejects_untrusted_origin(self, client):
        response = client.post(
            "/api/auth/login",
            json={"email": "patient@test.example", "password": "irrelevant"},
            headers={"Origin": "https://attacker.example"},
        )
        assert response.status_code == 403

    def test_registration_doctor_role_ignored(self, client):
        """Attempt to register as DOCTOR should be ignored, always PATIENT."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "Fake Doctor",
                "email": "fakedoctor@example.com",
                "phone": "+1-555-0102",
                "password": "SecurePassword123",
                "role": "DOCTOR",  # Malicious attempt
            },
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["role"] == "PATIENT"

    def test_registration_invalid_email(self, client):
        """Invalid email format should be rejected."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "Test User",
                "email": "not-an-email",
                "phone": "+1-555-0103",
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 400
        data = response.get_json()
        assert "email" in data.get("errors", {})

    def test_registration_invalid_phone(self, client):
        """Invalid phone format should be rejected."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "Test User",
                "email": "test@example.com",
                "phone": "123",  # Too short
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 400
        data = response.get_json()
        assert "phone" in data.get("errors", {})

    def test_registration_short_password(self, client):
        """Password shorter than 8 characters should be rejected."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "Test User",
                "email": "test@example.com",
                "phone": "+1-555-0104",
                "password": "short",
            },
        )

        assert response.status_code == 400
        data = response.get_json()
        assert "password" in data.get("errors", {})

    def test_registration_duplicate_email(self, client, test_patient):
        """Duplicate email should return 409 Conflict."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "Another User",
                "email": test_patient.email,
                "phone": "+1-555-0105",
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 409
        data = response.get_json()
        assert "Email already registered" in data["error"]

    def test_registration_email_normalized(self, client):
        """Email should be normalized (lowercased)."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "Test User",
                "email": "TestUser@Example.COM",
                "phone": "+1-555-0106",
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["email"] == "testuser@example.com"

    def test_registration_invalid_full_name_empty(self, client):
        """Empty full name should be rejected."""
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "",
                "email": "test@example.com",
                "phone": "+1-555-0107",
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 400
        data = response.get_json()
        assert "full_name" in data.get("errors", {})

    def test_registration_rate_limiting(self, client):
        """Registration should be rate limited."""
        for i in range(6):  # Limit is 5 per hour
            response = client.post(
                "/api/auth/register",
                json={
                    "full_name": f"User {i}",
                    "email": f"user{i}@example.com",
                    "phone": "+1-555-0200",
                    "password": "SecurePassword123",
                },
            )
            if i < 5:
                assert response.status_code == 201
            else:
                assert response.status_code == 429  # Rate limit exceeded


class TestLogin:
    """Test login endpoint."""

    def test_successful_login(self, client, test_patient):
        """Successful login should establish session."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email,
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["email"] == test_patient.email
        assert data["role"] == "PATIENT"
        assert "password_hash" not in data

    def test_login_sets_session_cookie(self, client, test_patient):
        """Login should set secure session cookie."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email,
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 200
        # Check that session cookie is set
        assert "Set-Cookie" in response.headers

    def test_login_invalid_email(self, client):
        """Login with unknown email should return generic error."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": "unknown@example.com",
                "password": "SomePassword123",
            },
        )

        assert response.status_code == 401
        data = response.get_json()
        assert "Invalid email or password" in data["error"]

    def test_login_wrong_password(self, client, test_patient):
        """Login with wrong password should return generic error."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email,
                "password": "WrongPassword123",
            },
        )

        assert response.status_code == 401
        data = response.get_json()
        assert "Invalid email or password" in data["error"]

    def test_login_inactive_account(self, client, app):
        """Login to inactive account should be rejected."""
        with app.app_context():
            user = User(
                email="inactive@example.com",
                full_name="Inactive User",
                role=UserRole.PATIENT,
                is_active=False,
            )
            user.set_password("SecurePassword123")
            db.session.add(user)
            db.session.commit()

        response = client.post(
            "/api/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 401
        data = response.get_json()
        assert "Invalid email or password" in data["error"]

    def test_login_missing_password(self, client):
        """Login without password should be rejected."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com"},
        )

        assert response.status_code == 400

    def test_login_missing_email(self, client):
        """Login without email should be rejected."""
        response = client.post(
            "/api/auth/login",
            json={"password": "SecurePassword123"},
        )

        assert response.status_code == 400

    def test_login_rate_limiting(self, client, test_patient):
        """Login should be rate limited."""
        for i in range(11):  # Limit is 10 per hour
            response = client.post(
                "/api/auth/login",
                json={
                    "email": test_patient.email,
                    "password": "WrongPassword",
                },
            )
            if i < 10:
                assert response.status_code == 401
            else:
                assert response.status_code == 429

    def test_login_email_case_insensitive(self, client, test_patient):
        """Login email should be case insensitive."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email.upper(),
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 200


class TestLogout:
    """Test logout endpoint."""

    def test_logout_clears_session(self, client, test_patient):
        """Logout should clear session."""
        # Login first
        client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email,
                "password": "SecurePassword123",
            },
        )

        # Logout
        response = client.post("/api/auth/logout")
        assert response.status_code == 200

    def test_logout_when_not_authenticated(self, client):
        """Logout when not authenticated should return 200."""
        response = client.post("/api/auth/logout")
        assert response.status_code == 200


class TestCurrentUser:
    """Test /api/auth/me endpoint."""

    def test_get_current_user_authenticated(self, client, test_patient):
        """Authenticated user should get current user info."""
        # Login first
        client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email,
                "password": "SecurePassword123",
            },
        )

        # Get current user
        response = client.get("/api/auth/me")
        assert response.status_code == 200
        data = response.get_json()
        assert data["email"] == test_patient.email
        assert data["role"] == "PATIENT"
        assert "password_hash" not in data

    def test_get_current_user_unauthenticated(self, client):
        """Unauthenticated request to /api/auth/me should return 401."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401


class TestRoleRecognition:
    """Test that roles are correctly recognized."""

    def test_patient_role_recognized(self, client, test_patient):
        """Patient role should be recognized in login."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email,
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["role"] == "PATIENT"

    def test_doctor_role_recognized(self, client, test_doctor):
        """Doctor role should be recognized in login."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_doctor.email,
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["role"] == "DOCTOR"

    def test_admin_role_recognized(self, client, test_admin):
        """Admin role should be recognized in login."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_admin.email,
                "password": "SecurePassword123",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["role"] == "ADMIN"


class TestAuthorizationDecorators:
    """Test authorization decorators."""

    def test_require_authentication_decorator(self, client, app):
        """@require_authentication should block unauthenticated requests."""
        # Create a test endpoint with require_authentication
        from app.auth import require_authentication

        @app.route("/api/test/protected", methods=["GET"])
        @require_authentication
        def protected_endpoint():
            return {"message": "protected"}, 200

        response = client.get("/api/test/protected")
        assert response.status_code == 401

    def test_require_role_decorator_admin(self, client, app, test_admin):
        """@require_role('ADMIN') should allow admin."""
        from app.auth import require_role
        from app.models import UserRole

        @app.route("/api/test/admin", methods=["GET"])
        @require_role(UserRole.ADMIN)
        def admin_endpoint():
            return {"message": "admin"}, 200

        # Login as admin
        client.post(
            "/api/auth/login",
            json={
                "email": test_admin.email,
                "password": "SecurePassword123",
            },
        )

        response = client.get("/api/test/admin")
        assert response.status_code == 200

    def test_require_role_decorator_patient_blocked_from_admin(self, client, app, test_patient):
        """Patient should not access admin-only endpoint."""
        from app.auth import require_role
        from app.models import UserRole

        @app.route("/api/test/admin-only", methods=["GET"])
        @require_role(UserRole.ADMIN)
        def admin_only_endpoint():
            return {"message": "admin"}, 200

        # Login as patient
        client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email,
                "password": "SecurePassword123",
            },
        )

        response = client.get("/api/test/admin-only")
        assert response.status_code == 403

    def test_require_role_multiple_roles(self, client, app, test_patient, test_doctor):
        """@require_role should allow multiple specified roles."""
        from app.auth import require_role
        from app.models import UserRole

        @app.route("/api/test/patient-or-doctor", methods=["GET"])
        @require_role(UserRole.PATIENT, UserRole.DOCTOR)
        def patient_or_doctor_endpoint():
            return {"message": "allowed"}, 200

        # Test patient access
        client.post(
            "/api/auth/login",
            json={
                "email": test_patient.email,
                "password": "SecurePassword123",
            },
        )
        response = client.get("/api/test/patient-or-doctor")
        assert response.status_code == 200

        # Logout and login as doctor
        client.post("/api/auth/logout")
        client.post(
            "/api/auth/login",
            json={
                "email": test_doctor.email,
                "password": "SecurePassword123",
            },
        )
        response = client.get("/api/test/patient-or-doctor")
        assert response.status_code == 200
