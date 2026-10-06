# MediDesk — Jury Presentation

**Suggested length:** 8–10 minutes, including a 3-minute live demo  
**Project:** Secure clinic and appointment management  
**Audience:** Hackathon jury

Use each slide's **On the slide** section for the deck and its **Speaker notes** as the spoken explanation. The notes are written in first person so a team member can present them directly. Replace the team-member placeholders on slide 1 before presenting.

---

## Slide 1 — MediDesk: A Safer Path from Booking to Follow-up

### On the slide

- Secure clinic and appointment management
- One workflow for patients, doctors, and administrators
- Team: **[add team name and member names]**

### Speaker notes

“Good morning. We are presenting MediDesk, a clinic-management platform that connects patient appointment booking with doctor workflows and medical-record follow-up. We focused on two things together: making routine clinic tasks easier to complete and keeping authorization and sensitive data controls in the backend.”

**Transition:** “First, here is the problem we set out to solve.”

---

## Slide 2 — The Problem

### On the slide

- Booking, schedule management, and clinical notes can be disconnected
- Patients need clear appointment details and follow-up information
- Doctors need access to the patients and records assigned to them
- A convenient interface must not make sensitive records broadly accessible

### Speaker notes

“A clinic visit is a small journey: finding a suitable doctor, choosing a time, attending the visit, and reviewing what happened afterward. When each step is handled in a separate or manual process, patients can lose track of appointments and doctors can spend extra time locating the right information. In a healthcare application, convenience alone is not enough. A patient should see their own records, and a doctor should see only the records connected to their care.”

---

## Slide 3 — Our Solution and Users

### On the slide

| Patient | Doctor | Administrator |
|---|---|---|
| Find doctors and clinics | Manage assigned schedule | Manage clinic accounts |
| Request and track visits | Confirm and complete visits | Review appointment operations |
| See personal medical records | Author records for completed visits | Search and manage patients/doctors |

### Speaker notes

“MediDesk has three role-based experiences. Patients discover doctors, request appointments, track upcoming visits, and view their own records. Doctors manage their assigned appointments and write a record after a completed consultation. Administrators handle clinic account and appointment-management tasks. The browser hides links that do not belong to a role, but the API independently checks every protected operation.”

---

## Slide 4 — Patient Journey

### On the slide

1. Search the doctor directory
2. Choose **Book Visit** on a doctor
3. Pick a date and a 30-minute slot
4. Check availability and submit the request
5. Track the appointment and receive an in-app reminder

**Appointment details include:** doctor, clinic location, time, status, and doctor phone in the appointments view.

### Speaker notes

“The patient begins in Find Doctors. Choosing Book Visit carries that doctor into the booking form, so the patient does not have to select the doctor a second time. They choose a date and a half-hour start slot; the application calculates the end time. The availability check is helpful feedback, while the booking API checks availability again when it creates the appointment. Patients can later see the clinic address and call the doctor from the appointment details. When an appointment is within an hour, a bell notification and an in-app toast show the doctor, time, and clinic location.”

**Accuracy note:** The reminder is an in-app notification while the patient is signed in. It is not SMS, email, or an operating-system push notification.

---

## Slide 5 — Doctor Journey and Medical Records

### On the slide

- Review assigned appointments
- Confirm, complete, or cancel according to appointment state
- Select a patient with an eligible completed visit
- Record patient name, age, weight, diagnosis, notes, and treatment
- Patient can review their own saved record

### Speaker notes

“The doctor sees appointments assigned to their account. Appointment status changes follow a state machine, so actions such as completing a visit are only available in valid states. When creating a medical record, the doctor enters or selects a patient who has an eligible completed visit. The patient identity and appointment link are still verified by the API. Age can be filled from the profile and saved as an age-at-consultation snapshot; weight is stored with the record. Patients can view their own records, including those saved measurements.”

---

## Slide 6 — How the System Fits Together

### On the slide

```text
Patient / Doctor / Admin browser
              │ HTTPS in deployment; credentialed API requests
              ▼
       Next.js + TypeScript
       UI, role-aware navigation
              │ centralized API client
              ▼
         Flask API
 Auth • role checks • validation • ownership rules
       │             │              │
       ▼             ▼              ▼
 SQLAlchemy DB    Redis limits    ClamAV upload scan
 MySQL target     shared limiter  attachment workflow
```

- The browser never connects directly to the database
- Flask is the authorization and business-rule boundary

### Speaker notes

“The frontend is built with Next.js and TypeScript. It calls a Flask API through a centralized client. The API owns identity checks, role checks, input validation, appointment rules, and record ownership. SQLAlchemy accesses the database; MySQL is the deployment target and SQLite is used for local development and tests. Redis provides shared rate-limit storage in production. The optional attachment workflow scans uploads with ClamAV. In a production deployment, TLS terminates at the configured ingress or reverse proxy.”

---

## Slide 7 — Security by Design

### On the slide

- Argon2id password hashing
- HttpOnly, SameSite session cookies; Secure cookies in production
- Backend role checks and owner-scoped queries
- Allowlisted fields, bounded inputs, and appointment-state validation
- Encrypted storage for selected clinical/profile fields and attachment content
- Trusted-origin checks, CORS allowlist, security headers, and rate limiting

### Speaker notes

“Security is implemented across multiple layers. Passwords are hashed with Argon2id. Session cookies are HttpOnly and SameSite, with Secure enabled in production. The Flask API derives patient identity from the signed-in session rather than trusting a patient ID from the browser. Patient record queries are owner-scoped, and doctors can create records only for their own completed appointments. Requests are validated against field allowlists and bounded values. Selected health information is encrypted at the application layer, and upload content is scanned before storage. CORS, mutation-origin checks, security headers, and rate limits add further defenses.”

---

## Slide 8 — What We Verified and What We Do Not Claim

### On the slide

- Security report records **148 backend tests passed** on its reviewed snapshot
- Prior frontend lint/build and Compose checks were recorded as passing
- Recent booking, notification, patient-age, and clinic-profile changes were not re-tested
- Security review recorded 5 high frontend dependency audit findings still requiring remediation
- No live deployment URL or production TLS / backup-restore validation is claimed

### Speaker notes

“We want to distinguish verified evidence from assumptions. The security report records 148 passing backend tests and prior frontend lint/build and Compose checks. Those results apply to the snapshot that was reviewed; the latest user-requested UI and medical-record changes have not been re-tested yet. The dependency review also reported five high findings in the frontend dependency tree, so we do not claim a clean dependency audit. Finally, production TLS, backup restoration, and a live hosted deployment have not been validated here. We would address these before handling real patient information.”

**Do not claim:** production-ready healthcare compliance, a live deployment, or zero vulnerabilities.

---

## Slide 9 — Live Demo Plan

### On the slide

1. Sign in as a patient
2. Find a doctor and open Book Visit
3. Choose a date and half-hour slot; check availability
4. Show appointment location, doctor phone, and notification bell
5. Sign in as a doctor and open Medical Records
6. Select a patient, enter age/weight and clinical details
7. Show the saved record in the patient view

### Speaker notes and demo cues

**Patient view:** “I’m signed in as a patient. I’ll find a doctor, and Book Visit carries that choice into scheduling. The form asks for a date and a 30-minute slot. The appointment screen shows where to go.”

**Appointments and reminder:** “The appointments page shows the doctor and their phone number. For an appointment in the next hour, the bell displays the doctor, appointment time, and clinic location.” If no demo appointment is within one hour, say the bell lists reminders only inside that window; do not imply one exists when it does not.

**Doctor view:** “Now I’m signed in as the assigned doctor. I can select a patient with an eligible completed appointment, enter age and weight, and save the clinical record. The API binds that record to the authorized appointment.”

**Patient record view:** “The patient can open their own saved record. Another patient cannot retrieve it by changing a record ID because the API checks ownership.”

**Fallback:** If the live environment is unavailable, use the presentation screenshots or explain the flow from the UI. Do not display real secrets, encryption keys, or real patient data.

---

## Slide 10 — Limitations and Next Steps

### On the slide

- Re-run tests/build after the latest feature changes
- Remediate remaining frontend dependency findings
- Validate TLS ingress, secret/key custody, and encrypted backups
- Complete a backup-and-restore drill
- Add true push/email delivery only if the deployment requirements support it

### Speaker notes

“Our next steps are practical. First, we would re-run the backend and frontend checks on the final commit. Then we would remediate and verify the remaining dependency findings. Before production use, we would validate TLS, protect the encryption key outside the repository, configure storage and backup encryption, and test restoration. If patients need reminders when they are not signed in, we would add a real delivery channel such as email or push notifications with consent, delivery tracking, and retry handling. The current bell is intentionally an in-app reminder.”

---

## Slide 11 — Closing

### On the slide

**MediDesk connects appointment booking, clinic operations, and patient follow-up—with access rules enforced by the API.**

### Speaker notes

“MediDesk brings the patient, doctor, and administrative workflows into one application. The key engineering decision is that access to appointments and clinical records is enforced in Flask, not trusted to the interface. We have a functional foundation, a clear security boundary, and a concrete list of work required before production. Thank you—we’re happy to take your questions.”

---

## Likely Jury Questions

### How do you prevent a patient from viewing another patient's record?

The API takes the patient identity from the authenticated session and filters medical-record queries by that patient ID. It does not trust a patient ID supplied by the browser. Record detail requests also check ownership.

### Can a doctor create a record for any patient?

No. The create endpoint checks that the appointment belongs to the signed-in doctor, is completed, and does not already have a primary record. The API derives the patient from that appointment.

### How are passwords and health information protected?

Passwords use Argon2id hashing. Selected clinical and profile fields use application-level encryption backed by configured Fernet keys. The key must be kept outside source control and protected operationally. Database, disk, and backup encryption remain deployment responsibilities.

### Are appointment notifications sent when the patient is offline?

No. Current reminders are in-app and are checked while the patient is signed in. Email or push delivery is a future extension.

### Is the project deployed and ready for real patient data?

We do not claim that. This build has local and container deployment configuration, but no verified live deployment URL. TLS, production key custody, encrypted backups, restore testing, and the remaining dependency findings must be addressed. The demo data is synthetic.

### What did your security testing show?

The final security report records 148 backend tests passing and prior frontend lint/build and Compose checks. The latest feature changes have not been re-tested, and the report records five high frontend dependency findings that still need remediation.

### What is technically interesting about the booking flow?

The availability check is advisory; the create endpoint repeats the overlap check in its transaction. For MySQL/InnoDB, booking locks the doctor row to serialize competing requests. SQLite tests do not prove this MySQL concurrency behavior, so it still needs production-engine validation.

---

## 30-Second Project Pitch

“MediDesk is a secure clinic-management application for patients, doctors, and administrators. Patients find doctors, book 30-minute visits, track clinic details, and receive in-app reminders. Doctors manage assigned appointments and create encrypted records for completed visits. Flask enforces access and ownership rules at the API boundary, while Next.js provides the role-specific experience. We have built and documented a security-focused foundation, and we are transparent about the dependency and deployment checks still required before production.”
