# Project Approach & Architecture — Build Secure 24

**Team ID:** 
**Project Name:** 
**Team Size:** [2 or 4 Members]
**Primary Track / Domain:** 

---

## 1. Problem Understanding, Scope & Threat Model

### 1.1 Problem Statement & Real-World Motivation
*Describe the specific problem your project solves, why it matters, and the core security challenges involved.*

### 1.2 Target Users & Personas
*Identify target user groups, their operational workflows, and their trust levels (e.g. End User, Admin, Auditor).*

### 1.3 Threat Model & Attack Surface
*Document the threat landscape for this system:*
- **Critical Assets:** (e.g., user credentials, PII, sensitive business records, session tokens)
- **Potential Attack Vectors:** (e.g., credential stuffing, injection attacks, privilege escalation, unauthorized API access)
- **OWASP Top 10 Considerations:** (e.g., broken access control, cryptographic failures, injection prevention)

---

## 2. Technical Architecture & Secure System Design

### 2.1 High-Level Architecture Overview
Phase 1 establishes a modular Flask API in `src/backend/`, keeping application code inside the starter repository's required source boundary. A Next.js client will call JSON routes under `/api`; route modules will delegate future business behavior to services, with request schemas, middleware, utilities, and models kept in separate packages. Flask-SQLAlchemy is initialized against MySQL using environment-based configuration, but Phase 1 creates no business tables or migrations. The factory separates development, testing, and production settings so later domain modules do not require restructuring.

### 2.2 Data Flow & Component Interaction
Requests enter the Flask application factory, pass through configured CORS and security-header handling, then reach a route. The health endpoint returns static service metadata and does not query the database. Future database-backed routes will use SQLAlchemy through the shared extension; no patient information or credentials are returned by infrastructure endpoints.

### 2.3 Technology Stack Rationale
*Explain the tools selected and why alternatives were rejected:*
- **Backend / API Framework:** Flask application factory — small modular foundation for the requested Python API.
- **Frontend / Client:** Next.js — planned frontend; Phase 1 configures a restricted, environment-driven CORS origin.
- **Database & Persistence:** MySQL with Flask-SQLAlchemy and PyMySQL — configured now without creating business tables; testing uses in-memory SQLite and does not require a MySQL service.
- **Authentication & Cryptography:** (e.g., Bcrypt/Argon2, PyJWT) — *Why chosen:*

### 2.4 Defense-in-Depth Security Controls
*Detail the specific security controls implemented:*
1. **Authentication & Session Security:** Not implemented in Phase 1; secret configuration reserves a separate JWT key for a later controlled phase.
2. **Authorization & Access Control:** No business routes exist yet; authorization will be designed with the future authenticated modules.
3. **Input Validation & Sanitization:** Request bodies are capped by a configurable maximum size; future schemas and parameterized SQLAlchemy operations belong in their respective modules.
4. **Rate Limiting & Abuse Prevention:** Deferred; Phase 1 applies a request-size limit and does not introduce a rate-limiting dependency.
5. **Secrets & Configuration Hygiene:** Credentials and secret keys are read from environment variables; `.env` is ignored by Git and excluded from the Docker build context. Production validates configured secrets and HTTPS CORS origins.

### Phase 1 Backend Decisions
- `DATABASE_URL`, when set, takes precedence over the `MYSQL_*` fields; both configure the same MySQL SQLAlchemy extension.
- `/api/health` is an application liveness check only and intentionally does not disclose or test database connectivity.
- Production runs under Gunicorn as a non-root container user. Flask's built-in development server is limited to local development.
- API exceptions use generic JSON errors; logs contain structured event metadata and exception class names, not request bodies, credentials, exception messages, or tracebacks.

---

## 3. Implementation Milestones & 24-Hour Timeline

| Milestone / Phase | Time Window | Key Objectives & Deliverables | Security Verification | Status |
|---|---|---|---|---|
| **Phase 1: Foundation & Setup** | 0h – 4h | Contract onboarding, repo setup, baseline data schemas | Secret scan & baseline check | `Planned` |
| **Phase 2: Core Domain & Auth** | 4h – 12h | Core business logic, secure authentication & authorization | Auth test suite & crypto validation | `Planned` |
| **Phase 3: Security & Hardening**| 12h – 18h | Input validation, rate limiting, error handling, security middleware | SAST scanning & edge case tests | `Planned` |
| **Phase 4: Polish & Deployment**| 18h – 24h | UI polish, live cloud deployment, final docs & commit freeze | Live deployment URL check | `Planned` |

---

## 4. Architecture Decision Records (ADRs)

### ADR-001: [Title of First Major Decision]
- **Status:** [Proposed | Accepted | Superseded]
- **Context:** *What was the architectural context, problem, or requirement?*
- **Options Considered:** 
  1. *Option A (e.g., choice 1)*
  2. *Option B (e.g., choice 2)*
- **Decision & Rationale:** *What was decided and why was it chosen over alternatives?*
- **Security & Performance Trade-offs:** *What are the security implications or performance impacts?*

### ADR-002: [Title of Second Major Decision]
- **Status:** [Proposed | Accepted | Superseded]
- **Context:**
- **Options Considered:**
- **Decision & Rationale:**
- **Security & Performance Trade-offs:**

---

## 5. Engineering Journal & Real-Time Decision Log

*Maintain this chronological log as your team builds during the 24-hour hackathon.*

### [YYYY-MM-DD HH:MM IST] Entry 1: Project Initialization & Scope Lock
- **Focus:** Initial repository setup, team alignment, and schema architecture.
- **Key Challenges:** 
- **Resolution:** 

### [YYYY-MM-DD HH:MM IST] Entry 2: Implementation Milestone Progress
- **Focus:** 
- **Key Challenges:** 
- **Resolution:** 

---

## 6. Testing, Security Verification & Deployment Record

### 6.1 Testing & Security Verification Strategy
- **Unit & Integration Tests:** (Describe test coverage in `src/`)
- **Static Analysis & Linting:** (Lint and security checks run)

### 6.2 Deployment Verification
- **Live Deployment Platform:** (e.g., Vercel, Render, Railway, AWS)
- **Deployment URL:** (Recorded in `metadata/submission.yaml` and `deployment/README.md`)
- **Health Check Endpoint:** (e.g., `/health` or `/api/health`)
