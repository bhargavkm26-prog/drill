from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin

from app.models import WellRecord, IncidentRecord


DEFAULT_DISTANCE_M = 1500.0
SEARCH_RADIUS_KM = 10.0


def get_geo_context(
    db: Session,
    latitude: float,
    longitude: float,
):
    """
    Calculate geo/historical context for ML prediction.

    Uses existing PostGIS well locations and historical incidents.
    """

    search_point = WKTElement(
        f"POINT({longitude} {latitude})",
        srid=4326,
    )

    radius_meters = SEARCH_RADIUS_KM * 1000

    # Find nearby wells and calculate actual distance.
    nearby_wells = db.query(
        WellRecord,
        func.ST_Distance(
            WellRecord.location,
            func.ST_GeogFromText(
                f"POINT({longitude} {latitude})"
            ),
        ).label("distance_m"),
    ).filter(
        ST_DWithin(
            WellRecord.location,
            search_point,
            radius_meters,
        )
    ).order_by(
        "distance_m"
    ).all()

    # No nearby wells → preserve safe defaults.
    if not nearby_wells:
        return {
            "HistoricalLossCount": 0,
            "HistoricalStuckPipeCount": 0,
            "FormationRiskScore": 0.5,
            "DistanceToNearestRiskWell": DEFAULT_DISTANCE_M,
        }

    # Nearest well that has a relevant drilling-risk incident.
    nearest_risk_distance = None

    historical_loss_count = 0
    historical_stuck_pipe_count = 0

    severity_weights = {
        "Low": 1.0,
        "Medium": 2.0,
        "High": 3.0,
        "Critical": 4.0,
    }

    risk_scores = []

    for well, distance_m in nearby_wells:

        incidents = db.query(IncidentRecord).filter(
            IncidentRecord.well_id == well.id
        ).all()

        for incident in incidents:

            incident_type = (
                incident.incident_type or ""
            ).strip().lower()

            if incident_type == "mud loss":
                historical_loss_count += 1

            elif incident_type == "stuck pipe":
                historical_stuck_pipe_count += 1

            # Any historical drilling hazard makes this
            # a risk well.
            if incident_type in {
                "mud loss",
                "stuck pipe",
                "kick",
                "wellbore instability",
            }:
                if (
                    nearest_risk_distance is None
                    or distance_m < nearest_risk_distance
                ):
                    nearest_risk_distance = distance_m

                risk_scores.append(
                    severity_weights.get(
                        incident.severity,
                        2.0,
                    )
                )

    # Normalize severity score to approximately 0–1.
    if risk_scores:
        formation_risk_score = min(
            sum(risk_scores) / len(risk_scores) / 4.0,
            1.0,
        )
    else:
        formation_risk_score = 0.5

    if nearest_risk_distance is None:
        nearest_risk_distance = DEFAULT_DISTANCE_M

    return {
        "HistoricalLossCount": historical_loss_count,
        "HistoricalStuckPipeCount": historical_stuck_pipe_count,
        "FormationRiskScore": round(
            formation_risk_score,
            4,
        ),
        "DistanceToNearestRiskWell": round(
            nearest_risk_distance,
            2,
        ),
    }