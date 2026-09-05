from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ═══════════════════════════════════════════════════════════════
# AUTH SCHEMAS
# ═══════════════════════════════════════════════════════════════
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str = ""
    role: str = "Viewer"  # Admin | Engineer | Viewer


class UserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


# ═══════════════════════════════════════════════════════════════
# WELL SCHEMAS
# ═══════════════════════════════════════════════════════════════
class WellCreate(BaseModel):
    well_name: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    target_depth_m: float = Field(..., gt=0)
    basin: str = "Upper Assam"
    status: str = "ACTIVE"


class WellResponse(BaseModel):
    id: str
    well_name: str
    latitude: float
    longitude: float
    target_depth_m: float
    basin: str
    status: str
    incident_count: int = 0
    formation_count: int = 0


class NearbyWellResult(BaseModel):
    well_name: str
    latitude: float
    longitude: float
    distance_km: float
    target_depth_m: float
    basin: str
    status: str
    incident_count: int
    incidents_summary: List[dict] = []


class NearbyWellsResponse(BaseModel):
    search_latitude: float
    search_longitude: float
    search_radius_km: float
    total_found: int
    nearby_wells: List[NearbyWellResult]


# ═══════════════════════════════════════════════════════════════
# FORMATION SCHEMAS
# ═══════════════════════════════════════════════════════════════
class FormationCreate(BaseModel):
    formation_name: str
    top_depth_m: float
    bottom_depth_m: Optional[float] = None
    lithology: str = ""


class FormationResponse(BaseModel):
    id: str
    well_id: str
    formation_name: str
    top_depth_m: float
    bottom_depth_m: Optional[float]
    lithology: str

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
# INCIDENT SCHEMAS
# ═══════════════════════════════════════════════════════════════
class IncidentCreate(BaseModel):
    well_name: str
    depth_m: float
    formation_name: str
    incident_type: str  # Stuck Pipe, Mud Loss, Kick, Wellbore Instability
    severity: str = "Medium"  # Low | Medium | High | Critical
    mud_weight_sg: Optional[float] = None
    npt_hours: float = 0.0
    mitigation_sop: str = ""
    event_date: Optional[datetime] = None


class IncidentResponse(BaseModel):
    id: str
    well_id: str
    well_name: str = ""
    depth_m: float
    formation_name: str
    incident_type: str
    severity: str
    mud_weight_sg: Optional[float]
    npt_hours: float
    mitigation_sop: str

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
# TELEMETRY & PREDICTION SCHEMAS
# ═══════════════════════════════════════════════════════════════
class RigTelemetry(BaseModel):
    Depth: float
    ROP_mean_5min: float
    WOB_mean: float
    RPM_mean: float
    Torque_mean_5min: float
    SPP_mean: float
    MudWeight: float
    ECD: float
    HistoricalLossCount: int = 0
    HistoricalStuckPipeCount: int = 0
    FormationRiskScore: float = 0.5
    FlowRate: float
    Inclination: float = 0.0
    Azimuth: float = 0.0
    DistanceToNearestRiskWell: float = 1500.0
    Torque_trend: float = 0.0
    SPP_trend: float = 0.0
    ROP_trend: float = 0.0

    # Geo context
    Latitude: Optional[float] = None
    Longitude: Optional[float] = None


class ShapExplanation(BaseModel):
    feature: str
    value: float
    shap_value: float
    impact: str  # "Increases Risk" | "Decreases Risk"
    contribution_percent: float


class PredictionResponse(BaseModel):
    status: str
    severity: str  # NORMAL | WARNING | CRITICAL
    stuck_pipe_risk_percent: float
    mud_loss_risk_percent: float
    active_warnings: List[str]
    physics_warnings: List[str]
    shap_explanations: List[ShapExplanation]
    mitigation_strategy: str
    source_document: str
    metrics: dict
    alert: bool


# ═══════════════════════════════════════════════════════════════
# PROACTIVE ALERT SCHEMAS
# ═══════════════════════════════════════════════════════════════
class DrillPosition(BaseModel):
    lat: float
    lon: float
    current_depth_m: float
    current_formation: str
    radius_km: float = 5.0


class HazardWarning(BaseModel):
    source_well: str
    distance_km: float
    warning_type: str
    historical_depth_m: float
    severity: str
    formation: str
    mud_weight_sg: Optional[float]
    npt_hours: float
    mitigation_sop: str


class ProactiveAlertResponse(BaseModel):
    status: str  # SAFE | WARNING | CRITICAL_WARNING
    drill_position_depth_m: float
    drill_position_formation: str
    scan_radius_km: float
    offset_wells_scanned: int
    danger_zones_ahead: int
    alerts: List[HazardWarning]


# ═══════════════════════════════════════════════════════════════
# DOCUMENT SCHEMAS
# ═══════════════════════════════════════════════════════════════
class DocumentUpdate(BaseModel):
    new_raw_text: str
    updated_by: str = "Engineer"


class DocumentResponse(BaseModel):
    id: str
    filename: str
    raw_text: str
    ai_metadata: dict
    last_updated_by: str
    last_updated_at: Optional[datetime]


# ═══════════════════════════════════════════════════════════════
# KNOWLEDGE SEARCH SCHEMAS
# ═══════════════════════════════════════════════════════════════
class KnowledgeSearchRequest(BaseModel):
    query: str
    formation_filter: Optional[str] = None
    incident_type_filter: Optional[str] = None
    depth_min: Optional[float] = None
    depth_max: Optional[float] = None
    top_k: int = 5


class CorrelationResult(BaseModel):
    formation_queried: str
    total_incidents_found: int
    wells_affected: int
    data: List[dict]