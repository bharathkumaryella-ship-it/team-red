# MediDesk Backend — Phase 1

This directory contains the Flask backend foundation. It provides an application factory, environment-driven configuration, SQLAlchemy/MySQL connectivity, a non-sensitive liveness endpoint, centralized JSON errors, security headers, restricted CORS, structured logging, and a production-oriented Docker image.

No business models, migrations, authentication, or patient/appointment features are included in this phase. The health endpoint is an application liveness check and intentionally does not verify database connectivity.

## Requirements

- Python 3.11+ (the Docker image uses Python 3.12)
- MySQL 8+ for local development or deployment
- Docker for container builds

## Local development

From this directory:

```powershell
Copy-Item .env.example .env
```

Replace the placeholder secrets and local MySQL values in `.env`. Generate distinct secrets with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use a generated value for each secret variable. The local MySQL account should have only the privileges needed by the application. Then install dependencies, run the server, and exercise the health route:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python run.py
```

The local server binds to `127.0.0.1:5000`. `CORS_ALLOWED_ORIGINS` defaults to `http://localhost:3000` in development and can be set to exact comma-separated origins. The backend does not load `.env` in production.

## Docker

Build from the repository root:

```powershell
docker build -t medidesk-backend .\src\backend
```

Run locally with configured environment variables:

```powershell
docker run --rm -p 5000:5000 --env-file .\src\backend\.env medidesk-backend
```

For a public deployment, set `FLASK_ENV=production`, distinct generated `SECRET_KEY` and `JWT_SECRET_KEY` values, MySQL connection variables (or `DATABASE_URL`), and HTTPS frontend origins in `CORS_ALLOWED_ORIGINS`. The production configuration rejects placeholder/short secrets and non-HTTPS CORS origins. The container runs Gunicorn as a non-root user; do not expose Flask's development server.

For a MySQL instance running on the host and accessed from Docker Desktop, set `MYSQL_HOST=host.docker.internal` in the container environment. Hosted deployments should use their managed database hostname and secret store.

## Tests

From this backend directory, run tests using in-memory SQLite; MySQL is not required:

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `FLASK_ENV` | `development`, `testing`, or `production`; defaults to development. |
| `DATABASE_URL` | Optional MySQL SQLAlchemy URL; when set it takes precedence over `MYSQL_*`. |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | MySQL connection components used when `DATABASE_URL` is unset. |
| `SECRET_KEY` | Flask signing secret; required outside tests and must be generated with at least 32 characters. |
| `JWT_SECRET_KEY` | Reserved secret for the later authentication phase; required outside tests and must be distinct/generated. No JWT authentication is implemented here. |
| `CORS_ALLOWED_ORIGINS` | Exact comma-separated frontend origins; development defaults to `http://localhost:3000`, production requires HTTPS origins. |
| `MAX_CONTENT_LENGTH` | Maximum request body size in bytes; defaults to 1 MiB. |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, or `CRITICAL`; defaults to `INFO`. |

Never commit `.env` or use real patient data in tests.
