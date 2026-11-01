"""set orange task default

Revision ID: d73c81b9e4f2
Revises: 0d7e105d0214
Create Date: 2026-11-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d73c81b9e4f2"
down_revision: Union[str, Sequence[str], None] = "0d7e105d0214"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("tasks", "color", server_default="#ff9f43", existing_type=sa.String(length=7))


def downgrade() -> None:
    op.alter_column("tasks", "color", server_default="#46ff96", existing_type=sa.String(length=7))
