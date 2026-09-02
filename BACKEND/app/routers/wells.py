import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin
from typing import Optional

from app.database import get_db
from app.models import WellRecord, IncidentRecord, FormationRecord
from app.schemas import (
    WellCreate,
    WellResponse,
    NearbyWellsResponse,
    NearbyWellResult,
    FormationCreate,
    FormationResponse,
)
from app.auth import require_role

logger = logging.getLogger("NWIS.Wells")

router = APIRouter(prefix="/api/v1/wells", tags=["Wells & Geospatial"])


# ─────────────────────────────────────────────────────────────
# POST /api/v1/wells — Register a new well
# ─────────────────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def register_well(
    well: WellCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer"]))
):
    """Register a new well with GPS coordinates into the PostGIS spatial database."""

    existing = db.query(WellRecord).filter(
        WellRecord.well_name == well.well_name
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Well '{well.well_name}' already exists."
        )

    point_wkt = f"POINT({well.longitude} {well.latitude})"

    new_well = WellRecord(
        well_name=well.well_name,
        location=WKTElement(point_wkt, srid=4326),
        target_depth_m=well.target_depth_m,
        basin=well.basin,
        status=well.status,
    )

    db.add(new_well)
    db.commit()
    db.refresh(new_well)

    logger.info(
        f"Well '{well.well_name}' registered by "
        f"{user['username']} at ({well.latitude}, {well.longitude})"
    )

    return {
        "message": f"Well '{well.well_name}' registered successfully.",
        "well_id": new_well.id,
        "coordinates": {
            "latitude": well.latitude,
            "longitude": well.longitude
        }
    }


# ─────────────────────────────────────────────────────────────
# GET /api/v1/wells — List all wells
# ─────────────────────────────────────────────────────────────
@router.get("")
async def list_wells(
    basin: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """List all registered wells with optional filters."""

    query = db.query(WellRecord)

    if basin:
        query = query.filter(
            WellRecord.basin.ilike(f"%{basin}%")
        )

    if status_filter:
        query = query.filter(
            WellRecord.status == status_filter
        )

    total = query.count()
    wells = query.offset(skip).limit(limit).all()

    results = []

    for w in wells:

        location_text = db.execute(
            func.ST_AsText(w.location)
        ).scalar()

        lat, lon = _parse_point_wkt(location_text)

        incident_count = db.query(
            IncidentRecord
        ).filter(
            IncidentRecord.well_id == w.id
        ).count()

        formation_count = db.query(
            FormationRecord
        ).filter(
            FormationRecord.well_id == w.id
        ).count()

        results.append({
            "id": w.id,
            "well_name": w.well_name,
            "latitude": lat,
            "longitude": lon,
            "target_depth_m": w.target_depth_m,
            "basin": w.basin,
            "status": w.status,
            "incident_count": incident_count,
            "formation_count": formation_count,
        })

    return {
        "total": total,
        "wells": results
    }


# ─────────────────────────────────────────────────────────────
# GET /api/v1/wells/geo-risk — GEO RISK SUMMARY
# ─────────────────────────────────────────────────────────────
@router.get("/geo-risk")
async def geo_risk_summary(
    lat: float,
    lon: float,
    radius_km: float = 10.0,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """
    Geo-spatial drilling risk summary.

    Uses the current GPS position to find nearby wells with
    historical drilling incidents and calculates an overall
    spatial risk profile.

    Returns the nearest risky well, historical incidents,
    severity, distance and mitigation recommendations.
    """

    if not -90 <= lat <= 90:
        raise HTTPException(
            status_code=400,
            detail="Latitude must be between -90 and 90."
        )

    if not -180 <= lon <= 180:
        raise HTTPException(
            status_code=400,
            detail="Longitude must be between -180 and 180."
        )

    if radius_km <= 0:
        raise HTTPException(
            status_code=400,
            detail="radius_km must be greater than 0."
        )

    search_point = WKTElement(
        f"POINT({lon} {lat})",
        srid=4326
    )

    radius_meters = radius_km * 1000

    # PostGIS spatial search
    nearby_query = db.query(
        WellRecord,
        func.ST_Distance(
            WellRecord.location,
            func.ST_GeogFromText(
                f"POINT({lon} {lat})"
            )
        ).label("distance_m")
    ).filter(
        ST_DWithin(
            WellRecord.location,
            search_point,
            radius_meters
        )
    ).order_by("distance_m").all()

    severity_weights = {
        "Low": 1,
        "Medium": 2,
        "High": 3,
        "Critical": 4,
    }

    risk_incident_types = {
        "mud loss",
        "stuck pipe",
        "kick",
        "wellbore instability",
        "h2s detection",
    }

    risk_wells = []
    all_risk_scores = []

    nearest_risk_well = None

    for well, distance_m in nearby_query:

        distance_km = round(float(distance_m) / 1000, 2)

        incidents = db.query(
            IncidentRecord
        ).filter(
            IncidentRecord.well_id == well.id
        ).all()

        well_risk_incidents = []

        for inc in incidents:

            incident_type = (
                (inc.incident_type or "")
                .strip()
                .lower()
            )

            if incident_type not in risk_incident_types:
                continue

            severity = inc.severity or "Medium"

            severity_score = severity_weights.get(
                severity,
                2
            )

            all_risk_scores.append(severity_score)

            well_risk_incidents.append({
                "type": inc.incident_type,
                "depth_m": inc.depth_m,
                "formation": inc.formation_name,
                "severity": severity,
                "mitigation": (
                    inc.mitigation_sop[:300]
                    if inc.mitigation_sop
                    else ""
                ),
            })

        # Only include wells that actually have
        # relevant historical drilling risks.
        if not well_risk_incidents:
            continue

        if nearest_risk_well is None:
            nearest_risk_well = {
                "well_name": well.well_name,
                "distance_km": distance_km,
                "target_depth_m": well.target_depth_m or 0,
                "basin": well.basin or "Unknown",
                "status": well.status or "Unknown",
            }

        average_well_score = (
            sum(
                severity_weights.get(
                    incident["severity"],
                    2
                )
                for incident in well_risk_incidents
            )
            / len(well_risk_incidents)
        )

        risk_wells.append({
            "well_name": well.well_name,
            "distance_km": distance_km,
            "target_depth_m": well.target_depth_m or 0,
            "basin": well.basin or "Unknown",
            "status": well.status or "Unknown",
            "risk_score": round(
                min(average_well_score / 4, 1.0),
                4
            ),
            "incidents": well_risk_incidents,
        })

    # ─────────────────────────────────────────────────────────
    # Overall spatial risk
    # ─────────────────────────────────────────────────────────
    if all_risk_scores:

        overall_score = min(
            sum(all_risk_scores)
            / (len(all_risk_scores) * 4),
            1.0
        )

    else:
        overall_score = 0.0

    if overall_score >= 0.75:
        risk_level = "CRITICAL"
    elif overall_score >= 0.50:
        risk_level = "HIGH"
    elif overall_score >= 0.25:
        risk_level = "MEDIUM"
    elif overall_score > 0:
        risk_level = "LOW"
    else:
        risk_level = "NO_HISTORY"

    return {
        "status": "success",

        "search_location": {
            "latitude": lat,
            "longitude": lon,
            "radius_km": radius_km,
        },

        "geo_risk": {
            "risk_score": round(overall_score, 4),
            "risk_percent": round(
                overall_score * 100,
                2
            ),
            "risk_level": risk_level,
        },

        "nearby_wells_found": len(nearby_query),

        "risky_wells_found": len(risk_wells),

        "nearest_risk_well": nearest_risk_well,

        "risk_wells": risk_wells,
    }


# ─────────────────────────────────────────────────────────────
# GET /api/v1/wells/{well_id} — Get well details
# ─────────────────────────────────────────────────────────────
@router.get("/{well_id}")
async def get_well_detail(
    well_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """Get full well details including all formations and incidents."""

    well = db.query(
        WellRecord
    ).filter(
        WellRecord.id == well_id
    ).first()

    if not well:
        raise HTTPException(
            status_code=404,
            detail="Well not found."
        )

    location_text = db.execute(
        func.ST_AsText(well.location)
    ).scalar()

    lat, lon = _parse_point_wkt(location_text)

    formations = [
        {
            "id": f.id,
            "formation_name": f.formation_name,
            "top_depth_m": f.top_depth_m,
            "bottom_depth_m": f.bottom_depth_m,
            "lithology": f.lithology,
        }
        for f in well.formations
    ]

    incidents = [
        {
            "id": i.id,
            "incident_type": i.incident_type,
            "depth_m": i.depth_m,
            "formation_name": i.formation_name,
            "severity": i.severity,
            "mud_weight_sg": i.mud_weight_sg,
            "npt_hours": i.npt_hours,
            "mitigation_sop": i.mitigation_sop,
        }
        for i in well.incidents
    ]

    return {
        "id": well.id,
        "well_name": well.well_name,
        "latitude": lat,
        "longitude": lon,
        "target_depth_m": well.target_depth_m,
        "basin": well.basin,
        "status": well.status,
        "formations": formations,
        "incidents": incidents,
    }


# ─────────────────────────────────────────────────────────────
# GET /api/v1/wells/nearby/search — Nearby Wells
# ─────────────────────────────────────────────────────────────
@router.get("/nearby/search")
async def find_nearby_wells(
    lat: float,
    lon: float,
    radius_km: float = 10.0,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """
    Finds all offset wells within a specified radius using
    PostGIS spatial queries.

    Returns distance, formations, incidents and risk profile.
    """

    search_point = WKTElement(
        f"POINT({lon} {lat})",
        srid=4326
    )

    radius_meters = radius_km * 1000

    nearby_query = db.query(
        WellRecord,
        func.ST_Distance(
            WellRecord.location,
            func.ST_GeogFromText(
                f"POINT({lon} {lat})"
            )
        ).label("distance_m")
    ).filter(
        ST_DWithin(
            WellRecord.location,
            search_point,
            radius_meters
        )
    ).order_by("distance_m").all()

    results = []

    for well, distance_m in nearby_query:

        distance_km = round(
            float(distance_m) / 1000,
            2
        )

        incidents = db.query(
            IncidentRecord
        ).filter(
            IncidentRecord.well_id == well.id
        ).all()

        incidents_summary = [
            {
                "type": inc.incident_type,
                "depth_m": inc.depth_m,
                "formation": inc.formation_name,
                "severity": inc.severity,
                "mitigation": (
                    inc.mitigation_sop[:200]
                    if inc.mitigation_sop
                    else ""
                ),
            }
            for inc in incidents
        ]

        results.append(
            NearbyWellResult(
                well_name=well.well_name,
                distance_km=distance_km,
                target_depth_m=well.target_depth_m or 0,
                basin=well.basin or "Unknown",
                status=well.status or "Unknown",
                incident_count=len(incidents),
                incidents_summary=incidents_summary,
            )
        )

    return NearbyWellsResponse(
        search_latitude=lat,
        search_longitude=lon,
        search_radius_km=radius_km,
        total_found=len(results),
        nearby_wells=results,
    )


# ─────────────────────────────────────────────────────────────
# POST /api/v1/wells/{well_id}/formations — Add formation tops
# ─────────────────────────────────────────────────────────────
@router.post(
    "/{well_id}/formations",
    status_code=status.HTTP_201_CREATED
)
async def add_formation(
    well_id: str,
    formation: FormationCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer"]))
):
    """Add a stratigraphic formation top to a well's geological profile."""

    well = db.query(
        WellRecord
    ).filter(
        WellRecord.id == well_id
    ).first()

    if not well:
        raise HTTPException(
            status_code=404,
            detail="Well not found."
        )

    new_formation = FormationRecord(
        well_id=well_id,
        formation_name=formation.formation_name,
        top_depth_m=formation.top_depth_m,
        bottom_depth_m=formation.bottom_depth_m,
        lithology=formation.lithology,
    )

    db.add(new_formation)
    db.commit()

    return {
        "message": (
            f"Formation '{formation.formation_name}' "
            f"added to well '{well.well_name}'."
        ),
        "formation_id": new_formation.id,
    }


# ─────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────
def _parse_point_wkt(wkt_text: str) -> tuple:
    """Parse 'POINT(lon lat)' WKT string into (lat, lon) tuple."""

    if not wkt_text:
        return (0.0, 0.0)

    try:
        coords = (
            wkt_text
            .replace("POINT(", "")
            .replace(")", "")
            .strip()
        )

        lon, lat = coords.split()

        return (
            float(lat),
            float(lon)
        )

    except Exception:
        return (0.0, 0.0)