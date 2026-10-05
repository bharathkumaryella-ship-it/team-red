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
| **Phase 2: Core Domain & Auth** | 4h – 12h | Patient/doctor/admin domain models, auth flows, role enforcement | Auth test suite & audit review | `Planned` |
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
