"""Enforce one primary medical record per appointment."""

from alembic import op

revision = "9c27f4d8a611"
down_revision = "0d187483051c"
branch_labels = None
depends_on = None


def upgrade():
    # Fails safely if an existing database already contains duplicate links;
    # no clinical rows are deleted or rewritten by this migration.
    op.create_index("uq_medical_records_appointment_id", "medical_records", ["appointment_id"], unique=True)


def downgrade():
    op.drop_index("uq_medical_records_appointment_id", table_name="medical_records")
