"""Add encrypted age-at-consultation snapshot to medical records."""

import sqlalchemy as sa
from alembic import op

revision = "d5809a6c1f32"
down_revision = "c49d8321f60a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("medical_records", sa.Column("patient_age", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("medical_records", "patient_age")
