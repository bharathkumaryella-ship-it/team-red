# Final Security Test Matrix

This matrix records the final local validation for the MediDesk review. A
passing result means the check was executed in this repository; pending items
are not represented as successful deployment evidence.

| Area | Result | Evidence or limitation |
|---|---|---|
| Backend full suite | PASS | 148 tests passed |
| Security regression suite | PASS | Included in the 148-test backend run |
| Production PHI key separation | PASS | Startup fails without a dedicated PHI key; regression test passes |
| Frontend lint | PASS WITH WARNINGS | Existing React Hook dependency warnings |
| Frontend production build | PASS WITH WARNINGS | Existing hook warnings and Windows SWC Application Control warning |
| Compose configuration | PASS | Production Compose rendered with synthetic variables |
| Trusted proxy configuration | PASS CONFIGURATION | Bounded `TRUSTED_PROXY_HOPS` is implemented; live ingress behavior remains deployment-specific |
| Docker image build | PASS | Backend and frontend images built successfully |
| Docker runtime health checks | PASS | Disposable fresh-volume drill: MySQL, Redis, ClamAV, backend, and frontend started; API/frontend HTTP 200, Redis/ClamAV PONG |
| Browser security tests | PENDING | No browser test harness is configured |
| MySQL/Redis/ClamAV integration | PENDING | Requires a running Compose stack |
| Backup/restore drill | PENDING | Requires isolated deployment storage |
| HTTPS/TLS ingress | PENDING | No live ingress or deployment URL was provided |
| Trusted proxy behavior | PENDING | Requires the selected reverse proxy or managed ingress |
| npm dependency audit | FINDINGS | 5 high vulnerabilities remain in the braces/Next ESLint path; PostCSS was updated to 8.5.29, while automatic remaining fixes require breaking upgrades |
| Python dependency audit | NOT RUN | `pip-audit` is not installed |
| SBOM generation | NOT RUN | `syft` is not installed |
| Container image scan | NOT RUN | `trivy` and `grype` are not installed |
| Secret tracking check | PASS | No non-example environment file was added |

## Acceptance conclusion

The application is ready for a controlled synthetic-data hackathon
demonstration. It is not certified for real healthcare production until
encrypted storage and backups, HTTPS ingress, trusted-proxy behavior, browser
integration tests, dependency/image scanning, and backup/restore validation
are completed.
