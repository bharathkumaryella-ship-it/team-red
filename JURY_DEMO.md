# MediDesk Jury Demonstration

Use only synthetic accounts and records during the demonstration.

## 1. Start and verify

For a local development demonstration:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Verify the frontend at `http://localhost:3000/` and the API health endpoint at
`http://localhost:5000/api/health`. For production-like testing, use the base
Compose file with generated secrets, HTTPS origins, and a TLS reverse proxy.

## 2. Functional flow

1. Register and log in as synthetic Patient Alpha.
2. View the patient dashboard, update the profile, and book an appointment.
3. Log in as synthetic Doctor Alpha, confirm and complete the appointment, and
   create a medical record.
4. Log in again as Patient Alpha and view the authorized medical record.
5. Log in as the synthetic administrator and show bounded patient, doctor, and
   appointment management.
6. Log out and verify protected pages redirect to login.

## 3. Security demonstration

Show the following safe negative cases with synthetic accounts:

- Anonymous request to a protected endpoint is rejected.
- Patient Alpha cannot access Patient Beta’s appointment or medical record.
- A patient cannot call doctor or administrator endpoints successfully.
- A doctor cannot access an unrelated doctor’s private data or another
  patient’s record.
- Invalid login attempts are rate limited without revealing whether an account
  exists.
- A mutation with an untrusted `Origin` is rejected.
- Malformed input receives a safe validation error without a stack trace.
- Response headers include CSP, nosniff, Referrer-Policy, and
  Permissions-Policy; HSTS is shown only in production HTTPS.

## 4. Evidence to capture

- `docker compose ps` showing healthy MySQL, Redis, backend, and frontend.
- `/api/health` response containing only the minimal health status.
- Test output for the Phase 7 security regression suite.
- Browser screenshots of the three role dashboards and the denied requests.
- `docker compose down` followed by `docker compose up` with a synthetic
  record still present, when Docker is available.

Never display passwords, session cookies, API keys, real healthcare data, or
unredacted production logs.
