"""restore orange Orbit palette

Revision ID: e84f0a7c9d31
Revises: c52d6f9a1b38
Create Date: 2026-11-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e84f0a7c9d31"
down_revision: Union[str, Sequence[str], None] = "c52d6f9a1b38"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("tasks", "color", server_default="#ff8a2a", existing_type=sa.String(length=7))
    op.execute("UPDATE tasks SET color = '#ff8a2a' WHERE color = '#a855f7'")


def downgrade() -> None:
    op.alter_column("tasks", "color", server_default="#a855f7", existing_type=sa.String(length=7))
