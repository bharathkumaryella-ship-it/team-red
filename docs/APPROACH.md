# Project Approach & Architecture — MediDesk

**Team ID:** -06
**Project Name:** MediDesk
**Team Size:** 4 Members
**Primary Track / Domain:** Secure clinic and appointment management

---

## 1. Problem Understanding, Scope & Threat Model

### 1.1 Problem Statement & Real-World Motivation
MediDesk is a secure digital clinic platform for patient, doctor, and admin workflows. The first phase is intentionally limited to a strong backend and frontend foundation so the team can extend the domain safely in later stages. The primary security challenge is to keep user authorization and business logic in the backend while presenting only UX-safe role routes in the frontend.

### 1.2 Target Users & Personas
- Patient: registers, signs in, reviews doctor information, books appointments, and tracks own visits.
- Doctor: signs in, reviews appointments, manages schedule state, and accesses only authorized patient data.
- Admin: manages patient and doctor records and operational oversight. 

### 1.3 Threat Model & Attack Surface
- Critical assets: login credentials, appointment data, synthetic medical records, backend secrets, and deployment configuration.
- Potential attack vectors: injection, broken access control, credential stuffing, insecure CORS, environment leakage, and insecure secret handling.
- OWASP Top 10 focus: broken access control, insecure design, security misconfiguration, and unsafe exposure of sensitive data.

---

## 2. Technical Architecture & Secure System Design

### 2.1 High-Level Architecture Overview
The application uses a Next.js frontend and a Flask API with SQLAlchemy and MySQL. Phase 4 adds patient and doctor profile management, a patient-facing doctor directory, and admin management endpoints. The Flask backend remains the authorization boundary; credentials and database settings come from environment configuration.

### 2.2 Data Flow & Component Interaction
The browser sends credentialed requests to the Flask REST API, which checks the signed session, account status, and endpoint role before reading or changing records. Patient self-service routes address only the authenticated user's own profile. Admin routes use explicit allowlists and bounded pagination; doctor directory responses expose professional information only. The browser never connects directly to MySQL.

### 2.3 Technology Stack Rationale
- Backend: Flask + SQLAlchemy with MySQL via PyMySQL for a simple, modular Python API foundation.
- Frontend: Next.js TypeScript with App Router for a familiar secure web client architecture and route-based role pages.
- Deployment: Docker and Docker Compose to support local development and later public hosting.
- Security posture: environment-driven configuration, CORS restrictions, security headers, and generic error responses before business logic is added.

### 2.4 Defense-in-Depth Security Controls
1. Authentication & session security: Argon2id passwords and HttpOnly SameSite cookies; Secure cookies are enabled in production.
2. Authorization & access control: patient, doctor, and admin management endpoints enforce backend roles; self-service endpoints use the authenticated identity.
3. Input validation & mass assignment: field allowlists, bounded text/date/enum validation, safe ORM search, and capped pagination.
4. Rate limiting & abuse prevention: configurable login and registration limits; management writes validate data and identity.
5. Secrets & configuration hygiene: environment variables are required for secrets, database credentials, and CORS origins; production invalidates weak placeholder values.

### Phase 1 Decisions
- `DATABASE_URL` takes precedence over the MySQL component variables when set.
- The `/api/health` route is intentionally non-sensitive and performs no database connectivity checks.
- The app uses a Flask factory, modular blueprints, and environment selection to keep future domain development low-risk.
- The frontend uses a centralized API service layer and environment-based `NEXT_PUBLIC_API_URL` rather than hardcoded backend URLs.

---

## 3. Implementation Milestones & 24-Hour Timeline

| Milestone / Phase | Time Window | Key Objectives & Deliverables | Security Verification | Status |
|---|---|---|---|---|
| **Phase 1: Foundation & Setup** | 0h – 4h | Project structure, backend factory, health endpoint, MySQL config, secure frontend placeholders | Secret scan, route validation, baseline checks | `Complete` |
| **Phase 2: Core Domain & Models** | 4h – 12h | Database models, migrations, relationships, seed data, comprehensive tests | Model test suite (20/20 passing) | `Complete` |
| **Phase 3: Authentication & RBAC** | 12h - 18h | Sessions, registration/login, role helpers, rate limits | Auth and privilege tests | `Complete` |
| **Phase 4: Patient & Doctor Management** | 18h - 22h | Self-service profiles, directory, admin account management | Ownership, role, mass-assignment, search, pagination tests | `Complete` |
| **Phase 5: Appointment Management** | 22h - 24h | Patient booking/history/cancellation, doctor schedule and transitions, admin search/status | Ownership, IDOR, state machine, overlap, input, and pagination tests | `Complete` |
| **Phase 6: Medical Records** | 24h+ | Doctor-authored records linked to completed appointments with patient and doctor views | Record ownership, assignment, field allowlist, and clinical-data logging tests | `Complete` |
| **Phase 7: Security Hardening** | 24h+ | Defensive assessment, Docker hardening, CSRF origin checks, shared rate-limit requirement, and audit report | Focused security tests 3/3; frontend lint/type/build and Compose validation pass; full backend suite awaits local Redis client install (142/143 passed) | `Implemented; full local suite pending` |

---

## 4. Architecture Decision Records (ADRs)

### ADR-001: Keep the security boundary in Flask
- **Status:** Accepted
- **Context:** The project requires a secure clinic app where the browser is never trusted with direct data-plane access to the database.
- **Options Considered:**
  1. Put MySQL access directly in the frontend or server-rendered route logic.
  2. Keep all persistent access and authorization logic inside a dedicated Flask API boundary.
- **Decision & Rationale:** The Flask layer owns config, business logic, and future authorization checks. This ensures the backend remains the primary trust boundary.
- **Security & Performance Trade-offs:** Slightly more API plumbing, but much stronger control and easier security enforcement.

### ADR-002: Use environment-driven configuration for all secrets and endpoints
- **Status:** Accepted
- **Context:** Both the API and frontend need credentials and deployment-specific values without embedding production settings into source control.
- **Options Considered:**
  1. Hardcode connection details and URLs.
  2. Use `.env` templates and runtime environment injection.
- **Decision & Rationale:** The project uses `.env.example` and Docker environment variables so deployment is reproducible without exposing real credentials.
- **Security & Performance Trade-offs:** Requires careful environment setup, but it reduces secret leakage and makes public deployment safer.

### ADR-003: Keep database networking internal and fail closed for production abuse controls
- **Status:** Accepted
- **Context:** The local Compose stack previously exposed MySQL on the host and allowed production rate limiting to default to per-process memory.
- **Decision & Rationale:** Compose now requires environment-provided database credentials, leaves MySQL on the internal service network, and requires a shared persistent limiter backend in production. Local development retains explicit localhost frontend and backend ports.
- **Security & Performance Trade-offs:** Developers must copy and populate the root environment template, and production deployment must provision Redis or another supported shared limiter store. These requirements prevent accidental public database access and distributed rate-limit bypass.

---

## 5. Engineering Journal & Real-Time Decision Log

### 2026-10-05 15:21 IST — Phase 1 Foundation Locked
- **Focus:** Rebuild the project structure around the MediDesk prompt instead of earlier, conflicting instructions.
- **Key Challenges:** The repo contained a partial backend and no frontend foundation; the architecture needed to align cleanly with the Phase 1 requirements.
- **Resolution:** Keep the secure Flask foundation, add the missing Next.js routes and API service layer, and wire Docker Compose for local deployment.

### 2026-10-05 15:40 IST — Secure and modular foundation established
- **Focus:** Create a stable backend and UI shell that supports later patient/doctor/admin features without introducing business-domain functionality too early.
- **Key Challenges:** Avoid overbuilding business logic while still creating enough structure for later modules.
- **Resolution:** The backend exposes only health, the frontend includes placeholder pages, and all configuration remains environment based.

### 2026-10-05 19:30 IST — Phase 7 defensive hardening complete
- **Focus:** Assess and harden authentication boundaries, API ownership checks, Docker configuration, secrets templates, rate limiting, and response security.
- **Key Challenges:** Preserve the Phase 1-6 API contract while removing insecure Compose defaults and strengthening cookie mutation origin checks.
- **Resolution:** Removed the public MySQL port and literal Compose credentials, added non-root frontend execution and no-new-privileges, required shared production limiter storage, added production origin enforcement, and documented verified findings and remaining partial controls in `SECURITY_AUDIT.md`.

---

## 6. Testing, Security Verification & Deployment Record

### 6.1 Testing & Security Verification Strategy
- Unit tests validate the `/api/health` response shape and generic JSON error handling in the Flask backend.
- The backend also validates production configuration values for secrets and HTTPS CORS origins.
- The frontend uses a centralized fetch layer and environment variable configuration to avoid hardcoded URLs or credentials.

### 6.2 Deployment Verification
- Runtime stack: Docker Compose with MySQL, backend, and frontend services.
- Health check endpoint: `/api/health` on the Flask backend.
- Local deployment target: `http://localhost:3000` for the Next.js frontend and `http://localhost:5000` for the API.

---

## 7. Phase 2: Database Models & Migrations (Completed)

### 7.1 Core Data Models
Five SQLAlchemy ORM models were created to represent the clinic domain:

1. **User Model**
   - Fields: id, email (unique indexed), password_hash, full_name, phone, role (ENUM), is_active, created_at, updated_at
   - Relationships: one-to-one links to PatientProfile or DoctorProfile; one-to-many to Appointments and MedicalRecords
   - Constraints: email uniqueness enforced at database level

2. **PatientProfile Model**
   - Fields: id, user_id (FK unique), date_of_birth, gender, blood_group, address, timestamps
   - Relationships: one-to-one back-reference to User
   - Purpose: encapsulates patient-specific demographic data separate from authentication

3. **DoctorProfile Model**
   - Fields: id, user_id (FK unique), specialization (indexed), license_number (unique), experience_years, bio, timestamps
   - Relationships: one-to-one back-reference to User
   - Purpose: stores provider credentials and professional information

4. **Appointment Model**
   - Fields: id, patient_id (FK), doctor_id (FK), start_at (indexed), end_at, status (ENUM), reason, notes, timestamps
   - Relationships: many-to-one to both User (as patient and doctor); one-to-many to MedicalRecords
   - Constraints: 
     - `end_at > start_at` (check constraint enforced at DB level)
     - `patient_id != doctor_id` (check constraint to prevent self-appointments)
   - Statuses: PENDING, CONFIRMED, COMPLETED, CANCELLED

5. **MedicalRecord Model**
   - Fields: id, patient_id (FK indexed), doctor_id (FK indexed), appointment_id (FK optional), diagnosis, notes, prescription, timestamps
   - Relationships: many-to-one to User (as patient and doctor); optional many-to-one to Appointment
   - Purpose: doctor-documented clinical findings, diagnosis, and treatment prescriptions

### 7.2 Migration Strategy & Flask-Migrate
- Installed Flask-Migrate (Alembic) for versioned schema management
- Initialized Alembic folder structure and configuration
- Generated first automatic migration (`0d187483051c`) detecting all five tables, indexes, and constraints
- Migration applies safely to both SQLite (testing) and MySQL (production)
- All models are imported into the app factory so migrations detect schema changes automatically

### 7.3 Relationships & Cascade Behavior
- User → PatientProfile / DoctorProfile: cascade delete (deleting user removes profile)
- User → Appointments (both directions): cascade delete
- User → MedicalRecords (both directions): cascade delete
- Appointment → MedicalRecords: cascade delete
- Carefully avoided circular serialization and accidental data loss by using explicit foreign_keys on ambiguous relations

### 7.4 Testing & Verification
- **20 comprehensive tests** covering:
  - User creation (patient, doctor, admin roles)
  - Email uniqueness constraint
  - PatientProfile and DoctorProfile relationships
  - Doctor license number uniqueness
  - Appointment creation and time/user constraint validation
  - MedicalRecord creation with and without appointment links
  - Relationship traversal (e.g., user.patient_profile, appointment.medical_records)
  - Cascade delete behavior on all relationships
- **All 20 tests passing** with SQLite in-memory database
- `/api/health` endpoint verified working after schema additions

### 7.5 Development & Demo Data
- Created `app/seeds.py` with `seed_development_data()` function
- Generates demo users (3 patients, 2 doctors, 1 admin)
- Creates synthetic patient profiles, doctor profiles, appointments, and medical records
- Uses `DEMO-ONLY-Password123!` for all demo accounts
- Seed data is isolated to development and never commits real credentials

### 7.6 Security & Compliance Notes
- **Constraint Enforcement:** Database-level check constraints prevent invalid time ranges and self-appointments
- **Index Strategy:** Indexed foreign keys and commonly-queried fields (email, role, specialization, status, start_at) for optimal query performance
- **Cascade Policy:** Explicit cascade delete prevents orphaned records; appointments cascade their medical records for referential integrity
- **Date Handling:** Python `date` objects used for birth dates; datetime objects for appointment timestamps and audit trails
- **Enum Types:** Role and Status fields use Python Enums mapped to database ENUM columns for type safety

### 7.7 Phase 2 Roadmap Snapshot (Superseded by Phases 3–5 Below)
- Implement role-based authorization middleware in Flask routes
- Create REST API endpoints for /patients, /doctors, /appointments (GET, POST, PUT, DELETE)
- Add request validation schemas (marshmallow or Pydantic)
- Implement JWT authentication and token refresh logic
- Add fine-grained access control (patients see only own records, doctors see only their appointments)
- Enhance logging with structured audit trails
- Stress test with bulk data and concurrent appointments

## 8. Phase 3: Authentication & Authorization Foundation (Completed)

### 8.1 Authentication Design
- Patient registration creates a `User` and one-to-one `PatientProfile`; the role is fixed server-side to `PATIENT`, regardless of request fields.
- Argon2id hashes passwords with per-password salts. Login establishes a 24-hour Flask signed session cookie (HttpOnly, SameSite=Lax, Secure in production); logout clears it.
- Rate limits are configurable through `AUTH_REGISTER_LIMIT`, `AUTH_LOGIN_LIMIT`, and `RATELIMIT_STORAGE_URI`. The in-memory backend is development-only for multi-worker scale.
- CORS remains explicit-origin allowlisted with credentials. Cookie mutation requests with an Origin header are rejected unless that origin is configured. SameSite=Lax is an additional control; no synchronizer CSRF token is currently implemented.

### 8.2 Authorization and Scope
- Reusable backend helpers enforce authentication, roles, patient ownership, and doctor assignment. No domain endpoints or fake allow-all policy were added.
- Frontend role route checks are UX only; all future protected data endpoints must use backend authorization.
- Audit logs capture security events without passwords, tokens, or medical details. Security headers include a baseline CSP and production-only HSTS.

### 8.3 Phase 3 Verification
- Added auth coverage for registration, duplicate and malformed requests, password hashing, login, inactive accounts, logout, `/me`, role checks, privilege tampering, and rate limiting.
- Backend tests and TypeScript checks are recorded in the corresponding activity log entry. Docker/MySQL/browser end-to-end checks remain deployment-environment work and are not claimed as completed.

## 9. Phase 4: Patient and Doctor Management (Completed)

### 9.1 API Scope
- `GET/PATCH /api/patients/me` returns and updates only the signed-in patient's own allowlisted fields. Email, role, account status, IDs, password hash, and timestamps are not writable.
- `GET/PATCH /api/doctors/me` supports doctor-owned contact and professional profile fields. License number and account status are not doctor-editable.
- Patient-only `GET /api/doctors` and `GET /api/doctors/<id>` expose active doctors' name, specialty, experience, and bio, without license or account contact details.
- Admin-only `/api/admin/patients` and `/api/admin/doctors` provide search, bounded pagination, detail views, doctor creation/update, and status activation/deactivation. Records are not destructively deleted.

### 9.2 Security Decisions
- Role checks are enforced in Flask on every route. Self-service routes do not accept resource IDs, preventing IDOR across patient or doctor profiles.
- All request keys are checked against explicit field allowlists. Admin doctor creation always assigns `DOCTOR`; `role` or `is_active` input is rejected. Doctor credentials are hashed with Argon2id.
- Admin account state changes use `is_active` deactivation/reactivation to preserve healthcare history. Inactive accounts are rechecked against the database on each authenticated request.
- Search uses SQLAlchemy bound parameters with bounded search text. Page must be positive and limit is 1-100; no user value is interpolated into raw SQL.
- Mutation Origin checks apply across the API. Security events are audited with user IDs only; passwords, tokens, and medical data are not logged.

### 9.3 Verification Status
- Backend suite: 95 tests passed, including Phase 4 role, ownership, field allowlist, status, search, and pagination cases.
- Frontend TypeScript, lint, and optimized production build passed. Docker/MySQL and live browser checks were unavailable in this environment; deployment behavior remains unverified.

## 10. Phase 5: Appointment Management

### 10.1 Workflow and Authorization
- Patients choose an active doctor from the existing patient-only directory, request a time range with a reason, and receive a server-created `PENDING` appointment. Patient ID and status are never accepted from the request.
- Patient list/detail/cancel queries are filtered by the authenticated patient ID. Doctor list/detail/actions are filtered by the authenticated doctor ID. Admin endpoints require the ADMIN role and use bounded search/pagination.
- A doctor sees the associated patient's ID and name only through an appointment assigned to that doctor. The admin appointment serializer omits reason and internal notes.

### 10.2 State and Cancellation Rules
- Allowed transitions: `PENDING → CONFIRMED`, `PENDING → CANCELLED`, `CONFIRMED → COMPLETED`, `CONFIRMED → CANCELLED`. `COMPLETED` and `CANCELLED` are terminal.
- Confirm and cancel actions require a start time in the future. Completion requires the end time to have passed. Patients and doctors may cancel pending/confirmed visits before start; the system has no additional cancellation cutoff.
- Cancelled appointments do not block a new booking. Pending, confirmed, and completed appointments are considered for overlap (a completed appointment cannot be in the future through normal workflow).

### 10.3 Double Booking, Transaction, and Timezone
- The overlap predicate is `existing.start_at < new.end_at AND existing.end_at > new.start_at`, so adjacent ranges are allowed and partial/full intersections are rejected.
- Creation locks the active doctor's `users` row with SQLAlchemy `with_for_update()`, performs a locking/current read of overlapping appointments, then inserts and commits under the same transaction. The current read matters because the authentication lookup may establish a REPEATABLE READ snapshot before a request waits on the doctor lock. In MySQL/InnoDB this serializes competing booking transactions for the same doctor; different doctors can proceed independently. The SQLite test database does not implement equivalent row locks, and this mitigation has not been verified with simultaneous MySQL requests.
- Request timestamps must be ISO 8601 with an explicit offset. They are normalized to UTC, stored as naive values in existing `DATETIME` columns, and emitted as UTC ISO timestamps with `Z`. The browser formats them in local time. MySQL server/session timezone does not reinterpret the application's UTC-naive values.

### 10.4 Milestone Verification
- `IMPLEMENTED`: Flask patient, doctor, and admin APIs; patient booking/list/detail/cancel screens; doctor schedule and actions; admin appointment filters and status management.
- `TESTED`: automated backend cases exercise roles, ownership, validation, overlap, transitions, and filters. Record exact test output in `docs/logs.txt`.
- `PLANNED / NOT VERIFIED HERE`: concurrent requests against MySQL/InnoDB, Docker end-to-end patient-to-doctor workflow, and real browser session testing.

## 11. Phase 6: Secure Medical Records

### 11.1 Ownership and Appointment Authority
- A doctor creates a record only for a completed appointment assigned to that authenticated doctor. The appointment supplies both patient and doctor IDs; request-supplied identity fields are rejected. A unique nullable appointment index enforces one primary linked record, while legacy rows with no appointment link remain intact.
- Patients list records by their session identity and can retrieve a record only when its patient ID matches. Doctors list and update records only when a linked appointment confirms both doctor and patient association. Legacy records without appointment links remain visible to their patient but are excluded from doctor access because there is no appointment authorization evidence. Unauthorized and absent record IDs both return 404.
- No admin clinical-record API and no hard-delete operation are provided. Doctor edits are limited to diagnosis, notes, and prescription; relationship and ownership fields cannot be changed.

### 11.2 Data Handling and Verification
- Request fields and text types/lengths are allowlisted. APIs use SQLAlchemy queries, bounded pagination, minimal response fields, and audit events containing identifiers and action/outcome only. Clinical text is not logged. The UI renders record text through normal React interpolation, which escapes markup.
- Migration `9c27f4d8a611` adds a unique index without rewriting or deleting existing rows. It intentionally fails if pre-existing linked duplicates violate the invariant; resolving such conflicts requires a data-owner decision.
- Phase 6 automated tests cover role and object authorization, appointment completion/assignment, server-derived identities, duplicate links, validation/mass assignment, legacy record scope, no-delete behavior, and clinical-text-free auditing. Frontend and Docker verification are recorded in the per-turn log; SQLite does not verify MySQL concurrency or live browser behavior.
