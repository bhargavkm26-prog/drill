import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database import get_db
from app.models import WellRecord, IncidentRecord, FormationRecord
from app.schemas import IncidentCreate, IncidentResponse, CorrelationResult, KnowledgeSearchRequest
from app.auth import require_role
from app.services.rag_service import rag_service

logger = logging.getLogger("NWIS.Incidents")

router = APIRouter(prefix="/api/v1", tags=["Incidents & Knowledge Base"])


# ─────────────────────────────────────────────────────────────
# POST /api/v1/incidents — Log a historical incident
# ─────────────────────────────────────────────────────────────
@router.post("/incidents", status_code=status.HTTP_201_CREATED)
async def log_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer"]))
):
    """Log a historical drilling hazard into the institutional knowledge base."""
    well = db.query(WellRecord).filter(WellRecord.well_name == incident.well_name).first()
    if not well:
        raise HTTPException(
            status_code=404,
            detail=f"Well '{incident.well_name}' not found. Register the well first."
        )

    new_incident = IncidentRecord(
        well_id=well.id,
        depth_m=incident.depth_m,
        formation_name=incident.formation_name,
        incident_type=incident.incident_type,
        severity=incident.severity,
        mud_weight_sg=incident.mud_weight_sg,
        npt_hours=incident.npt_hours,
        mitigation_sop=incident.mitigation_sop,
        event_date=incident.event_date,
    )
    db.add(new_incident)
    db.commit()

    logger.info(
        f"Incident '{incident.incident_type}' logged for well '{incident.well_name}' "
        f"at {incident.depth_m}m by {user['username']}"
    )

    return {
        "message": f"Hazard '{incident.incident_type}' logged for '{incident.well_name}'.",
        "incident_id": new_incident.id,
    }


# ─────────────────────────────────────────────────────────────
# GET /api/v1/incidents — List/filter incidents
# ─────────────────────────────────────────────────────────────
@router.get("/incidents")
async def list_incidents(
    incident_type: Optional[str] = None,
    formation: Optional[str] = None,
    severity: Optional[str] = None,
    depth_min: Optional[float] = None,
    depth_max: Optional[float] = None,
    well_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """List historical incidents with powerful filtering by type, formation, depth range, severity."""
    query = db.query(IncidentRecord)

    if incident_type:
        query = query.filter(IncidentRecord.incident_type.ilike(f"%{incident_type}%"))
    if formation:
        query = query.filter(IncidentRecord.formation_name.ilike(f"%{formation}%"))
    if severity:
        query = query.filter(IncidentRecord.severity == severity)
    if depth_min is not None:
        query = query.filter(IncidentRecord.depth_m >= depth_min)
    if depth_max is not None:
        query = query.filter(IncidentRecord.depth_m <= depth_max)
    if well_name:
        well = db.query(WellRecord).filter(WellRecord.well_name.ilike(f"%{well_name}%")).first()
        if well:
            query = query.filter(IncidentRecord.well_id == well.id)

    total = query.count()
    incidents = query.offset(skip).limit(limit).all()

    results = []
    for inc in incidents:
        well = db.query(WellRecord).filter(WellRecord.id == inc.well_id).first()
        results.append({
            "id": inc.id,
            "well_name": well.well_name if well else "Unknown",
            "well_id": inc.well_id,
            "depth_m": inc.depth_m,
            "formation_name": inc.formation_name,
            "incident_type": inc.incident_type,
            "severity": inc.severity,
            "mud_weight_sg": inc.mud_weight_sg,
            "npt_hours": inc.npt_hours,
            "mitigation_sop": inc.mitigation_sop,
        })

    return {"total": total, "incidents": results}


# ─────────────────────────────────────────────────────────────
# GET /api/v1/knowledge/correlate — Cross-well formation correlation
# ─────────────────────────────────────────────────────────────
@router.get("/knowledge/correlate")
async def correlate_formations(
    formation_name: str,
    depth_min: Optional[float] = None,
    depth_max: Optional[float] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """
    Cross-well formation correlation: finds ALL historical incidents 
    in a specific geological formation across every well in the database.
    
    This answers: "What went wrong in the Barail Formation across all our wells?"
    """
    query = db.query(IncidentRecord).filter(
        IncidentRecord.formation_name.ilike(f"%{formation_name}%")
    )

    if depth_min is not None:
        query = query.filter(IncidentRecord.depth_m >= depth_min)
    if depth_max is not None:
        query = query.filter(IncidentRecord.depth_m <= depth_max)

    incidents = query.all()

    # Get unique wells affected
    affected_well_ids = set(inc.well_id for inc in incidents)
    wells_map = {}
    for wid in affected_well_ids:
        well = db.query(WellRecord).filter(WellRecord.id == wid).first()
        if well:
            wells_map[wid] = well.well_name

    data = []
    for inc in incidents:
        data.append({
            "well_name": wells_map.get(inc.well_id, "Unknown"),
            "incident_type": inc.incident_type,
            "depth_m": inc.depth_m,
            "severity": inc.severity,
            "mud_weight_sg": inc.mud_weight_sg,
            "npt_hours": inc.npt_hours,
            "mitigation_sop": inc.mitigation_sop,
        })

    return CorrelationResult(
        formation_queried=formation_name,
        total_incidents_found=len(incidents),
        wells_affected=len(affected_well_ids),
        data=data,
    )


# ─────────────────────────────────────────────────────────────
# POST /api/v1/knowledge/search — Unified semantic + structured search
# ─────────────────────────────────────────────────────────────
@router.post("/knowledge/search")
async def search_knowledge(
    request: KnowledgeSearchRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """
    Unified search across both structured data (PostGIS incidents)
    and unstructured data (Qdrant vector store of OCR'd reports).
    
    Combines the best of SQL queries and semantic search.
    """
    # 1. Semantic search in Qdrant (unstructured knowledge)
    rag_results = rag_service.search_knowledge(request.query, top_k=request.top_k)

    # 2. Structured search in PostgreSQL (incidents DB)
    structured_query = db.query(IncidentRecord)

    if request.formation_filter:
        structured_query = structured_query.filter(
            IncidentRecord.formation_name.ilike(f"%{request.formation_filter}%")
        )
    if request.incident_type_filter:
        structured_query = structured_query.filter(
            IncidentRecord.incident_type.ilike(f"%{request.incident_type_filter}%")
        )
    if request.depth_min is not None:
        structured_query = structured_query.filter(IncidentRecord.depth_m >= request.depth_min)
    if request.depth_max is not None:
        structured_query = structured_query.filter(IncidentRecord.depth_m <= request.depth_max)

    structured_incidents = structured_query.limit(request.top_k).all()

    structured_results = []
    for inc in structured_incidents:
        well = db.query(WellRecord).filter(WellRecord.id == inc.well_id).first()
        structured_results.append({
            "source": "Incident Database",
            "well_name": well.well_name if well else "Unknown",
            "incident_type": inc.incident_type,
            "depth_m": inc.depth_m,
            "formation": inc.formation_name,
            "severity": inc.severity,
            "mitigation": inc.mitigation_sop,
        })

    return {
        "query": request.query,
        "semantic_results": rag_results,
        "structured_results": structured_results,
        "total_semantic": len(rag_results),
        "total_structured": len(structured_results),
    }
