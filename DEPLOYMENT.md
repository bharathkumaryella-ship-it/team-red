# MediDesk Deployment Guide

## Architecture

The Compose stack runs the browser-facing Next.js frontend, the Flask API, MySQL,
and Redis for shared production rate-limit state. MySQL and Redis are internal
only; the frontend and API ports are the only host-published ports.

## Requirements

- Docker Engine with Docker Compose v2
- At least 4 GB available memory for the ClamAV service, in addition to application and database needs
- A reverse proxy or hosting platform for production TLS termination

## Local setup

For a local development demonstration:

```powershell
Copy-Item .env.example .env
# Use generated local secrets and run with the explicit development override.
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Open `http://localhost:3000`. The development override is explicit and binds
the API only to loopback. Never use it for a public deployment.

## Production configuration

Set `FLASK_ENV=production`, generated `SECRET_KEY` and `JWT_SECRET_KEY` values,
an HTTPS `CORS_ALLOWED_ORIGINS`, and the public HTTPS `NEXT_PUBLIC_API_URL`.
Production validation rejects HTTP CORS origins, weak secrets, debug mode, and
process-local rate-limit storage. Terminate TLS at a reverse proxy or hosting
platform and forward `/api` to the backend on port 5000. Do not enable HSTS
until HTTPS is actually active.

Also set `PHI_ENCRYPTION_KEYS` to a comma-separated Fernet key ring. Generate a
key with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
and provide it through the deployment secret manager. Keep old keys available
until every value encrypted by them has been re-encrypted; losing a required key
makes the associated records and attachments unrecoverable. ClamAV must finish
its first signature initialization before the backend becomes healthy.

## Database and migrations

The backend waits for healthy MySQL, Redis, and ClamAV services, then runs the
Alembic migration chain with `flask db upgrade` before starting Gunicorn. The
stack never drops or recreates the database. The PHI encryption migration
rewrites selected data in place and cannot be downgraded; follow the backup
steps below before deploying it. MySQL data persists in the `mysql_data` named
volume.

The PHI-encryption migration rewrites existing database values and attachment
files in place. Before deploying a release that applies it, stop application
writes, back up both the MySQL database and `attachment_data` volume, securely
retain the matching encryption key with the backup, and verify that the backup
can be restored. Do not start the new backend until these prerequisites are met.

## Operations

```powershell
docker compose ps
docker compose logs --follow backend
docker compose restart
docker compose down
docker compose up -d
```

Do not use `docker compose down -v` for normal operations. It destroys named
volumes and therefore deletes the local database.

## Health checks

- Backend: `http://localhost:5000/api/health`
- Frontend: `http://localhost:3000/`
- MySQL and Redis: internal Compose health checks

Health responses do not expose credentials, environment variables, or stack
traces.

## Troubleshooting and rollback

Run `docker compose config` first when a required environment variable is
missing. Inspect `docker compose logs backend` for migration or configuration
errors. To roll back an application release, deploy the previous image or Git
commit and run the compatible migration path; do not roll back migrations that
could remove data without a reviewed backup and data-owner decision.

## Deployment status

This repository contains deployment configuration and instructions only. No
hosting provider, credentials, or live deployment URL is assumed or claimed.
