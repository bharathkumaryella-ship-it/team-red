"""Populate sample Hyderabad clinic addresses for demo doctors."""

import sqlalchemy as sa
from alembic import op

revision = "b12e6f0a93cd"
down_revision = "8a3c1d7e4f20"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    locations = {
        "doctor1@demo.local": "MediDesk Central Clinic, Lake View Road, Hyderabad",
        "doctor2@demo.local": "MediDesk North Clinic, Jubilee Hills, Hyderabad",
        "doctor3@demo.local": "MediDesk Children's Clinic, Banjara Hills, Hyderabad",
        "doctor4@demo.local": "MediDesk Neuro Care, Somajiguda, Hyderabad",
        "doctor5@demo.local": "MediDesk Skin Clinic, Madhapur, Hyderabad",
        "doctor6@demo.local": "MediDesk Orthopedic Center, Gachibowli, Hyderabad",
        "doctor7@demo.local": "MediDesk Wellness Clinic, Kondapur, Hyderabad",
        "doctor8@demo.local": "MediDesk Cancer Care Center, Hitech City, Hyderabad",
    }
    update_location = sa.text(
        "UPDATE doctor_profiles SET clinic_location = :location "
        "WHERE user_id = (SELECT id FROM users WHERE email = :email)"
    )
    for email, location in locations.items():
        connection.execute(update_location, {"email": email, "location": location})


def downgrade():
    # Keep clinic locations when rolling back unrelated migration changes.
    pass
