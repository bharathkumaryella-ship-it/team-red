"""Add encrypted consultation weight to medical records."""

import sqlalchemy as sa
from alembic import op

revision = "c49d8321f60a"
down_revision = "b12e6f0a93cd"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("medical_records", sa.Column("weight_kg", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("medical_records", "weight_kg")
