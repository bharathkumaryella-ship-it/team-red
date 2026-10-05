# MediDesk Security Notes

The Flask API is the security boundary. Frontend route guards improve navigation only; they do not replace backend authorization. The browser never connects directly to MySQL.

## Authentication — IMPLEMENTED

- `POST /api/auth/register` always creates a `PATIENT` and a `PatientProfile`. Client supplied roles are ignored. Email is trimmed/lowercased and unique; duplicate races return a safe 409.
- Passwords are hashed with Argon2id (`argon2-cffi`) using the library's per-password random salt. Responses never serialize hashes.
- `POST /api/auth/login` uses a generic invalid-credentials response and refuses inactive accounts. `POST /api/auth/logout` clears the Flask session cookie. `GET /api/auth/me` returns only safe user fields and returns 401 when unauthenticated.
- Authentication uses Flask's signed session cookie; it is HttpOnly, SameSite=Lax, and Secure in production. Local development disables Secure for HTTP. Sessions expire after 24 hours. Logout removes the browser's cookie; because Flask's default session is client-side signed, a previously copied cookie is not centrally revoked before expiry.
- Login and registration have configurable Flask-Limiter limits (`AUTH_LOGIN_LIMIT`, `AUTH_REGISTER_LIMIT`) and storage (`RATELIMIT_STORAGE_URI`). The default in-memory limiter is per process and is suitable for local/hackathon use; multi-worker production should use shared Redis storage.
- Cookie mutation endpoints reject a supplied Origin outside `CORS_ALLOWED_ORIGINS`; SameSite=Lax also limits cross-site cookie sending. Browser requests should include Origin. No synchronizer token is implemented.
- CORS allows only explicit configured origins and credentials. Production origins must be HTTPS; never use `*` with credentials.
- Safe audit events record success/failure, registration, logout, and authorization denial without passwords, tokens, or medical details. Request bodies and credential values are not logged.
- Security headers include CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. HSTS is emitted only in production; local HTTP does not provide HTTPS protection.

## Authorization — IMPLEMENTED FOUNDATION

Reusable `require_authentication`, `require_role`, `is_resource_owner`, and `is_authorized_doctor` helpers enforce identity/role or explicit `patient_id`/`doctor_id` ownership. No appointment, doctor-patient, medical-record, or admin CRUD endpoints are included in this phase. Helpers must be applied in future backend routes; frontend route checks are not access control.

## Frontend — IMPLEMENTED

`/login` and `/register` use a shared API service with `credentials: include`, show validation, 401, and rate-limit errors, and do not store tokens in localStorage. Patient/doctor/admin route guards are UX checks only. Public registration has no role selector.

## Verification — TESTED

The backend test suite covers registration, hash handling, login failures/status, logout, current-user behavior, role checks, role-tampering, and rate limiting. See the turn log for the exact command/result. Docker/MySQL and browser end-to-end checks must be performed in the target environment before claiming deployment verification.

## Operational Guardrails

- Keep production secrets out of source control and rotate any exposed values.
- Keep authorization and validation in the backend.
- Use synthetic patient data in development and demos.
- Configure HTTPS, a strong Flask secret, explicit frontend origins, and shared limiter storage before multi-worker deployment.
