import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_Distance

from app.database import get_db
from app.models import WellRecord, IncidentRecord
from app.schemas import DrillPosition, ProactiveAlertResponse, HazardWarning
from app.auth import require_role

logger = logging.getLogger("NWIS.Alerts")

router = APIRouter(prefix="/api/v1/alerts", tags=["Proactive Alert Engine"])


# ─────────────────────────────────────────────────────────────
# POST /api/v1/alerts/proactive — THE GAME-CHANGER
# ─────────────────────────────────────────────────────────────
@router.post("/proactive", response_model=ProactiveAlertResponse)
async def check_proactive_hazards(
    position: DrillPosition,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer"]))
):
    """
    ⚡ PROACTIVE ALERT ENGINE ⚡
    
    This is the single biggest differentiator from Schlumberger/Halliburton.
    
    Instead of REACTING to sensor anomalies after they happen, this endpoint
    PROACTIVELY warns engineers by cross-referencing their current drilling
    position against historical offset well incidents.
    
    It's like Waze warning you about a traffic jam 2 km ahead.
    
    Logic:
    1. Find all offset wells within the specified radius (PostGIS ST_DWithin)
    2. Search for incidents at similar depth (±50m) OR same formation
    3. Rank by severity and distance
    4. Return warnings with mitigation SOPs from historical records
    """
    search_point = WKTElement(f"POINT({position.lon} {position.lat})", srid=4326)
    radius_meters = position.radius_km * 1000
    depth_tolerance = 50.0  # meters

    # ── Step 1: Find nearby offset wells ─────────────────────
    nearby_wells_with_distance = db.query(
        WellRecord,
        func.ST_Distance(
            WellRecord.location,
            func.ST_GeogFromText(f"POINT({position.lon} {position.lat})")
        ).label("distance_m")
    ).filter(
        ST_DWithin(WellRecord.location, search_point, radius_meters)
    ).all()

    if not nearby_wells_with_distance:
        return ProactiveAlertResponse(
            status="SAFE",
            drill_position_depth_m=position.current_depth_m,
            drill_position_formation=position.current_formation,
            scan_radius_km=position.radius_km,
            offset_wells_scanned=0,
            danger_zones_ahead=0,
            alerts=[],
        )

    # Build well_id → (well_name, distance) map
    well_info = {}
    well_ids = []
    for well, distance_m in nearby_wells_with_distance:
        well_info[well.id] = {
            "name": well.well_name,
            "distance_km": round(distance_m / 1000, 2),
        }
        well_ids.append(well.id)

    # ── Step 2: Find hazards at similar depth or same formation ──
    hazards = db.query(IncidentRecord).filter(
        IncidentRecord.well_id.in_(well_ids),
        (
            IncidentRecord.formation_name.ilike(f"%{position.current_formation}%")
        ) | (
            func.abs(IncidentRecord.depth_m - position.current_depth_m) <= depth_tolerance
        )
    ).order_by(
        # Prioritize by severity
        IncidentRecord.severity.desc(),
        IncidentRecord.depth_m
    ).all()

    if not hazards:
        return ProactiveAlertResponse(
            status="SAFE",
            drill_position_depth_m=position.current_depth_m,
            drill_position_formation=position.current_formation,
            scan_radius_km=position.radius_km,
            offset_wells_scanned=len(well_ids),
            danger_zones_ahead=0,
            alerts=[],
        )

    # ── Step 3: Build structured warnings ────────────────────
    warnings = []
    critical_count = 0

    for hazard in hazards:
        info = well_info.get(hazard.well_id, {"name": "Unknown", "distance_km": 0})

        if hazard.severity in ("High", "Critical"):
            critical_count += 1

        warnings.append(HazardWarning(
            source_well=info["name"],
            distance_km=info["distance_km"],
            warning_type=hazard.incident_type,
            historical_depth_m=hazard.depth_m,
            severity=hazard.severity,
            formation=hazard.formation_name or "Unknown",
            mud_weight_sg=hazard.mud_weight_sg,
            npt_hours=hazard.npt_hours or 0,
            mitigation_sop=hazard.mitigation_sop or "No SOP on record. Follow standard procedures.",
        ))

    # Determine overall alert status
    if critical_count >= 2:
        alert_status = "CRITICAL_WARNING"
    elif critical_count >= 1 or len(warnings) >= 3:
        alert_status = "WARNING"
    else:
        alert_status = "WARNING"

    logger.warning(
        f"PROACTIVE ALERT: {len(warnings)} hazard(s) detected for "
        f"depth={position.current_depth_m}m, formation={position.current_formation}. "
        f"Queried by {user['username']}"
    )

    return ProactiveAlertResponse(
        status=alert_status,
        drill_position_depth_m=position.current_depth_m,
        drill_position_formation=position.current_formation,
        scan_radius_km=position.radius_km,
        offset_wells_scanned=len(well_ids),
        danger_zones_ahead=len(warnings),
        alerts=warnings,
    )
