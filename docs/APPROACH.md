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
This foundation phase creates a clean monorepo structure with separate frontend and backend concerns while keeping all application code in the repository's `src/` boundary. The frontend uses Next.js App Router placeholders for `/`, `/login`, `/register`, `/patient/dashboard`, `/doctor/dashboard`, and `/admin/dashboard`. The backend is a Flask application factory with environment-driven configuration, SQLAlchemy initialization, restricted CORS, JSON error handling, security headers, structured logging, and a public `/api/health` endpoint. MySQL credentials and secret values are not hardcoded; they are injected by environment variables.

### 2.2 Data Flow & Component Interaction
Requests travel from the browser through HTTPS to the Next.js frontend, then to the Flask REST API. The backend enforces the security boundary and role-based authorization policy. The frontend is not allowed to connect directly to MySQL, and the database is never exposed to browser code. The backend currently exposes a liveness endpoint only; no production patient or business operations are implemented yet.

### 2.3 Technology Stack Rationale
- Backend: Flask + SQLAlchemy with MySQL via PyMySQL for a simple, modular Python API foundation.
- Frontend: Next.js TypeScript with App Router for a familiar secure web client architecture and route-based role pages.
- Deployment: Docker and Docker Compose to support local development and later public hosting.
- Security posture: environment-driven configuration, CORS restrictions, security headers, and generic error responses before business logic is added.

### 2.4 Defense-in-Depth Security Controls
1. Authentication & session security: deferred to later phases; a separate JWT secret key is reserved but not used yet.
2. Authorization & access control: planned with role-based and object-level enforcement in later domain modules.
3. Input validation & sanitization: request-size limits exist now; later phases will add strict schema validation and parameterized queries.
4. Rate limiting & abuse prevention: deferred to a later hardening phase.
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
| **Phase 3: Security & Hardening** | 12h – 18h | Validation, abuse controls, logging, auth integrity | SAST & edge-case testing | `Planned` |
| **Phase 4: Polish & Deployment** | 18h – 24h | UI polish, cloud deployment, final commit freeze | Live deployment check | `Planned` |

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

### 7.7 Next Phase Roadmap
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
