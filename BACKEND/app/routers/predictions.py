import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas import RigTelemetry, PredictionResponse, ShapExplanation
from app.auth import require_role
from app.database import get_db
from app.services.ml_service import ml_service
from app.services.rag_service import rag_service
from app.services.geo_service import get_geo_context


logger = logging.getLogger("NWIS.Predictions")

router = APIRouter(
    prefix="/api/v1",
    tags=["ML Predictions & Explainable AI"]
)


# ─────────────────────────────────────────────────────────────
# POST /api/v1/predict — Full ML prediction with SHAP
# ─────────────────────────────────────────────────────────────
@router.post("/predict", response_model=PredictionResponse)
async def predict_drilling_risk(
    telemetry: RigTelemetry,
    user: dict = Depends(require_role(["Admin", "Engineer"])),
    db: Session = Depends(get_db),
):
    """
    Enterprise drilling risk prediction engine.

    Combines:
    - LightGBM ML model probabilities (stuck pipe + mud loss)
    - Physics-based constraint checks (torque, ECD, ROP, flow rate)
    - SHAP explainability (why the AI flagged this reading)
    - PostGIS geo/historical risk context
    - RAG-powered mitigation SOP retrieval (when critical)

    This is the core B2B intelligence endpoint.
    """

    if not ml_service.is_ready:
        ml_service.load_models()

    if not ml_service.is_ready:
        return PredictionResponse(
            status="error",
            severity="UNKNOWN",
            stuck_pipe_risk_percent=0,
            mud_loss_risk_percent=0,
            active_warnings=["ML Models not loaded"],
            physics_warnings=[],
            shap_explanations=[],
            mitigation_strategy="ML models unavailable. Follow manual SOP.",
            source_document="N/A",
            metrics=telemetry.dict(),
            alert=False,
        )

    # ─────────────────────────────────────────────────────────
    # Enrich telemetry with PostGIS geo/historical context
    # ─────────────────────────────────────────────────────────
    if (
        telemetry.Latitude is not None
        and telemetry.Longitude is not None
    ):
        geo_context = get_geo_context(
            db,
            telemetry.Latitude,
            telemetry.Longitude,
        )

        telemetry.HistoricalLossCount = (
            geo_context["HistoricalLossCount"]
        )

        telemetry.HistoricalStuckPipeCount = (
            geo_context["HistoricalStuckPipeCount"]
        )

        telemetry.FormationRiskScore = (
            geo_context["FormationRiskScore"]
        )

        telemetry.DistanceToNearestRiskWell = (
            geo_context["DistanceToNearestRiskWell"]
        )

    # ─────────────────────────────────────────────────────────
    # Run ML + physics + SHAP pipeline
    # ─────────────────────────────────────────────────────────
    prediction = ml_service.predict(telemetry.dict())

    # ─────────────────────────────────────────────────────────
    # Handle ML service validation errors
    # ─────────────────────────────────────────────────────────
    if "error" in prediction:
        raise HTTPException(
            status_code=400,
            detail=prediction
        )

    # If critical: retrieve mitigation SOP from RAG knowledge base
    mitigation_strategy = (
        "Continue standard operational parameters."
    )
    source_document = "N/A"

    if (
        prediction["severity"] in ["WARNING", "CRITICAL"]
        and prediction["active_warnings"]
        and prediction["active_warnings"][0] != "None"
    ):
        primary_warning = prediction["active_warnings"][0]

        mitigation_strategy, source_document = (
            rag_service.get_mitigation_for_warning(
                primary_warning
            )
        )

    # Build typed SHAP explanations
    shap_explanations = [
        ShapExplanation(**exp)
        for exp in prediction["shap_explanations"]
    ]

    # Build metrics snapshot
    metrics = {
        "depth_m": round(telemetry.Depth, 2),
        "stuck_pipe_risk_percent": (
            prediction["stuck_pipe_risk_percent"]
        ),
        "mud_loss_risk_percent": (
            prediction["mud_loss_risk_percent"]
        ),
        "torque_kNm": round(
            telemetry.Torque_mean_5min,
            2
        ),
        "rop_m_hr": round(
            telemetry.ROP_mean_5min,
            2
        ),
        "wob_klbs": round(
            telemetry.WOB_mean,
            2
        ),
        "rpm": round(
            telemetry.RPM_mean,
            2
        ),
        "spp_psi": round(
            telemetry.SPP_mean,
            2
        ),
        "ecd_sg": round(
            telemetry.ECD,
            2
        ),
        "mud_weight_sg": round(
            telemetry.MudWeight,
            2
        ),
        "flow_rate_gpm": round(
            telemetry.FlowRate,
            2
        ),
    }

    logger.info(
        f"Prediction by {user['username']}: "
        f"Depth={telemetry.Depth}m "
        f"Stuck={prediction['stuck_pipe_risk_percent']}% "
        f"Loss={prediction['mud_loss_risk_percent']}% "
        f"Severity={prediction['severity']}"
    )

    return PredictionResponse(
        status="success",
        severity=prediction["severity"],
        stuck_pipe_risk_percent=(
            prediction["stuck_pipe_risk_percent"]
        ),
        mud_loss_risk_percent=(
            prediction["mud_loss_risk_percent"]
        ),
        active_warnings=(
            prediction["active_warnings"]
        ),
        physics_warnings=(
            prediction["physics_warnings"]
        ),
        shap_explanations=shap_explanations,
        mitigation_strategy=mitigation_strategy,
        source_document=source_document,
        metrics=metrics,
        alert=prediction["alert"],
    )