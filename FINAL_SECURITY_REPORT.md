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
| FINDING-003 | Medium | Production PHI encryption previously allowed key derivation from `SECRET_KEY`. | Production now fails closed unless `PHI_ENCRYPTION_KEYS` or `PHI_ENCRYPTION_KEYS_FILE` is configured. |
| FINDING-004 | High | The locked frontend dependency tree contains 5 reported high vulnerabilities after a compatible PostCSS override. | No forced upgrade was applied because npm reports that remaining remediation requires a breaking Next.js/ESLint upgrade; upgrade and regression-test the frontend dependency tree before public exposure. |

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

- Full backend suite: 148 passed.
- Frontend lint and optimized production build: passed; existing hook
  dependency warnings and a Windows Application Control SWC warning remain.
- Docker Compose syntax/configuration: passed with synthetic variables.
- Docker backend and frontend image builds: passed after correcting the
  backend migration configuration path.
- Trusted proxy configuration: implemented with bounded
  `TRUSTED_PROXY_HOPS`; Compose defaults to `0` and deployments must set the
  exact trusted hop count.
- `npm audit --audit-level=high`: 5 high vulnerabilities remain in the
  `braces`/Next ESLint dependency path after updating PostCSS to 8.5.29;
  forced remediation was intentionally not applied because it requires
  breaking upgrades.
- Isolated Docker runtime drill: MySQL, Redis, ClamAV, backend, and frontend
  started successfully on alternate local ports; API and frontend returned
  HTTP 200, Redis returned `PONG`, and ClamAV returned `PONG`. The drill used
  synthetic credentials and fresh disposable volumes, then removed them.
- Python dependency audit, SBOM generation, and image scanning were not run
  because `pip-audit`, `syft`, `trivy`, and `grype` are not installed.
- Tracked secret check: no non-example environment files were found.
- Full Compose runtime, browser, persistence, backup/restore, and TLS ingress
  workflows remain pending; no runtime PHI secret file or live ingress was
  available in this environment.

## Residual risks

Names, email addresses, and other identity fields remain plaintext at the
database layer. Encryption at rest for disks, database storage, and backups is
an operator/deployment responsibility and must be enabled before handling real
healthcare data. The application does not claim field-level encryption.

Docker image builds, live browser workflows, MySQL persistence across a full
down/up cycle, and TLS reverse-proxy behavior must be executed in an environment
with Docker and the chosen deployment platform. The local Docker drill was not
completed because the Docker daemon returned a named-pipe permission error. No
live deployment URL is claimed by this report.

The application now fails closed in production when a dedicated
`PHI_ENCRYPTION_KEYS` or `PHI_ENCRYPTION_KEYS_FILE` value is missing. Development
and test environments retain their existing local behavior.

The backend Dockerfile now copies `migrations/alembic.ini` from its actual
location, and both application images build successfully. See
`FINAL_SECURITY_TEST_MATRIX.md` for the complete acceptance matrix.

## 2026-10-06 implementation and review update

The current source adds Fernet encryption for selected clinical/profile fields,
appointment details, phone numbers, attachment filenames, and attachment
bytes. New uploads are rejected if ClamAV detects malware or cannot provide a
verdict. The migration converts existing selected values and attachment files
in place; it cannot be downgraded. Before applying it, back up both the
database and attachment volume and retain the matching encryption key.

User names and email addresses remain plaintext to support current login,
ordering, and search. Database/volume encryption, protected key custody, tested
backup restoration, ClamAV operation, and TLS termination must be verified in
the deployment environment. The Next.js package manifest and lockfile are
aligned at 15.5.27; mutation Referer validation now compares the parsed origin,
not a truncated path. Compose mounts the PHI key ring from a read-only secret
file. Failed logins for existing accounts generate cross-IP Redis threshold
signals keyed by an HMAC fingerprint, without imposing an account lockout.

This update was reviewed statically. No tests, frontend build, Docker build,
scanner integration, or production migration was run for it. The validation
evidence in the earlier report records the earlier snapshot and does not verify
these additions.

Failed login attempts also produce a cross-IP Redis signal keyed by a
secret-derived account fingerprint. It does not enforce an account lockout;
credential stuffing resistance still depends on per-IP limits, strong unique
passwords, and adding multi-factor authentication. Centralized alerting for
these signals must be configured by the operator.
