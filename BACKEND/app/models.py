import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, JSON, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from app.database import Base


# ═══════════════════════════════════════════════════════════════
# 1. USER MANAGEMENT (B2B Authentication)
# ═══════════════════════════════════════════════════════════════
class UserRecord(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), default="")
    role = Column(String(20), default="Viewer")  # Admin | Engineer | Viewer
    created_at = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════
# 2. WELL REGISTRY (PostGIS Spatial)
# ═══════════════════════════════════════════════════════════════
class WellRecord(Base):
    __tablename__ = "wells"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    well_name = Column(String(150), unique=True, nullable=False, index=True)
    location = Column(Geography(geometry_type="POINT", srid=4326))
    target_depth_m = Column(Float)
    basin = Column(String(100), default="Upper Assam")
    status = Column(String(30), default="ACTIVE")  # ACTIVE | COMPLETED | ABANDONED
    spud_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    incidents = relationship("IncidentRecord", back_populates="well", cascade="all, delete-orphan")
    formations = relationship("FormationRecord", back_populates="well", cascade="all, delete-orphan")


# ═══════════════════════════════════════════════════════════════
# 3. FORMATION TOPS (Stratigraphic Layers)
# ═══════════════════════════════════════════════════════════════
class FormationRecord(Base):
    __tablename__ = "formation_tops"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    formation_name = Column(String(150), nullable=False, index=True)
    top_depth_m = Column(Float, nullable=False)
    bottom_depth_m = Column(Float)
    lithology = Column(String(100), default="")  # Sandstone, Siltstone, Shale, etc.

    well = relationship("WellRecord", back_populates="formations")


# ═══════════════════════════════════════════════════════════════
# 4. HISTORICAL INCIDENTS (Knowledge Base)
# ═══════════════════════════════════════════════════════════════
class IncidentRecord(Base):
    __tablename__ = "historical_incidents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    depth_m = Column(Float, nullable=False)
    formation_name = Column(String(150), index=True)
    incident_type = Column(String(80), nullable=False, index=True)  # Stuck Pipe, Mud Loss, Kick, etc.
    severity = Column(String(20), default="Medium")  # Low | Medium | High | Critical
    mud_weight_sg = Column(Float, nullable=True)
    npt_hours = Column(Float, default=0.0)  # Non-Productive Time in hours
    mitigation_sop = Column(Text, default="")
    event_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    well = relationship("WellRecord", back_populates="incidents")


# ═══════════════════════════════════════════════════════════════
# 5. DOCUMENT RECORDS (OCR-processed files)
# ═══════════════════════════════════════════════════════════════
class DocumentRecord(Base):
    __tablename__ = "document_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    original_file_name = Column(String(300), index=True)
    raw_extracted_text = Column(Text)
    ai_metadata = Column(JSON)
    last_updated_by = Column(String(100), default="System OCR")
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)