# MediDesk Deployment Guide

## Architecture

The Compose stack runs the browser-facing Next.js frontend, the Flask API, MySQL,
and Redis for shared production rate-limit state. MySQL and Redis are internal
only; the frontend and API ports are the only host-published ports.

## Requirements

- Docker Engine with Docker Compose v2
- At least 2 GB available memory
- A reverse proxy or hosting platform for production TLS termination

## Local setup

```powershell
Copy-Item .env.example .env
# Replace every replace-* value in .env with local values.
docker compose config
docker compose up --build
```

Open `http://localhost:3000`. The checked-in example uses development mode so
secure cookies can be tested over local HTTP. Never use those settings for a
public deployment.

## Production configuration

Set `FLASK_ENV=production`, generated `SECRET_KEY` and `JWT_SECRET_KEY` values,
an HTTPS `CORS_ALLOWED_ORIGINS`, and the public HTTPS `NEXT_PUBLIC_API_URL`.
Production validation rejects HTTP CORS origins, weak secrets, debug mode, and
process-local rate-limit storage. Terminate TLS at a reverse proxy or hosting
platform and forward `/api` to the backend on port 5000. Do not enable HSTS
until HTTPS is actually active.

## Database and migrations

The backend waits for healthy MySQL and Redis services, then runs the existing
Alembic migration chain with `flask db upgrade` before starting Gunicorn.
Migrations are non-destructive; the stack never drops or recreates the database.
MySQL data persists in the `mysql_data` named volume.

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
