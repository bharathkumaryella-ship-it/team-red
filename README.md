# Build Secure 24 — Participant Starter Repository

**Abhedya — VBIT Cybersecurity Forum, Vignana Bharathi Institute of Technology, Hyderabad**

Welcome to the official Build Secure 24 starter repository.

---

## 1. Challenge Overview

- **Schedule**: October 5, 2026, 11:00 AM IST to October 6, 2026, 11:00 AM IST
- **Duration**: Exactly 24 Hours
- **Submission Deadline**: October 6, 2026, 11:00 AM IST (`2026-10-06T11:00:00+05:30`)
- **Team Size**: Exactly 2 or 4 participants per team (teams of 1, 3, or >4 are not permitted)
- **Core Requirement**: All project code must be created live during the 24-hour hackathon. Importing pre-built or third-party repositories is strictly prohibited.

---

## 2. Repository Structure

```
├── AGENTS.md                  ← AI agent behavioral contract & logging gate
├── README.md                  ← This file
├── PARTICIPANT_RULES.md       ← Competition rules
│
├── docs/                      ← Autonomous documentation layer
│   ├── APPROACH.md            ← Problem breakdown & architecture approach
│   └── logs.txt               ← Turn-by-turn prompt, file location & timeline log
│
├── metadata/                  ← Submission metadata
│   ├── team.yaml              ← Team information (2 or 4 members)
│   └── submission.yaml        ← Final submission details
│
├── src/                       ← Application source code directory
└── deployment/                ← Deployment configuration directory
    └── README.md              ← Deployment record
```

---

## 3. Getting Started

### Step 1: Team Registration & GitHub Repository Setup
1. Create a new GitHub repository for your team's project.
2. Fill in `metadata/team.yaml` with your assigned Team ID, team name, your newly created GitHub repository URL (`team.repository`), and all 2 or 4 member details.

### Step 2: AI Agent Onboarding
When you open this repository in an AI coding assistant (Cursor, Windsurf, Claude Code, Copilot, ChatGPT, etc.):
- The agent will read `AGENTS.md`, greet your team, recite the competition ground rules, display the remaining time until **October 6, 2026, 11:00 AM IST**, and collect your `I agree` confirmation.
- Once confirmed, the agent records your team details and GitHub repository URL, and configures your Git remote origin.
- The agent will **automatically log every prompt, the full agent response, the Git commit SHA, exact file changes, and timeline** in `docs/logs.txt` as you build.

### Step 3: Build & Ship with Continuous Push
- Author your application code inside `src/`.
- After each prompt, changes are committed with the exact commit SHA recorded in `docs/logs.txt`, and can be pushed directly to your team's GitHub repository (`git push origin main`).
- Document your technical approach in `docs/APPROACH.md`.
- Deploy your application and record live details in `deployment/README.md`.
- Update `metadata/submission.yaml` with your final commit SHA before the **October 6, 2026, 11:00 AM IST** deadline.

---

## 4. Multi-Device Team Collaboration

All 4 team members can work simultaneously across separate laptops:

1. **Clone**: Every teammate clones your team's GitHub repository to their device.
2. **Syncing Progress**:
   - When one teammate finishes a feature or prompt:
     ```bash
     git add src/ docs/
     git commit -m "feat: implement feature description"
     git push origin main
     ```
   - Other teammates pull the latest updates:
     ```bash
     git pull origin main
     ```
3. **Agent Continuity**: When a teammate opens the updated repo on their laptop, their AI assistant automatically reads `docs/APPROACH.md` and recent `docs/logs.txt` entries, immediately picking up where the team left off.

---

*Build freely. Use AI freely. Secure what you build. Document what you claim. Prove what you implemented.*

---

## MediDesk Authentication (Phase 3)

The current app provides patient registration and cookie-based login through the Flask API. See [SECURITY.md](SECURITY.md) for the implemented controls, configuration, and verification limits. Set `NEXT_PUBLIC_API_URL` for the frontend and configure Flask's `SECRET_KEY`, database settings, and `CORS_ALLOWED_ORIGINS`; use HTTPS and a shared limiter backend for production deployments.

## Patient and Doctor Management (Phase 4)

After signing in, patients can edit their own profile and browse active doctors. Doctors can edit permitted contact and professional information. Admins can search and page through patient and doctor accounts, create/update doctor profiles, and deactivate or reactivate accounts. Backend APIs enforce these permissions; frontend route guards are only a navigation aid. See [SECURITY.md](SECURITY.md) for endpoint scope and verification details.

## Appointment Management (Phase 5)

Patients can check a proposed time against an active doctor's schedule, request an appointment, view and filter their own appointments, and cancel an eligible future appointment. Doctors can view only their assigned schedule, confirm pending requests, complete confirmed visits after their end time, cancel eligible future visits, and see the associated patient's name. Admins can search, filter, page, inspect, and apply valid status transitions. Appointment state and ownership are enforced by Flask on every request.

Appointment booking accepts only `doctor_id`, `start_at`, `end_at`, and `reason`; the patient identity and initial `PENDING` status come from the authenticated session and server. A time range must use ISO 8601 with an explicit offset, start in the future, have a positive duration no longer than four hours, and include a reason of at most 500 characters. The API converts the instant to UTC, stores it as a UTC-naive MySQL `DATETIME`, and returns UTC ISO 8601 timestamps ending in `Z`. The browser displays times in its local timezone.

The application rejects overlapping pending, confirmed, and completed appointments for the same doctor (cancelled bookings release their interval). Booking locks the doctor's InnoDB user row, performs a locking/current overlap read, inserts, and commits in one transaction to serialize competing requests on MySQL even when authentication has already opened a repeatable-read snapshot. The check endpoint is advisory; the booking transaction repeats the check. SQLite tests do not exercise MySQL row-lock concurrency, so no cross-database or production race guarantee is claimed. Patients and doctors may cancel a pending or confirmed appointment only before it starts; no additional cancellation cutoff is set. Doctors/admins may confirm only pending appointments before start and complete confirmed appointments only after end.

Key endpoints: `POST /api/appointments`, `GET /api/appointments/my`, `GET /api/appointments/<id>`, `POST /api/appointments/<id>/cancel`, `GET /api/appointments/availability`, `GET /api/doctor/appointments`, doctor `confirm`/`complete`/`cancel` actions under `/api/doctor/appointments/<id>/`, and admin search at `/api/admin/appointments`.

## Secure Medical Records (Phase 6)

Doctors can create a primary medical record only for their own completed appointment. The API derives patient and doctor identities from the appointment, and patients can read only records belonging to their signed-in account. Doctors can list and update records connected to appointments assigned to them; unlinked legacy records are not exposed to doctors. There is no medical-record delete endpoint or admin medical-record endpoint. Patients and doctors have Medical records links in the navigation. See [SECURITY.md](SECURITY.md) for endpoint, audit, migration, and verification details.

## Final security validation

The final local validation is recorded in
[FINAL_SECURITY_REPORT.md](FINAL_SECURITY_REPORT.md) and
[FINAL_SECURITY_TEST_MATRIX.md](FINAL_SECURITY_TEST_MATRIX.md). The backend
suite passed 148 tests, the frontend lint/build passed with documented
warnings, Compose configuration passed, and both Docker images built
successfully. Full runtime, browser, backup/restore, HTTPS ingress, dependency
scanning, SBOM, and image-scanning checks remain deployment-environment tasks;
the project does not claim those results without executing them.
