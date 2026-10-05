# MediDesk Security Audit

## Executive Summary

Phase 7 reviewed the existing MediDesk Flask API, Next.js client, database configuration, Docker images, dependency manifests, logging, and security tests. The assessment used local test fixtures and non-destructive inputs only. Verified high-impact configuration issues were fixed without changing the Phase 1-6 domain model or authorization boundary.

Dependency security is not claimed to be perfect: package freshness and transitive vulnerability status depend on the package lockfiles and the security tooling available in the deployment environment.

## Scope

- `src/backend/app/` API, authentication, authorization, validation, errors, and logging
- `src/frontend/` API client and production image
- `docker-compose.yml`, Dockerfiles, environment templates, and Git ignore rules
- Existing backend tests plus `src/backend/tests/security/`

## Methodology

Reviewed every registered API blueprint and exercised representative authentication, RBAC, IDOR, mass-assignment, SQL-injection, XSS, CORS, session, and business-rule cases with synthetic identities. Configuration and Docker changes were validated with static inspection and the available test/build commands. No destructive SQL, external systems, production data, or real secrets were used.

## Security Controls Tested

| Control | Status | Evidence |
| --- | --- | --- |
| Authentication | PASS | Argon2id hashes, generic login errors, inactive-account denial |
| Authorization | PASS | Role decorators and ownership-scoped queries |
| IDOR/BOLA | PASS | Patient, doctor, appointment, and medical-record ownership tests |
| SQL Injection | PASS | ORM-bound queries and safe quote/boolean payload tests |
| XSS | PASS | Text remains data; no `dangerouslySetInnerHTML` or browser HTML sinks |
| CSRF | PARTIAL | SameSite cookies and trusted Origin/Referer checks; production rejects missing origin on cookie mutations |
| CORS | PASS | Explicit origin allowlist; credentials are not paired with wildcard origins |
| Rate Limiting | PARTIAL | Login/registration limits exist; production now requires shared persistent limiter storage |
| Security Headers | PASS | CSP, frame protection, nosniff, referrer, permissions, and production HSTS |
| Sensitive Data | PASS | Password hashes and clinical text are excluded from logs and user responses where not needed |
| Secrets | PASS | Environment templates use placeholders and `.env` files are ignored |
| Docker | PASS | Database is internal-only, images use non-root users, and containers drop privilege escalation |
| Dependencies | PARTIAL | Pinned direct ranges and lockfiles exist; continuous dependency scanning remains required |
| Business Logic | PASS | Appointment state machine, overlap protection, and medical-record assignment checks |
| Logging | PASS | Security-relevant events record actor/resource identifiers without credentials or clinical content |

## Findings

### FINDING-001

Title: Database credentials and database port were exposed by the default Compose configuration  
Severity: MEDIUM  
Category: Security misconfiguration / secrets management  
Affected Component: `docker-compose.yml`, root `.env.example`  
Description: The previous Compose file embedded predictable database passwords and published MySQL on host port 3306.  
Reproduction: Static inspection of the Compose service showed literal credentials and a `3306:3306` mapping.  
Impact: Anyone able to reach the host could attempt direct database access, and copied configuration could create shared default credentials.  
Fix: Compose now requires environment-provided credentials, uses a placeholder-only template, removes the host database port, and keeps the database on the internal Compose network.  
Retest: Static inspection confirmed no database port mapping or literal password remains in Compose.

### FINDING-002

Title: Production deployments could silently use in-memory rate-limit state  
Severity: MEDIUM  
Category: Availability / abuse prevention  
Affected Component: `src/backend/app/config.py`  
Description: The default limiter storage was `memory://`, which does not coordinate limits across multiple workers or instances.  
Reproduction: Production configuration accepted the default in-memory URI.  
Impact: An attacker could distribute login attempts across workers or instances and bypass the intended aggregate limit.  
Fix: Production configuration now fails closed unless `RATELIMIT_STORAGE_URI` is a shared persistent backend. Development and tests retain their existing local behavior.  
Retest: Configuration validation rejects `memory://` in production and existing test configuration remains available.

## Verified Safe / Not Vulnerable

- No unsafe `dangerouslySetInnerHTML`, `localStorage` token storage, or user-controlled filesystem path handling was found.
- Profile, appointment, and medical-record writes use explicit field allowlists rather than model-wide mass assignment.
- Medical-record queries bind both actor and resource ownership; changing an identifier does not disclose another patient's record.
- Unexpected exceptions return a generic JSON response and log only the exception type.

## Security Test Results

The focused Phase 7 security tests passed (3/3). The frontend lint, TypeScript check, and optimized production build passed. The backend regression suite ran 143 tests: 142 passed and one production-app startup test could not initialize Redis because the local virtual environment lacks the Redis Python client. `redis>=5,<6` is now declared in `src/backend/requirements.txt`; reinstall backend requirements before rerunning the full suite. Docker Compose configuration validation passed using `.env.example`. Docker image builds and live MySQL/Redis behavior were not verified.

## Remaining Risks

- CSRF remains intentionally documented as partial for development and non-browser clients that omit Origin and Referer. Production cookie-authenticated mutations require a trusted origin.
- Rate-limit storage must be provisioned as shared infrastructure in production.
- Dependency scanning (for example, `pip-audit` and `npm audit`) should run in CI with an approved remediation policy.
- MySQL TLS, backups, key rotation, centralized audit retention, and WAF controls remain deployment responsibilities.

## Recommendations

1. Set generated secrets and a shared limiter backend through the deployment secret manager.
2. Run dependency scanning and container image scanning on every release.
3. Keep MySQL private and restrict backend ingress to the approved frontend or reverse proxy.
4. For future uploads, enforce extension and content allowlists, size limits, randomized names, non-executable storage, path-traversal rejection, malware scanning, and object-level download authorization.

## Final Security Status

Phase 7 defensive hardening is complete for the verified local application scope. No unverified vulnerability is reported as confirmed. The remaining partial controls above require deployment-level decisions rather than silent defaults.
