"""Add public clinic location to doctor profiles."""

import sqlalchemy as sa
from alembic import op

revision = "71d82c5a0b46"
down_revision = "f5a7c1e92b40"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("doctor_profiles", sa.Column("clinic_location", sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column("doctor_profiles", "clinic_location")
