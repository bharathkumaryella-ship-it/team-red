# HTTPS reverse proxy

Use a managed ingress or a dedicated reverse proxy in front of the Compose
frontend and backend. The included [`Caddyfile.example`](./Caddyfile.example)
is a template only; it is not a live certificate or deployment configuration.

Required deployment properties:

- Public traffic reaches only the proxy over HTTPS.
- The backend remains private or loopback-bound; do not publish port 5000
  publicly.
- Set `TRUSTED_PROXY_HOPS` to the exact number of trusted proxy hops in front
  of Flask. Leave it at `0` when the backend receives traffic directly from a
  private Docker network. Never set it based on an untrusted client header.
- Verify secure cookies, HSTS, forwarded scheme, client IP rate limiting,
  certificate renewal, and HTTP-to-HTTPS redirects through the actual ingress.
- Configure encrypted database/volume storage and encrypted backups in the
  hosting platform; Docker named volumes alone do not provide encryption at
  rest.
