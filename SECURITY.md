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

Reusable `require_authentication`, `require_role`, `is_resource_owner`, and `is_authorized_doctor` helpers enforce identity/role or explicit `patient_id`/`doctor_id` ownership. Appointment APIs apply role-specific ownership filters in Flask; frontend route checks are not access control.

## Frontend — IMPLEMENTED

`/login` and `/register` use a shared API service with `credentials: include`, show validation, 401, and rate-limit errors, and do not store tokens in localStorage. Patient/doctor/admin route guards are UX checks only. Public registration has no role selector.

## Verification — TESTED

The backend test suite covers registration, hash handling, login failures/status, logout, current-user behavior, role checks, role-tampering, and rate limiting. See the turn log for the exact command/result. Docker/MySQL and browser end-to-end checks must be performed in the target environment before claiming deployment verification.

## Operational Guardrails

- Keep production secrets out of source control and rotate any exposed values.
- Keep authorization and validation in the backend.
- Use synthetic patient data in development and demos.
- Configure HTTPS, a strong Flask secret, explicit frontend origins, and shared limiter storage before multi-worker deployment.

## Patient and Doctor Management — IMPLEMENTED

- `GET/PATCH /api/patients/me` is PATIENT-only and selects the profile by the authenticated account. Patients may update only `full_name`, `phone`, `date_of_birth`, `gender`, `blood_group`, and `address`; unsupported gender/blood-group values, future dates, malformed phone numbers, and oversized text are rejected. Email, role, `is_active`, IDs, hashes, and timestamps cannot be changed here.
- `GET/PATCH /api/doctors/me` is DOCTOR-only and allows only name, phone, specialization, experience, and bio updates. License number and account status are admin-controlled.
- Patient-only `GET /api/doctors` and `GET /api/doctors/<id>` show active doctors' name, specialization, experience, and bio. License, email, phone, and account status are omitted.
- Admin-only `/api/admin/patients` and `/api/admin/doctors` support bounded pagination, search, and detail views. Admins can create/update doctor accounts and activate/deactivate patient or doctor accounts. Account deactivation preserves historical references; destructive deletion is not implemented.
- Admin doctor creation always assigns `DOCTOR`, hashes the initial password, and creates one `User` plus one `DoctorProfile`. Unexpected fields such as `role` are rejected. Duplicate email or license conflicts return a safe 409.
- Search uses SQLAlchemy ORM filters with bounded text; `limit` is capped at 100. Mutations with an untrusted Origin are rejected.
- Patient/doctor account access is enforced in Flask. UI route guards are only a navigation aid. Appointment authorization is documented below; medical-record APIs and unrestricted doctor access to patient records remain out of scope.

## Phase 4 Verification — TESTED

Backend pytest suite: 95 passed. Frontend TypeScript check, Next lint, and optimized build passed. Docker/MySQL and live browser end-to-end testing were unavailable in this environment, so those remain unverified.

## Appointment Management — IMPLEMENTED

- Patients create appointments with only `doctor_id`, `start_at`, `end_at`, and `reason`. Flask derives patient ID and `PENDING` status from trusted server state; it rejects unexpected fields, inactive/missing doctors or patients, malformed/naive timestamps, past start times, nonpositive or over-four-hour durations, and empty/oversized reasons.
- `GET /api/appointments/my` is patient-scoped and paginated with status and period filters. Appointment detail is scoped by patient or doctor assignment; unauthorized and missing IDs both return 404. Patients can cancel only their own pending/confirmed future appointments.
- Doctors use `/api/doctor/appointments` and its action routes. The authenticated doctor ID is the only schedule scope. Doctor views expose only the associated patient's ID/name. Admin-only `/api/admin/appointments` supports bounded pagination, search, status, doctor, and date filters; admin summaries omit appointment reason.
- State transitions are limited to PENDING → CONFIRMED/CANCELLED and CONFIRMED → COMPLETED/CANCELLED. Confirm and cancel require the appointment to remain in the future; completion requires its end time to have passed. Completed and cancelled states are terminal.
- Overlap uses `existing.start_at < requested.end_at AND existing.end_at > requested.start_at`, excluding cancelled appointments. Booking locks the doctor's user row, performs a locking/current overlap read, and inserts within the same transaction. The current read is needed because authentication may already have opened a repeatable-read snapshot before a request waits on the doctor lock. This serializes bookings by doctor on MySQL/InnoDB; SQLite ignores row locks, and no concurrent MySQL integration test was run, so this is the selected mitigation rather than a claim of proven race-free production behavior. Availability checks are advisory and booking checks again.
- Times require ISO 8601 with an explicit UTC offset. The backend normalizes to UTC, stores UTC-naive values in the existing MySQL `DATETIME` columns, and serializes UTC with `Z`; the frontend renders in the browser's timezone. Cancellation has no arbitrary lead-time cutoff: pending/confirmed appointments can be cancelled only before their start.
- Audit events record appointment IDs and actor/user IDs for create, transition, conflicts, and denied access. They do not log reason text or other clinical details. API responses do not expose tokens, password hashes, internal DB errors, or notes.

## Appointment Verification — TESTED / ENVIRONMENT LIMITED

Automated SQLite tests cover patient booking and identity derivation, invalid and mass-assigned fields, inactive doctors, time validation, overlap and adjacent slots, cancelled-slot release, patient and doctor object authorization, status transitions and timing, admin role/filter/pagination behavior, and safe response fields. The SQLite suite cannot verify MySQL row-lock concurrency. Docker/MySQL and live browser end-to-end checks are environment-level validation and must be reported separately from the passing automated tests.

## Secure Medical Records — Phase 6

- `POST /api/medical-records` is DOCTOR-only. It accepts only `appointment_id`, `diagnosis`, `notes`, and `prescription`; the appointment must be completed and assigned to the authenticated doctor. Patient and doctor IDs are copied from the authorized appointment. A unique index on nullable `medical_records.appointment_id` permits legacy unlinked rows while limiting linked appointments to one primary record.
- `GET /api/patients/me/medical-records` scopes its query to the authenticated patient and accepts only bounded pagination. `GET /api/medical-records/<id>` returns a record only to its patient. `GET /api/doctor/medical-records` and `GET/PATCH /api/doctor/medical-records/<id>` require an appointment link whose doctor and patient match the record and current doctor. Unknown and unauthorized object IDs return the same 404 response. There is no DELETE or admin clinical-record route.
- Request schemas reject unknown fields and invalid types/lengths. Text is returned as ordinary JSON and rendered as React text; there is no HTML injection sink. SQL access uses SQLAlchemy ORM bound parameters. Responses omit email, phone, account status, profile details, and credentials; doctor records expose only the associated patient's name and ID needed for context.
- Audit events include actor, role/action, record/appointment identifiers, count, and outcome where relevant. Diagnosis, notes, and prescription values are never included in logs. The existing one-to-many ORM relationship remains compatible; application creation enforces a single linked record. The migration adds an index only and makes no destructive changes. If an existing database already contains duplicate non-null appointment links, migration fails without deleting records and must be resolved by an authorized data owner before retrying.
- SQLite tests cover authentication/role denial, completed and assigned appointment checks, identity derivation, duplicate prevention, field allowlists/limits, patient ownership, doctor appointment scope, unlinked legacy record denial, no-delete behavior, and audit-content exclusion. XSS input is preserved as text and React escapes it at render time; raw SQL is not constructed from user input. These tests do not prove browser behavior or MySQL locking semantics.

Phase 6 browser and Docker/MySQL verification must be reported from the actual environment; automated backend, frontend lint/type/build results are recorded in `docs/logs.txt`.
