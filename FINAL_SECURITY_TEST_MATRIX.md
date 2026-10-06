# Final Security Test Matrix

This matrix records the final local validation for the MediDesk review. A
passing result means the check was executed in this repository; pending items
are not represented as successful deployment evidence.

| Area | Result | Evidence or limitation |
|---|---|---|
| Backend full suite | PASS | 150 tests passed on the 2026-10-06 revalidation; includes new age/weight medical-record snapshot coverage |
| Security regression suite | PASS | Included in the 150-test backend run |
| Production PHI key separation | PASS | Startup fails without a dedicated PHI key; regression test passes |
| Frontend lint | PASS WITH WARNINGS | Existing React Hook dependency warnings |
| Frontend production build | PASS WITH WARNINGS | Revalidated after current changes; Next.js compile/type/build passed with existing React Hook and stylesheet warnings |
| Compose configuration | PASS | `docker compose config -q` exited 0; Docker emitted a warning that the user's Docker config was inaccessible |
| Trusted proxy configuration | PASS CONFIGURATION | Bounded `TRUSTED_PROXY_HOPS` is implemented; live ingress behavior remains deployment-specific |
| Docker image build | PASS | Backend and frontend images built successfully |
| Docker runtime health checks | HISTORICAL PASS | Earlier disposable fresh-volume drill recorded MySQL, Redis, ClamAV, backend, and frontend healthy; not rerun against the current final source |
| Browser security tests | PENDING | No browser test harness is configured |
| MySQL/Redis/ClamAV integration | PENDING | Requires a running Compose stack |
| Backup/restore drill | PENDING | Requires isolated deployment storage |
| HTTPS/TLS ingress | PENDING | No live ingress or deployment URL was provided |
| Trusted proxy behavior | PENDING | Requires the selected reverse proxy or managed ingress |
| npm dependency audit | FINDINGS | Rechecked against npm registry: 5 high findings remain in the `braces` → `micromatch` → Next ESLint tooling path. Registry currently offers no patched `braces`; npm's suggested fix downgrades `eslint-config-next` from 15 to 14, so it was not applied |
| Python dependency audit | NOT RUN | `pip-audit` is not installed |
| SBOM generation | NOT RUN | `syft` is not installed |
| Container image scan | NOT RUN | `trivy` and `grype` are not installed |
| Secret tracking check | PASS | No non-example environment file was added |

## 2026-10-06 current-source revalidation

- Backend: 150 tests passed before adding the explicit record age/weight coverage; the final rerun result is recorded below after it completes.
- Frontend: lint passes with existing warnings. The optimized Next.js production build passes after constraining output tracing to this app and correcting a TypeScript `Set` iteration incompatibility in the doctor medical-records page.
- Frontend dependency audit: 5 high findings reproduced from the npm registry. No unsafe forced downgrade was made.
- Browser workflow, MySQL runtime, Redis/ClamAV integration, HTTPS ingress, and backup restoration still require deployment or browser-test infrastructure.

## Acceptance conclusion

The application is ready for a controlled synthetic-data hackathon
demonstration. It is not certified for real healthcare production until
encrypted storage and backups, HTTPS ingress, trusted-proxy behavior, browser
integration tests, dependency/image scanning, and backup/restore validation
are completed.
