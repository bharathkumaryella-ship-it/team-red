# MediDesk Deployment Architecture

```text
User
  |
  v
Next.js Frontend :3000
  |
  v
Flask API :5000
  |              \
  v               v
MySQL          Redis
(internal)     (internal rate-limit state)
```

## Trust boundaries and controls

- The browser talks to the Flask API with credentialed, HttpOnly session
  cookies. The frontend never connects directly to MySQL.
- Flask enforces authentication, role authorization, ownership checks, input
  allowlists, origin checks, rate limits, and security headers.
- Compose places MySQL and Redis on an internal-only backend network. Only the
  frontend and API ports are published to the host.
- Database credentials and application secrets are injected through `.env`;
  `.env` files are ignored and never copied into images.
- `mysql_data` persists database state across restarts and normal
  `docker compose down` / `up` cycles.
- Production HTTPS is terminated by a reverse proxy or hosting platform.
  HSTS is emitted only when Flask runs in production mode; this configuration
  does not pretend that local HTTP is HTTPS.
