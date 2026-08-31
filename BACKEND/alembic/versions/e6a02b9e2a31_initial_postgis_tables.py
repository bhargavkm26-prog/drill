"""Initial PostGIS tables

Revision ID: e6a02b9e2a31
Revises: 
Create Date: 2026-08-31
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2

# revision identifiers, used by Alembic.
revision: str = 'e6a02b9e2a31'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create document_records table
    op.create_table('document_records',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('original_file_name', sa.String(), nullable=True),
        sa.Column('raw_extracted_text', sa.Text(), nullable=True),
        sa.Column('ai_metadata', sa.JSON(), nullable=True),
        sa.Column('last_updated_by', sa.String(), nullable=True),
        sa.Column('last_updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_records_original_file_name'), 'document_records', ['original_file_name'], unique=False)

    # 2. Create wells table with PostGIS Geography
    op.create_table('wells',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('well_name', sa.String(), nullable=True),
        sa.Column('location', geoalchemy2.types.Geography(geometry_type='POINT', srid=4326, from_text='ST_GeogFromText', name='geography'), nullable=True),
        sa.Column('target_depth_m', sa.Float(), nullable=True),
        sa.Column('basin', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wells_well_name'), 'wells', ['well_name'], unique=True)

    # 3. Create formation_tops table
    op.create_table('formation_tops',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('well_id', sa.String(), nullable=True),
        sa.Column('formation_name', sa.String(), nullable=True),
        sa.Column('top_depth_m', sa.Float(), nullable=True),
        sa.Column('bottom_depth_m', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['well_id'], ['wells.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_formation_tops_formation_name'), 'formation_tops', ['formation_name'], unique=False)

    # 4. Create historical_incidents table
    op.create_table('historical_incidents',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('well_id', sa.String(), nullable=True),
        sa.Column('depth_m', sa.Float(), nullable=True),
        sa.Column('formation_name', sa.String(), nullable=True),
        sa.Column('incident_type', sa.String(), nullable=True),
        sa.Column('severity', sa.String(), nullable=True),
        sa.Column('mitigation_sop', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['well_id'], ['wells.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_historical_incidents_formation_name'), 'historical_incidents', ['formation_name'], unique=False)
    op.create_index(op.f('ix_historical_incidents_incident_type'), 'historical_incidents', ['incident_type'], unique=False)


def downgrade() -> None:
    op.drop_table('historical_incidents')
    op.drop_table('formation_tops')
    op.drop_table('wells')
    op.drop_table('document_records')