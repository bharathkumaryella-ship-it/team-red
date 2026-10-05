# MediDesk Final Security Report

## Scope

This final review covers the MediDesk Flask API, Next.js frontend, Docker
configuration, and existing automated security controls. Testing is limited to
the local repository and synthetic data. No external systems, real credentials,
or destructive exploitation were used.

## Security review findings and remediation

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| FINDING-001 | Medium | Compose defaulted to development mode, which could disable production cookie and configuration safeguards. | Compose now defaults to `FLASK_ENV=production`; local development requires the explicit `docker-compose.dev.yml` override. |
| FINDING-002 | Medium | The API was published on all host interfaces over plaintext HTTP. | Compose now binds port 5000 to `127.0.0.1` by default. Production ingress should use a TLS reverse proxy on the same host. |

## Verified controls

- Passwords use Argon2id hashing and are not returned by API serializers.
- Flask enforces authentication, role checks, ownership-scoped queries, and
  field allowlists.
- Patient and doctor record access is object-scoped; unauthorized records
  return the application’s designed denial responses.
- SQLAlchemy ORM queries and bound parameters are used instead of interpolated
  SQL for request-controlled values.
- React rendering uses escaped interpolation; no unsafe HTML sink is used.
- CORS requires explicit origins and production rejects non-HTTPS origins.
- Mutation requests enforce trusted-origin checks and production requires an
  origin or referer for authenticated writes.
- Production rate limiting requires shared persistent storage through Redis.
- Security headers include CSP, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, and production-only HSTS.
- MySQL is not publicly exposed by Compose, and containers use non-root users
  where supported.

## Validation evidence

- Backend Phase 7 and health regression tests: 10 passed.
- Frontend lint and optimized production build: passed; existing hook
  dependency warnings remain.
- Docker Compose syntax/configuration: passed with synthetic variables.
- Tracked secret check: no non-example environment files were found.
- Docker image build and full Compose/browser/persistence workflow: pending
  because the local Docker Desktop Linux engine was unavailable.

## Residual risks

Docker image builds, live browser workflows, MySQL persistence across a full
down/up cycle, and TLS reverse-proxy behavior must be executed in an environment
with Docker and the chosen deployment platform. No live deployment URL is
claimed by this report.
