# Docker Security Checklist

| Check | Status | Evidence |
|---|---|---|
| No secrets in images | PASS | Secrets are runtime Compose variables; `.dockerignore` excludes `.env`. |
| No secrets in Git | PASS | Only placeholders are present in `.env.example` files. |
| No privileged containers | PASS | No service uses `privileged: true`. |
| Containers use least privilege | PASS | Backend and frontend use non-root users; capabilities are dropped where compatible. |
| MySQL not publicly exposed | PASS | MySQL has no `ports` mapping and uses an internal network. |
| Production debug disabled | PASS | Production configuration rejects debug mode. |
| Secure environment configuration | PASS | Required secrets and origins are validated at startup. |
| Health checks | PASS | MySQL, Redis, backend, and frontend checks are defined. |
| Persistent database volume | PASS | `mysql_data` is a named volume. |
| Minimal exposed ports | PASS | Only frontend and API ports are published for the local stack. |
| `.dockerignore` configured | PASS | Frontend/backend ignore secrets, VCS, caches, tests, and logs. |
| Security headers retained | PASS | Flask middleware retains CSP, HSTS in production, and related headers. |
| CORS restricted | PASS | Explicit origins are required; wildcard origins are rejected. |
| Logs avoid secrets | PASS | Existing audit/error logging excludes passwords, tokens, and clinical text. |

Docker image builds and full browser flows require a running Docker Engine and
were not claimed until executed in an environment with Docker available.
