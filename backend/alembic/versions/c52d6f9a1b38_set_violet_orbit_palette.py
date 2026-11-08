"""set violet Orbit palette

Revision ID: c52d6f9a1b38
Revises: b28fa371c604
Create Date: 2026-11-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c52d6f9a1b38"
down_revision: Union[str, Sequence[str], None] = "b28fa371c604"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("tasks", "color", server_default="#a855f7", existing_type=sa.String(length=7))
    op.execute("UPDATE tasks SET color = '#a855f7' WHERE color = '#ff9f43'")


def downgrade() -> None:
    op.alter_column("tasks", "color", server_default="#ff9f43", existing_type=sa.String(length=7))
