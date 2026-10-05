# MediDesk Foundation Security Notes

This project keeps its security boundary in the Python Flask API. The browser is never allowed to talk directly to MySQL, and the frontend must use environment variables rather than embedded secrets.

## Current Phase

- Backend foundation is complete and exposes only a non-sensitive `/api/health` liveness endpoint.
- No patient, medical record, or appointment business logic is included in this phase.
- Role-based pages exist only as placeholders for patient, doctor, and admin dashboards.
- Database credentials and secrets are intentionally left in environment variable files instead of source control.

## Guardrails

- Never commit real credentials or secrets.
- Keep authorization and validation logic in the backend.
- Treat all patient data as synthetic-only demo data.
