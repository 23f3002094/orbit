"""recolor legacy green tasks

Revision ID: b28fa371c604
Revises: d73c81b9e4f2
Create Date: 2026-11-02
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b28fa371c604"
down_revision: Union[str, Sequence[str], None] = "d73c81b9e4f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert Orbit's former default green, preserving all other task colours."""
    op.execute("UPDATE tasks SET color = '#ff9f43' WHERE color = '#46ff96'")


def downgrade() -> None:
    # This data change is intentionally not reversed: orange tasks may have been
    # created after the migration and cannot be distinguished from converted ones.
    pass
