"""Add two detailed synthetic records to the existing demo patient."""

from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

from app.security.phi_encryption import encrypt_text

revision = "8a3c1d7e4f20"
down_revision = "71d82c5a0b46"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    patient_id = connection.execute(
        sa.text("SELECT id FROM users WHERE email = :email"),
        {"email": "patient1@demo.local"},
    ).scalar_one_or_none()
    cardiologist_id = connection.execute(
        sa.text("SELECT id FROM users WHERE email = :email"),
        {"email": "doctor1@demo.local"},
    ).scalar_one_or_none()
    primary_care_id = connection.execute(
        sa.text("SELECT id FROM users WHERE email = :email"),
        {"email": "doctor2@demo.local"},
    ).scalar_one_or_none()

    # Fresh installations have no demo users during migrations; the regular
    # development seeder adds these same records after creating demo accounts.
    if not patient_id or not cardiologist_id or not primary_care_id:
        return

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    records = (
        (
            cardiologist_id,
            "Seasonal allergic rhinitis",
            "Reports three weeks of sneezing, nasal congestion, and itchy eyes, worse outdoors. No fever, wheezing, or shortness of breath. Examination showed pale nasal mucosa; lungs clear. Discussed pollen avoidance, saline rinses, and follow-up if symptoms persist or worsen.",
            "Cetirizine 10 mg by mouth once daily as needed. Use saline nasal rinse once daily. Seek urgent care for breathing difficulty.",
        ),
        (
            primary_care_id,
            "Vitamin D insufficiency",
            "Routine follow-up reviewed a low 25-hydroxy vitamin D result of 18 ng/mL. Patient denies bone pain or muscle weakness. Discussed dietary sources, safe sunlight exposure, and repeat laboratory testing in 12 weeks.",
            "Cholecalciferol 1,000 IU by mouth daily with food for 12 weeks; repeat vitamin D level at follow-up.",
        ),
    )
    insert = sa.text(
        "INSERT INTO medical_records "
        "(patient_id, doctor_id, appointment_id, diagnosis, notes, prescription, created_at, updated_at) "
        "VALUES (:patient_id, :doctor_id, NULL, :diagnosis, :notes, :prescription, :created_at, :updated_at)"
    )
    for doctor_id, diagnosis, notes, prescription in records:
        connection.execute(
            insert,
            {
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "diagnosis": encrypt_text(diagnosis),
                "notes": encrypt_text(notes),
                "prescription": encrypt_text(prescription),
                "created_at": now,
                "updated_at": now,
            },
        )


def downgrade():
    # Clinical history is not automatically deleted when a migration is rolled back.
    pass
